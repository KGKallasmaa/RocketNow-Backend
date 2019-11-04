const singeProductDeliveryEstimateService = require('../services/singleProductDeliveryEstimate.jsx');
const crg = require('country-reverse-geocoding').country_reverse_geocoding();


module.exports = {
    singleProductDeliveryEstimate: async args => {
        let country = "Estonia";
        const new_country = crg.get_country(args.deliveryEstimate.lat, args.deliveryEstimate.long);
        if (new_country !== null) {
            country = new_country;
        }
        return await singeProductDeliveryEstimateService.singleProductDeliveryEstimate(args.deliveryEstimate.good_id, args.deliveryEstimate.quantity, args.deliveryEstimate.TimezoneOffset_M, country);
    }
};