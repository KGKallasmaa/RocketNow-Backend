require('dotenv').config();

const findOrderService = require('../services/findOrder.jsx');
const findExpensesTotalService = require('../services/findExcepencesTotal.jsx');
const warehouseManagementService = require('../services/warehouseManagement.jsx');
const findRealOrderService = require('../../order/services/findOrder.jsx');
const address_schemas = require('../../shipping/models/address');
const OrderAddress = address_schemas.OrderAddress;
const order_schemas = require('../../order/models/order');
const enhancedPartialOrder = order_schemas.EnhancedPartialOrder;

const {transformGood, transformPartialOrder, transformEnhancedPartialOrder} = require('../../enchancer');

module.exports = {
    individualPartialOrder: async ({partial_order_id}) => {
        const partialOrder = await warehouseManagementService.individualPartialOrder(partial_order_id);
        return transformPartialOrder(partialOrder);
    },
    partialOrdersNotYetShipped: async ({jwt_token}) => {
        const partialOrdersNotYetShipped = await warehouseManagementService.partialOrdersNotYetShipped(jwt_token);
        let allEnchancedPartialOrders = [];
        for (let i = 0; i < partialOrdersNotYetShipped.length; i++) {
            const partialOrder = partialOrdersNotYetShipped[i];
            const order = await findRealOrderService.findOrderByPartialOrder(partialOrder.id);
            if (order != null) { //TODO: we should never expirinece it. Fix this
                const shippingAddress = await OrderAddress.findById(order.shippingAddress);
                const enchancedPartialOrder = new enhancedPartialOrder({
                    partialOrder: partialOrder,
                    shippingAddress: shippingAddress
                });
                allEnchancedPartialOrders.push(enchancedPartialOrder);
            }
        }
        return allEnchancedPartialOrders.map(enhancedPartialOrder => {
            return transformEnhancedPartialOrder(enhancedPartialOrder);
        });
    },
    productsInWarehouse: async ({jwt_token}) => {
        const goods = await warehouseManagementService.productsInWarehouseByJWT(jwt_token);
        return goods.map(good => {
            return transformGood(good);
        });
    },
    thisMonthsRevenue: async ({jwt_token}) => {
        const thisMonthStartTime = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const thisMonthEndTime = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
        const allPartialOrders = await findOrderService.findPartialOrdersBetweenDates(jwt_token, thisMonthStartTime, thisMonthEndTime);
        return await findExpensesTotalService.findPartialOrdersRevenue(allPartialOrders);
    },
    thisMonthsExpenses: async ({jwt_token}) => {
        const thisMonthStartTime = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const thisMonthEndTime = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
        const allPartialOrders = await findOrderService.findPartialOrdersBetweenDates(jwt_token, thisMonthStartTime, thisMonthEndTime);
        const allOrders = await findOrderService.findOrdersBetweenDates(jwt_token, thisMonthStartTime, thisMonthEndTime);
        return findExpensesTotalService.findAllExpenses(allOrders, allPartialOrders);
    },
    thisYearsRevenue: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1);
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31);
        const allPartialOrders = await findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return await findExpensesTotalService.findPartialOrdersRevenue(allPartialOrders);
    },
    thisYearsExpenses: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1);
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31);
        const allPartialOrders = await findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        const allOrders = await findOrderService.findOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return await findExpensesTotalService.findAllExpenses(allOrders, allPartialOrders);
    },
    thisYearsOrdersSum: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1);
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31);
        const allPartialOrders = await findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return await findExpensesTotalService.findPartialOrdersRevenueGroupByMonth(allPartialOrders);
    },
    thisYearsOrdersCount: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1);
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31);
        const allPartialOrders = await findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return await findExpensesTotalService.findPartialOrdersCountGroupByMonth(allPartialOrders);
    },
    nrOfOrdersProcessingNotStarted: async ({jwt_token}) => {
        const count = await warehouseManagementService.nrOfOrdersProcessingNotStarted(jwt_token);
        if (!count) {
            return 0;
        }
        return count.length;
    },

    nrOfInProgressOrders: async ({jwt_token}) => {
        const count = await warehouseManagementService.nrOfInProgressOrders(jwt_token);
        if (!count) {
            return 0;
        }
        return count.length;
    },

    nrOfNotShippedOrders: async ({jwt_token}) => {
        const count = await warehouseManagementService.nrOfNotShippedOrders(jwt_token);
        if (!count) {
            return 0;
        }
        return count.length;
    },

    unCompletedOrdersValue: async ({jwt_token}) => {
        const allPartialOrders = await warehouseManagementService.partialOrdersNotYetShipped(jwt_token);
        return await findExpensesTotalService.findPartialOrdersRevenue(allPartialOrders);
    }
};