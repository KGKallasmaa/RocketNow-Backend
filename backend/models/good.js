const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const goodSchema = new Schema({
    nr: {
        type: Number,
        unique:true,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    booked: {
        type:Number,
        required:true
    },
    current_price: {
        type: Number,
        required: true
    },
    listing_price: {
        type: Number,
        required: true
    },
    listing_timestamp: {
        type: Number,
        required: true
    },
    general_category: {
        type: Schema.Types.ObjectId,
        ref: 'GeneralCategory'
    },
    main_image_cloudinary_secure_url:{
        type: String,
        required: true
    },
    other_images_cloudinary_secure_url: [{
        type: String,
        required: false
    }],
    currency: {
        type: String,
        required: true
    },
    seller: {
        type: Schema.Types.ObjectId,
        ref: 'BusinessUser'
    },
    height_in: {
        type: Number,
        required: true
    },
    length_in: {
        type: Number,
        required: true
    },
    width_in: {
        type: Number,
        required: true
    },
    weight_oz: {
        type: Number,
        required: true
    },
    custom_attribute_names: [{
        type: String,
        required: false
    }],
    custom_attribute_values: [{
        type: String,
        required: false
    }],
});
const cartgoodSchema = new Schema({
    price_per_one_item: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    good: {
        type: Schema.Types.ObjectId,
        ref: 'Good'
    },
    shoppingcart: {
        type: Schema.Types.ObjectId,
        ref: 'ShoppingCart'
    }
});
const ordergoodSchema = new Schema({
    title: {
        type: String,
        required: true
    },
    price_per_one_item: {
        type: Number,
        required: true
    },
    main_image_cloudinary_secure_url: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
});


module.exports = {
    'Good': mongoose.model('Good', goodSchema),
    'CartGood': mongoose.model('CartGood', cartgoodSchema),
    'OrderGood': mongoose.model('OrderGood', ordergoodSchema)
};

