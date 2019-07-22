require('dotenv').config();

const {transformShoppingCart} = require('./merge');

const good_schemas = require('../../models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;

const cart_schemas = require('../../models/shoppingcart');
const ShoppingCart = cart_schemas.ShoppingCart;


const user_schemas = require('../../models/user');
const RegularUser = user_schemas.RegularUser;


const jwt = require('jsonwebtoken');

async function convertToEUR(currency, price) {
    const usd_eur = 0.9; //TODO: make it dynamic. CHeck out https://fixer.io/product
    const gbp_eur = 1.13; //TODO: make it dynamic. CHeck out https://fixer.io/product
    const rub_eur = 0.014; //TODO: make it dynamic. CHeck out https://fixer.io/product
    switch (currency) {
        case "EUR":
            return price;
        case "USD":
            return price * usd_eur;
        case "GBP":
            return price * gbp_eur;
        case "RUB":
            return price * rub_eur;
        default:
            throw new Error("We're unable to convert currency %s", (currency))
    }
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
        }
        else {
            const cartgood = await CartGood.findOne({
                shoppingcart: shoppingcart,
                good: good
            });
            if (cartgood) {
                const new_quantity = Math.min(cartgood.quantity + quantity, good.quantity-good.booked);
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
        //Final step: return the shoppingcart
        return transformShoppingCart(shoppingcart);
    },
    individualCart: async ({jwt_token}) => {
        const shoppingcart = await findOrCreateShoppingcart(jwt_token);
        return transformShoppingCart(shoppingcart);
    },
    numberOfGoodsInCartAndSubtotal: async ({jwt_token}) => {
        //1. Find the shoppingcart
        const shoppingcart = await findOrCreateShoppingcart(jwt_token);
        //2. Initialising variables
        let nr = 0.0;
        let sum = 0.0;

        if (shoppingcart.goods.length > 0) {
            for (let i = 0; i < shoppingcart.goods.length; i++) {
                const cartgood = await CartGood.findById(shoppingcart.goods[i]);
                const good = await Good.findById(cartgood.good);
                nr += cartgood.quantity;
                sum += await convertToEUR(good.currency, cartgood.price_per_one_item) * cartgood.quantity;
            }
        }
        //3. Rounding the sum
        sum = (Math.round(sum * 100) / 100);
        //Returning the variables
        return [nr,sum];
    }
};