require('dotenv').config();


const estimate_schema = require('../models/estimate');


const good_schema = require('../../good/models/good');

const shoppingCartService = require('../../shoppingcart/services/shoppingCartService.jsx');
const singleProductDeliveryEstimateService = require('../services/singleProductDeliveryEstimate.jsx');


const orderDeliveryEstimate = async function orderDeliveryEstimate(jwt_token, timezoneOffset_M, shippingCountry, shippingMethod) {
    const shoppingcart = await shoppingCartService.findExistingShoppingCartByJWTorCreateNew(jwt_token);
    let currentDate = new Date();
    currentDate.setMinutes(currentDate.getMinutes() - 1);

    //Fake estimates
    if (shoppingcart._id === null) {
        return new estimate_schema.DeliveryEstimate({
            deliveryTime: singleProductDeliveryEstimateService.convertUTCDateToLocalDate(currentDate, timezoneOffset_M)
        });
    } else if (shoppingcart.goods.length === 0) {
        return new estimate_schema.DeliveryEstimate({
            deliveryTime: singleProductDeliveryEstimateService.convertUTCDateToLocalDate(currentDate, timezoneOffset_M)
        });
    }

    let currentEstimate = new Date();
    currentEstimate.setMinutes(currentEstimate.getMinutes() - 1);

    for (let i = 0; i < shoppingcart.goods.length; i++) {
        const cartgood = await good_schema.CartGood.findById(shoppingcart.goods[i]);
        const estimates = await singleProductDeliveryEstimateService.singleProductDeliveryEstimate(cartgood.good, cartgood.quantity, timezoneOffset_M, shippingCountry);

        let proposedEstimate = undefined;

        if (shippingMethod === "ParcelDelivery") {
            proposedEstimate = estimates[0]
        } else if (shippingMethod === "AddressDelivery") {
            proposedEstimate = estimates[1]
        } else {
            return new Error("Shipping " + shippingMethod + " is not yet supported.");
        }

        if (proposedEstimate.deliveryTime.getTime() > currentEstimate.getTime()) {
            currentEstimate.setTime(proposedEstimate.deliveryTime.getTime());
        }
    }
    return new estimate_schema.DeliveryEstimate({
        deliveryTime: currentEstimate
    });

};

module.exports = {
    'orderDeliveryEstimate': orderDeliveryEstimate,
};
