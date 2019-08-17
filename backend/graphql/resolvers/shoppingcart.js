require('dotenv').config();

const {transformShoppingCart} = require('./merge');

const good_schemas = require('../../models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;

const category_schemas = require('../../models/category');
const GeneralCategory = category_schemas.GeneralCategory;

const cart_schemas = require('../../models/shoppingcart');
const ShoppingCart = cart_schemas.ShoppingCart;
const ForexRate = cart_schemas.ForexRate;


const user_schemas = require('../../models/user');
const RegularUser = user_schemas.RegularUser;


const jwt = require('jsonwebtoken');
const axios = require('axios');


async function getForexData(sourceCurrency) {
    const KEY = sourceCurrency + "_EUR";
    const URL = "https://free.currconv.com/api/v7/convert?q=" + KEY + "&compact=ultra&apiKey=" + process.env.FREE_FOREX_API_KEY;
    return await axios.get(URL).then(response => {
            console.log("Forex rate for " + sourceCurrency + "/EUR was updated ");
            return response.data[KEY];
        }
    ).catch(error => {
        return Error("Error accessing Forex data " + error)
    });
}

async function convertToEUR(currency, price) {
    if (currency === "EUR") return price;
    /*
    Forex rates are provided by FreeForexApi. In an hour we can make 100 requests. Currently we support EUR,USD,RUB and GBP. Forex rates are updated at maximum every 1.8 minutes ( 60/ (100/3))
     */
    const currentRate = await ForexRate.findOne({source: currency, target: "EUR"});
    if (!currentRate) {
        const newForex = new ForexRate({
            source: currency,
            rate: Number(await getForexData(currency))
        });
        const result = await newForex.save();
        return Math.round(100 * (result.rate * price));
    }
    const oldestAcceptableUpdateTime = new Date( Date.now() - 1000 * 60*1.8 );//1.8 minutes
    if (parseInt(currentRate.lastUpdateTime_UTC) < oldestAcceptableUpdateTime) {
        await ForexRate.update(
            {_id: currentRate._id},
            {
                $set: {
                    "rate": await getForexData(currency),
                    "lastUpdateTime_UTC": new Date().getTime()
                }
            }
        );
    }
    return Math.floor(Math.round(100 * (currentRate.rate * price)))/100;
}

//Helper functions
async function findOrCreateShoppingcart(cart_identifier) {
    //1. Find the cart idThe cart identifier can be either jwt or a String with a length of 256
    let cart_id;
    if (cart_identifier.length === 256) {
        cart_id = cart_identifier;
    } else {
        const KEY = process.env.PERSONAL_JWT_KEY;
        let decoded = jwt.decode(cart_identifier, KEY);
        //Check if the user_id is valid
        const user = await RegularUser.findById(decoded.userId);
        if (!user) throw new Error('JWT was not decoded properly');
        cart_id = decoded.userId;
    }
    let shoppingcart = await ShoppingCart.findOne({cart_identifier: cart_id});
    //2. If shopping cart does not excist a new one will be created
    if (!shoppingcart) {
        const new_shoppingcart = new ShoppingCart({
            cart_identifier: cart_id,
            goods: [],
            success_id: Math.random().toString(36).substr(2, 9)
        });
        return await new_shoppingcart.save();
    }
    return shoppingcart;
}

async function addNewCartGoodToShoppingCart(cartgood, good, quantity, shoppingcart) {
    //1. Has the new cartgood already been saved?
    if (!cartgood) {
        const new_shoppingCartGood = new CartGood({
            price_per_one_item: good.current_price,
            quantity: quantity,
            good: good,
            shoppingcart: shoppingcart
        });
        cartgood = await new_shoppingCartGood.save();
    }
    //Push the cartgood into the array
    shoppingcart.goods.push(cartgood);
    return await shoppingcart.save();
}


module.exports = {
    addToCart: async ({cart_identifier, good_id, quantity}) => {
        /*
        Quantity can be both positive or negative. If it's positive the good will be added to the cart, if it's negative goods will be removed from the cart
         */
        const good = await Good.findById(good_id);
        if (!good) throw new Error('We do not have a good with id:' + good_id);

        let shoppingcart = await findOrCreateShoppingcart(cart_identifier);
        //  console.log("add to cart shoppingcart" + shoppingcart);
        //2. Is this shoppingcart empty?
        if (shoppingcart.goods.length === 0) {
            const new_shoppingCartGood = new CartGood({
                price_per_one_item: good.current_price,
                quantity: quantity,
                good: good,
                shoppingcart: shoppingcart
            });
            const new_saved_cartgood = await new_shoppingCartGood.save();
            await addNewCartGoodToShoppingCart(new_saved_cartgood, good, quantity, shoppingcart);
        } else {
            const cartgood = await CartGood.findOne({
                shoppingcart: shoppingcart,
                good: good
            });
            if (cartgood) {
                const new_quantity = Math.min(cartgood.quantity + quantity, good.quantity - good.booked);
                if (new_quantity === 0) {
                    await ShoppingCart.update(
                        {_id: shoppingcart._id},
                        {$pull: {goods: cartgood._id}}
                    );
                    await CartGood.remove(
                        {_id: cartgood._id}
                    );
                } else {
                    await CartGood.update(
                        {_id: cartgood._id},
                        {$set: {"quantity": new_quantity}}
                    )
                }
            } else {
                await addNewCartGoodToShoppingCart(cartgood, good, quantity, shoppingcart);
            }
        }
        console.log("Good # " + good._id + "was added to shoppingcart #" + shoppingcart._id);

        //Final step: return the shoppingcart
        return transformShoppingCart(shoppingcart);
    },
    individualCart: async ({jwt_token}) => {
        const shoppingcart = await findOrCreateShoppingcart(jwt_token);
        return transformShoppingCart(shoppingcart);
    },
    numberOfGoodsInCartAndSubtotalAndTax: async ({jwt_token}) => {
        //1. Find the shoppingcart
        const shoppingcart = await findOrCreateShoppingcart(jwt_token);
        let nr = 0.0;
        let sum = 0.0;
        let tax = 0.0;

        for (let i = 0; i < shoppingcart.goods.length; i++) {
            const cartgood = await CartGood.findById(shoppingcart.goods[i]);
            const good = await Good.findById(cartgood.good);
            const category = await GeneralCategory.findById(good.general_category);
            nr += cartgood.quantity;
            const currentSum = await convertToEUR(good.currency, cartgood.price_per_one_item*(1+category.tax)) * cartgood.quantity;
            const currentSumWithOutTax = Math.round(100 * (currentSum/(1+category.tax))) / 100;
            sum += currentSumWithOutTax;
            tax += currentSum - currentSumWithOutTax;
        }
        sum = (Math.round(sum * 100) / 100);
        tax = (Math.round(tax * 100) / 100);
        return [nr, sum, tax];
    }
};