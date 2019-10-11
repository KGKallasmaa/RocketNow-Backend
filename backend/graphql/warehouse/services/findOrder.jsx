require('dotenv').config();
const order_schema = require('../../order/models/order');
const findUserService = require('../../user/services/findUser.jsx');

const PartialOrder = order_schema.PartialOrder;
const Order = order_schema.Order;

const findPartialOrdersBetweenDates = async function findPartialOrdersBetweenDates(jwt_token,start,finish){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return  await PartialOrder.find({
       fulfiller: businessUser.id,
        new_timestamp_UTC: {$gte: start, $lte: finish}
   });
};

const findOrdersBetweenDates = async function findOrdersBetweenDates(jwt_token,start,finish){
    const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
    return Order.find({
        fulfiller: businessUser.id,
        received_timestamp_UTC: {$gte: start, $lte: finish}
    });
};

module.exports = {
    'findPartialOrdersBetweenDates': findPartialOrdersBetweenDates,
    'findOrdersBetweenDates':findOrdersBetweenDates
};
