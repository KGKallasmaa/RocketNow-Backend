const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const business_userSchema = new Schema({
    businessname: {
        type:String,
        required:true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

const regular_userSchema = new Schema({
    fullname:{
      type:String,
      required:true
    },
    email: {
      type: String,
      unique:true,
      required: true
    },
    password: {
      type: String,
      required: true
    }
  });


module.exports = {
    'RegularUser': mongoose.model('RegularUser', regular_userSchema),
    'BusinessUser': mongoose.model('BusinessUser', business_userSchema),
};