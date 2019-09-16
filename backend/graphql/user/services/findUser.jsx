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
    return await RegularUser.findById(decoded.userId);
};
const findRegularUserByEmail = async function findRegularUserByJWT(email) {
    return await RegularUser.findOne({email: email});
};

const findBusinessUserByNrAndDisplayName = async function findBusinessUserByNrAndBusinessName(nr,displayname) {
    return await BusinessUser.findOne({nr:nr,displayname:displayname});
};


module.exports = {
    'findRegularUserByJWT': findRegularUserByJWT,
    'findBusinessUserByNrAndDisplayName':findBusinessUserByNrAndDisplayName,
    'findRegularUserByEmail':findRegularUserByEmail
};
