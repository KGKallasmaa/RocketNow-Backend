const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const generalCategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    tax: {
        type: Number,
        required: true,
    }
});


module.exports = {
    'GeneralCategory': mongoose.model('GeneralCategory', generalCategorySchema),
};
