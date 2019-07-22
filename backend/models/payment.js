const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StripePaymentSchema = new Schema({
    date: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    order:
        {
            type: Schema.Types.ObjectId,
            ref: 'Order'
        },
});

module.exports = mongoose.model('StripePayment', StripePaymentSchema);
