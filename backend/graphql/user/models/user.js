const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const business_userSchema = new Schema({
    nr: {
        type: Number,
        unique: true,
        required: true
    },
    legalname: {
        type: String,
        required: true,
        unique: true
    },
    displayname: {
        type: String,
        required: true,
        unique:true
    },
    logoURL: {
        type: String,
        required: true,
        default: "https://res.cloudinary.com/dl7zea2jd/image/upload/v1564247915/defaultPictures/logoNoBackGround_y5tfnq.png"
    },
    description: {
        type: String,
        required: true
    },
    IBAN: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const regular_userSchema = new Schema({
    fullname: {
        type: String,
        required: true
    },
    image_URL: {
        type: String,
        required: true,
        default: "https://res.cloudinary.com/dl7zea2jd/image/upload/v1564235106/defaultPictures/astronaut_aexv9c.png"
    },
    email: {
        type: String,
        unique: true,
        required: true
    },
    isVerified: {
        type: Boolean,
        required: true,
        default: false
    },
    verificationCode: {
        type: String,
        required: false,
    },
    isResettingPassword: {
        type: Boolean,
        required: false,
        default: false
    },
    passwordResetCode: {
        type: String,
        required: false,
    },
    isActive: {
        type: Boolean,
        required: true,
        default: false
    },
    isCustomer: {
        type: Boolean,
        required: true,
        default: false
    },
    password: {
        type: String,
        required: false
    },
    signupTimestamp_UNIX: {
        type: String,
        required: true,
        default: new Date().getTime()
    },
    lastLoginTimestamp_UNIX: {
        type: String,
        required: false,
    },
    signupMethod: {
        type: String,
        required: true,
        default: "Regular"
    },
    balance_EUR: {
        type: Number,
        required: true,
        default: 0
    }
});


module.exports = {
    'RegularUser': mongoose.model('RegularUser', regular_userSchema),
    'BusinessUser': mongoose.model('BusinessUser', business_userSchema),
};