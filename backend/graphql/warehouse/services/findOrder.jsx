require('dotenv').config();
const order_schema = require('../../order/models/order');
const findUserService = require('../../user/services/findUser.jsx');

const PartialOrder = order_schema.PartialOrder;
const Order = order_schema.Order;

const findPartialOrdersBetweenDates = async function findPartialOrdersBetweenDates(jwt_token,start,finish){
    const businessUser = findUserService.findBusinessUserByJWT(jwt_token);
    return PartialOrder.find({
        fulfiller: businessUser.id,
        age: {$gt: start, $lt: finish}
    });
};

const findOrdersBetweenDates = async function findOrdersBetweenDates(jwt_token,start,finish){
    const businessUser = findUserService.findBusinessUserByJWT(jwt_token);
    return Order.find({
        fulfiller: businessUser.id,
        age: {$gt: start, $lt: finish}
    });
};

module.exports = {
    'findPartialOrdersBetweenDates': findPartialOrdersBetweenDates,
    'findOrdersBetweenDates':findOrdersBetweenDates
};
