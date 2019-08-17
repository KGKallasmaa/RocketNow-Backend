const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const orderSchema = new Schema({
    received_timestamp_UTC: {
        type: String,
        required: true
    },
    processing_start_timestamp_UTC: {
        type: String,
        required: false
    },
    processing_end_timestamp_UTC: {
        type: String,
        required: false
    },
    shipping_start_timestamp_UTC: {
        type: String,
        required: false
    },
    shipping_end_timestamp_UTC: {
        type: String,
        required: false
    },
    delivered_timestamp_UTC: {
        type: String,
        required: false
    },
    status: {
        type: String,
        required: true
    },
    customer: {
        type: Schema.Types.ObjectId,
        ref: 'RegularUser'
    },
    fulfillers: [{
        type: Schema.Types.ObjectId,
        ref: 'BusinessUser'
    }],
    partial_orders: [{
        type: Schema.Types.ObjectId,
        ref: 'PartialOrder'
    }],
    subtotal: {
        type: Number,
        required: true
    },
    shipping_cost: {
        type: Number,
        required: true
    },
    tax_cost: {
        type: Number,
        required: true
    },
    order_items: [{
        type: Schema.Types.ObjectId,
        ref: 'OrderGood'
    }],
    deliveryEstimate_UTC: {
        type: String,
        required: false
    },
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'OrderAddress',
        required: false
    }
});


const partialorderSchema = new Schema({
    new_timestamp_UTC: {
        type: String,
        required: true
    },
    received_timestamp_UTC: {
        type: String,
        required: false
    },
    processing_start_timestamp_UTC: {
        type: String,
        required: false
    },
    processing_end_timestamp_UTC: {
        type: String,
        required: false
    },
    shipping_start_timestamp_UTC: {
        type: String,
        required: false
    },
    shipping_end_timestamp_UTC: {
        type: String,
        required: false
    },
    partial_subtotal: {
        type: Number,
        required: true
    },
    partial_shipping_cost: {
        type: Number,
        required: true
    },
    partial_tax_cost: {
        type: Number,
        required: true
    },
    partial_order_status: {
        type: String,
        required: true
    },
    fulfiller: {
        type: Schema.Types.ObjectId,
        ref: 'BusinessUser'
    },
    order_items: [{
        type: Schema.Types.ObjectId,
        ref: 'OrderGood'
    }]
});


module.exports = {
    'Order': mongoose.model('Order', orderSchema),
    'PartialOrder': mongoose.model('PartialOrder', partialorderSchema)
};