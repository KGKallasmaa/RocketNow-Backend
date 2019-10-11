require('dotenv').config();

const orderSchemas = require('../models/order');
const PartialOrder = orderSchemas.PartialOrder;
const Order = orderSchemas.Order;

const findOrderByPartialOrder = async function findOrderByPartialOrder (partialOrderId) {
    return Order.findOne({partial_orders: {$in: [partialOrderId]}});
};
const findPartialOrderById = async function findPartialOrderById(partialOrderId) {
    return  PartialOrder.findById(partialOrderId);
};
module.exports = {
    'findOrderByPartialOrder': findOrderByPartialOrder ,
    'findPartialOrderById': findPartialOrderById
};