const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const cartSchema = new Schema({
    cart_identifier: {
        type: String,
        unique: true,
        required: true
    },
    goods: [{
        type: Schema.Types.ObjectId,
        ref: 'CartGood'
    }],
    success_id: {
        type: String,
        required: false
    },
    stripe_charged_total: {
        type: Number,
        required: false
    },
    shipping_cost: {
        type: Number,
        required: false
    },
    tax_cost: {
        type: Number,
        required: false
    },
    shippingAddress: [{
        type: Schema.Types.ObjectId,
        ref: 'OrderAddress'
    }],
    deliveryEstimate_UTC: {
        type: String,
        required: false
    }
});
const forexSchema = new Schema({
    source: {
        type: String,
        required: true
    },
    target: {
        type: String,
        required: true,
        default:"EUR"
    },
    lastUpdateTime_UTC: {
        type: String,
        required: true,
        default: new Date().getTime()
    },
    rate: {
        type: Number,
        required: true
    }
});

module.exports = {
    'ShoppingCart': mongoose.model('ShoppingCart', cartSchema),
    'ForexRate': mongoose.model('ForexRate', forexSchema),
};