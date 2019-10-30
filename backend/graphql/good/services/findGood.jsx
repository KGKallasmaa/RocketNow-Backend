const goodSchemas = require('../models/good');
const Good = goodSchemas.Good;

const findGoodByNr = async function findGoodByNr(nr) {
    return await Good.findOne({nr: nr});
};

const findGoodById = async function findGoodByNr(id) {
    return await Good.findById(id);
};

module.exports = {
    'findGoodByNr': findGoodByNr,
    'findGoodById': findGoodById,
};