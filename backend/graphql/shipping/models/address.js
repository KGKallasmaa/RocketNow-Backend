const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OrderAddressSchema = new Schema({
    shippingName: {
        type: String,
        required: true
    },
    dateAdded_UTC: {
        type: String,
        required:true,
        default:new Date().getTime().toString()
    },
    isActive:{
        type:Boolean,
        required:true,
        default: true
    },
    addressOne: {
        type: String,
        required: false
    },
    addressTwo: {
        type: String,
        required: false
    },
    city: {
        type: String,
        required: false
    },
    region: {
        type: String,
        required: false
    },
    zip: {
        type: String,
        required: false
    },
    country: {
        type: String,
        required: false
    },
    shippingMethod: {
        type: String,
        required: true
    },
    parcelDeliveryLocation: {
        type: Schema.Types.ObjectId,
        ref: 'ParcelDeliveryLocation',
        required: false
    },
});

module.exports = {
    'OrderAddress': mongoose.model('OrderAddress', OrderAddressSchema),
};
