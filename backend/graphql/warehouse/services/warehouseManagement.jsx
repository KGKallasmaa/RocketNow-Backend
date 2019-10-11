require('dotenv').config();

const findUserService = require('../../user/services/findUser.jsx');

const good_schema = require('../../good/models/good');
const Good = good_schema.Good;

const order_schemas = require('../../order/models/order');
const PartialOrder = order_schemas.PartialOrder;

const productsInWarehouseByJWT = async function currentWarehouseStatus(jwt_token){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return await Good.find({
        seller: businessUser.id
    }).sort({'listing_timestamp': 'desc'});
};

const partialOrdersNotYetShipped = async function partialOrdersProcessingNotYetStarted(jwt_token){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return await PartialOrder.find({
        fulfiller: businessUser.id,
        partial_order_status: {$in: ["RECEIVED", "PROCESSING", "PROCESSED"]}
    }).sort({'received_timestamp_UTC': 'desc'});
};
const nrOfOrdersProcessingNotStarted = async function nrOfOrdersProcessingNotStarted(jwt_token){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return await PartialOrder.find({
        fulfiller: businessUser.id,
        partial_order_status: {$in: ["RECEIVED"]}
    }).sort({'received_timestamp_UTC': 'desc'});
};
const nrOfInProgressOrders = async function nrOfInProgressOrders(jwt_token){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return PartialOrder.find({
        fulfiller: businessUser.id,
        partial_order_status: {$in: ["PROCESSING"]}
    }).sort({'received_timestamp_UTC': 'desc'});
};
const nrOfNotShippedOrders = async function nrOfNotShippedOrders(jwt_token){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return await PartialOrder.find({
        fulfiller: businessUser.id,
        partial_order_status: {$in: ["PROCESSED"]}
    }).sort({'received_timestamp_UTC': 'desc'});
};




const individualPartialOrder = async function partialOrdersProcessingNotYetStarted(partialOrderId){
    return PartialOrder.findById(partialOrderId);
};

module.exports = {
    'productsInWarehouseByJWT': productsInWarehouseByJWT,
    'partialOrdersNotYetShipped': partialOrdersNotYetShipped,
    'individualPartialOrder': individualPartialOrder,
    'nrOfOrdersProcessingNotStarted':nrOfOrdersProcessingNotStarted,
    'nrOfInProgressOrders':nrOfInProgressOrders,
    'nrOfNotShippedOrders':nrOfNotShippedOrders
};
