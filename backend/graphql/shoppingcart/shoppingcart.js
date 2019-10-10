require('dotenv').config();

const {transformShoppingCart} = require('../enchancer');

const good_schemas = require('../good/models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;

const category_schemas = require('../category/models/generalCategory');
const GeneralCategory = category_schemas.GeneralCategory;

const cart_schemas = require('./models/shoppingcart');
const ForexRate = cart_schemas.ForexRate;

const axios = require('axios');

const shoppingCartService = require('./services/shoppingCartService.jsx');


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
    const oldestAcceptableUpdateTime = new Date(Date.now() - 1000 * 60 * 1.8);//1.8 minutes
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
    return Math.floor(Math.round(100 * (currentRate.rate * price))) / 100;
}


module.exports = {
    addToCart: async ({cart_identifier, good_id, quantity}) => {
        const good = await Good.findById(good_id);
        if (!good) {
            return new Error('We do not have a good with id:' + good_id);
        }
        const shoppingcart = await shoppingCartService.addToCart(cart_identifier, good, quantity);
        if (quantity > 0){
            console.log("Good # " + good._id + "was added to shoppingcart #" + shoppingcart._id);
        }
        else if (quantity < 0){
            console.log("Good # " + good._id + "was removed from the shoppingcart #" + shoppingcart._id);
        }
        return transformShoppingCart(shoppingcart);
    },
    individualCart: async ({jwt_token}) => {
        const shoppingcart = await shoppingCartService.findExistingShoppingCartByJWTorCreateNew(jwt_token);
        return transformShoppingCart(shoppingcart);
    },
    numberOfGoodsInCartAndSubtotalAndTax: async ({jwt_token}) => {
        const shoppingcart = await shoppingCartService.findExistingShoppingCartByJWT(jwt_token);
        let nr = 0.0;
        let sum = 0.0;
        let tax = 0.0;

        if (shoppingcart !== null) {
            for (let i = 0; i < shoppingcart.goods.length; i++) {
                const cartgood = await CartGood.findById(shoppingcart.goods[i]);
                const good = await Good.findById(cartgood.good);
                const category = await GeneralCategory.findById(good.general_category);
                nr += cartgood.quantity;
                const currentSum = await convertToEUR(good.currency, cartgood.price_per_one_item * (1 + category.tax)) * cartgood.quantity;
                const currentSumWithOutTax = Math.round(100 * (currentSum / (1 + category.tax))) / 100;
                sum += currentSumWithOutTax;
                tax += currentSum - currentSumWithOutTax;
            }
            sum = (Math.round(sum * 100) / 100);
            tax = (Math.round(tax * 100) / 100);
        }
        return [nr, sum, tax];
    }
};