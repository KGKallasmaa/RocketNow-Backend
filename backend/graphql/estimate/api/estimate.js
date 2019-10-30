

const findGoodService = require('../../good/services/findGood');
const delayService = require('../services/delays');

module.exports = {
    singelProductDelieryEstimate: async args => {
        const good = findGoodService.findGoodById(args.deliveryEstimate.good_id);
        if (!good){
            return new Error("Good with id "+args.deliveryEstimate.good_id+" was not found");
        }

        let deliveryEstimate_UTC = new Date(); // TODO: make it into user local time
        deliveryEstimate_UTC = new Date(delayService.workDayDelay(deliveryEstimate_UTC).getTime());
    },
    orderDeliveryEstimate: async args => {

    },
    singelProductShippingEstimate: async args => {

    },
    orderShippingCost: async args => {

    },
};