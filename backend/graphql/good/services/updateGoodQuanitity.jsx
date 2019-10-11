require('dotenv').config();


const goodSchemas = require('../models/good');
const Good = goodSchemas.Good;

function goodCanBeShipped(good) {
    return good.booked < good.quantity;
}

const updateGoodQuantityByAmount = async function updateGoodQuanityByAmount(extraAmount,good) {
    //TODO: implement
};
//TODO: start from here


module.exports = {
    'updateGoodQuantityByAmount': updateGoodQuantityByAmount,
};