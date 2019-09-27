
require('dotenv').config();

const findUserService = require('../../user/services/findUser.jsx');

const good_schema = require('../../good/models/good');
const Good = good_schema.Good;

const order_schemas = require('../../order/models/order');
const PartialOrder = order_schemas.PartialOrder;

const productsInWarehouseByJWT = async function currentWarehouseStatus(jwt_token){
    const businessUser = findUserService.findBusinessUserByJWT(jwt_token);
    return Good.find({
        seller: businessUser.id
    }).sort({'listing_timestamp': 'desc'});
};

const partialOrdersNotYetShipped = async function partialOrdersProcessingNotYetStarted(jwt_token){
    const businessUser = findUserService.findBusinessUserByJWT(jwt_token);
    return PartialOrder.find({
        seller: businessUser.id,
        status:{$in:["NEW","RECEIVED","PROCESSING"]}
    }).sort({'listing_timestamp': 'desc'});
};
const individualPartialOrder = async function partialOrdersProcessingNotYetStarted(partialOrderId){
    return PartialOrder.findById(partialOrderId);
};



module.exports = {
    'productsInWarehouseByJWT': productsInWarehouseByJWT,
    'partialOrdersNotYetShipped': partialOrdersNotYetShipped,
    'individualPartialOrder': individualPartialOrder,
};
