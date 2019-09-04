const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const SearchIndexSchema = new Schema({
    term: {
        type: String,
        required: true,
        unique: true
    },
    pages: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Good'
        }
    ]
});


module.exports = {
    'Index': mongoose.model('Index', SearchIndexSchema),
};