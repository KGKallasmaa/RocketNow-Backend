const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const imageSchema = new Schema({
    image: {
        data: Buffer,
        contentType: String
    },
});

module.exports = {
    'Image': mongoose.model('Image', imageSchema),
};
