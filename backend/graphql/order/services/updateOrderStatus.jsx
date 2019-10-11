require('dotenv').config();

const orderSchemas = require('../models/order');
const PartialOrder = orderSchemas.PartialOrder;
const Order = orderSchemas.Order;

const goodSchemas = require('../../good/models/good');
const good = goodSchemas.Good;

const updatePartialOrderStatus = async function updatePartialOrderStatus(partialOrder, newStatus,current_timestamp) {
    if (newStatus === "PROCESSING") {
        await PartialOrder.update(
            {_id: partialOrder._id},
            {$set: {"processing_start_timestamp_UTC": current_timestamp}}
        )
    } else if (newStatus === "PROCESSED") {
        await PartialOrder.update(
            {_id: partialOrder._id},
            {$set: {"processing_end_timestamp_UTC": current_timestamp}}
        )
    } else if (newStatus === "SHIPPED") {
        //updating the quanity of goods available
        await PartialOrder.update(
            {_id: partialOrder._id},
            {$set: {"shipped_timestamp_UTC": current_timestamp}}
        )
    }
    await PartialOrder.update(
        {_id: partialOrder._id},
        {$set: {"partial_order_status": newStatus}}
    );
    const updatedPartialOrder = await PartialOrder.findById(partialOrder._id);
    console.log("Partial order "+updatedPartialOrder.id+" status is now "+updatedPartialOrder.partial_order_status);
    return  updatedPartialOrder;
};

function shouldUpdateOrderStatus(order, proposedStatus) {
    for (let i = 0; i < order.partial_orders.length; i++) {
        if (proposedStatus !== order.partial_orders[i].partial_order_status) {
            return false;
        }
    }
    return true;
}

const updateOrderStatus = async function updateOrderStatus(order, proposedStatus,current_timestamp) {
    if (!shouldUpdateOrderStatus(order, proposedStatus)) {
        return order;
    }
    Order.update(
        {_id: order._id},
        {$set: {"status": proposedStatus}}
    );
    if (proposedStatus === "PROCESSING") {
        Order.update(
            {_id: order._id},
            {$set: {"processing_start_timestamp_UTC": current_timestamp}}
        )
    } else if (proposedStatus === "PROCESSED") {
        Order.update(
            {_id: order._id},
            {$set: {"processing_end_timestamp_UTC": current_timestamp}}
        )
    } else if (proposedStatus === "SHIPPED") {
        Order.update(
            {_id: order._id},
            {$set: {"shipped_timestamp_UTC": current_timestamp}}
        )
    }
    console.log("Order " + order.id + " status is now" + proposedStatus);
    return await Order.findById(order._id);
};
module.exports = {
    'updatePartialOrderStatus': updatePartialOrderStatus,
    'updateOrderStatus': updateOrderStatus
};