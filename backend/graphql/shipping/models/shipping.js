const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const parcelDeliveryLocationSchema = new Schema({
    provider: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    },
    x_coordinate: {
        type: Number,
        required: true
    },
    y_coordinate: {
        type: Number,
        required: true
    }
});

const StripeShippingSchema = new Schema({
    good:
        {
            type: Schema.Types.ObjectId,
            ref: 'Good'
        },

    StripeParentCode: {
        type: String,
        required: true
    },
    StripeSKUCode: {
        type: String,
        required: true
    },

});


module.exports = {
    'ParcelDeliveryLocation': mongoose.model('ParcelDeliveryLocation', parcelDeliveryLocationSchema),
    'StripeShipping': mongoose.model('StripeShipping',  StripeShippingSchema)
};