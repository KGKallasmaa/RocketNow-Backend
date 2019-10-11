const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const orderSchema = new Schema({
    received_timestamp_UTC: {
        type: Date,
        required: true
    },
    processing_start_timestamp_UTC: {
        type: Date,
        required: false
    },
    processing_end_timestamp_UTC: {
        type: Date,
        required: false
    },
    shipping_end_timestamp_UTC: {
        type: Date,
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
        type: Date,
        required: false
    },
    shippingAddress: {
        type: Schema.Types.ObjectId,
        ref: 'OrderAddress',
        required: false
    }
});

const enhancedPartialOrder = new Schema({
    partialOrder: [{
        type: Schema.Types.ObjectId,
        ref: 'PartialOrder'
    }],
    shippingAddress: [{
        type: Schema.Types.ObjectId,
        ref: 'OrderAddress'
    }],
});


const partialorderSchema = new Schema({
    received_timestamp_UTC: {
        type: Date,
        required: true
    },
    processing_start_timestamp_UTC: {
        type: Date,
        required: false
    },
    processing_end_timestamp_UTC: {
        type: Date,
        required: false
    },
    shipped_timestamp_UTC: {
        type: Date,
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
    'PartialOrder': mongoose.model('PartialOrder', partialorderSchema),
    'EnhancedPartialOrder': mongoose.model('EnhancedPartialOrder', enhancedPartialOrder)
};