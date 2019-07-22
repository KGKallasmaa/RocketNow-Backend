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
    }
});


module.exports = {
    'ShoppingCart': mongoose.model('ShoppingCart', cartSchema),
};

