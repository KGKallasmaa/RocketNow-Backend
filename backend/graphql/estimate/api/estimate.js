const singelProductDeliveryEstimateService = require('../services/singleProductDeliveryEstimate.jsx');
const orderDeliveryEstimateService = require('../services/orderDeliveryEstimate.jsx');
const crg = require('country-reverse-geocoding').country_reverse_geocoding();


module.exports = {
    singleProductDeliveryEstimate: async args => {
        let country = "Estonia";
        //TODO: fix new country
        const new_country = crg.get_country(args.deliveryEstimate.lat, args.deliveryEstimate.long);
        if (new_country !== null) {
            country = new_country;
        }
        return await singelProductDeliveryEstimateService.singleProductDeliveryEstimate(
            args.deliveryEstimate.good_id,
            args.deliveryEstimate.quantity,
            args.deliveryEstimate.timezoneOffset_M,
            country);
    },
    orderDeliveryEstimate: async args => {
        return await orderDeliveryEstimateService.orderDeliveryEstimate(
            args.deliveryEstimate.jwt_token,
            args.deliveryEstimate.timezoneOffset_M,
            args.deliveryEstimate.shippingCountry,
            args.deliveryEstimate.shippingMethod)
    },
};