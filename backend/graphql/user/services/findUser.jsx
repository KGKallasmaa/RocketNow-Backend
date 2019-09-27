require('dotenv').config();

const jwt = require('jsonwebtoken');

const user_schemas = require('../models/user');
const BusinessUser = user_schemas.BusinessUser;
const RegularUser = user_schemas.RegularUser;

const findRegularUserByJWT = async function findRegularUserByJWT(jwt_token) {
    const decoded = jwt.decode(jwt_token, process.env.PERSONAL_JWT_KEY);
    if (!decoded) {
        return Error('JWT was not decoded properly');
    }
    return RegularUser.findById(decoded.userId);
};
const findBusinessUserByJWT = async function findBusinessUserByJWT(jwt_token) {
    const decoded = jwt.decode(jwt_token, process.env.BUSINESS_JWT_KEY);
    if (!decoded) {
        return Error('JWT was not decoded properly');
    }
    return BusinessUser.findById(decoded.userId);
};

const findRegularUserByEmail = async function findRegularUserByJWT(email) {
    return RegularUser.findOne({email: email});
};

const findBusinessUserByNrAndDisplayName = async function findBusinessUserByNrAndBusinessName(nr,displayname) {
    return BusinessUser.findOne({nr: nr, displayname: displayname});
};


module.exports = {
    'findRegularUserByJWT': findRegularUserByJWT,
    'findBusinessUserByJWT': findBusinessUserByJWT,
    'findBusinessUserByNrAndDisplayName':findBusinessUserByNrAndDisplayName,
    'findRegularUserByEmail':findRegularUserByEmail
};
