const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const deliveryTimeEstimate = new Schema({
    deliveryTime: {
        type: Date,
        required: true
    },
    issueDate: {
        type: Date,
        required: true,
        default: new Date()
    },
});

const shippingCostEstimate = new Schema({
    shippingCost: {
        type: Number,
        min: 0,
        required: true
    },
    issueDate: {
        type: Date,
        required: true,
        default: new Date()
    },
});


module.exports = {
    'DeliveryEstimate': mongoose.model('DeliveryEstimate', deliveryTimeEstimate),
    'ShippingCostEstimate': mongoose.model('ShippingCostEstimate', shippingCostEstimate),
};

