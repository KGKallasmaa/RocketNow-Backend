const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const OrderAddressSchema = new Schema({
    shipping_name: {
        type: String,
        required: true
    },
    street_address: {
        type: String,
        required: true
    },
    town: {
        type: String,
        required: true
    },
    postal_code: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('OrderAddress', OrderAddressSchema);
