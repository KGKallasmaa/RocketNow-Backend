const mongoose = require('mongoose');

const Schema = mongoose.Schema;


const ratingSchema = new Schema({
    value: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    rater: {
        type: Schema.Types.ObjectId,
        ref: 'RegularUser'
    },
    comment: {
        type: String
    },
    good: {
        type: Schema.Types.ObjectId,
        ref: 'Good',
    },
});


module.exports = {
    'Rating': mongoose.model('Rating', ratingSchema),
};
