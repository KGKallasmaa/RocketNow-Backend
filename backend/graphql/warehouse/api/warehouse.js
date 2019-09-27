require('dotenv').config();

const findOrderService = require('../services/findOrder.jsx');
const findExpensesTotalService = require('../services/findExcepencesTotal.jsx');
const warehouseManagementService = require('../services/warehouseManagement.jsx');

const {transformGood, transformPartialOrder} = require('../../enchancer');

module.exports = {
    individualPartialOrder: async ({partial_order_id}) => {
        const partialOrder = warehouseManagementService.individualPartialOrder(partial_order_id);
        return transformPartialOrder(partialOrder);
    },
    partialOrdersNotYetShipped: async ({jwt_token}) => {
        const partialOrdersNotYetShipped = warehouseManagementService.partialOrdersNotYetShipped(jwt_token);
        return partialOrdersNotYetShipped.map(partialOrder => {
            return transformPartialOrder(partialOrder);
        });
    },
    productsInWarehouse: async ({jwt_token}) => {
        const goods = warehouseManagementService.productsInWarehouseByJWT(jwt_token);
        return goods.map(good => {
            return transformGood(good);
        });
    },
    thisMonthsRevenue: async ({jwt_token}) => {
        const thisMonthStartTime = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        const thisMonthEndTime = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime();
        const allPartialOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisMonthStartTime, thisMonthEndTime);
        return findExpensesTotalService.findPartialOrdersRevenue(allPartialOrders);
    },
    thisMonthsExpenses: async ({jwt_token}) => {
        const thisMonthStartTime = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
        const thisMonthEndTime = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getTime();
        const allPartialOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisMonthStartTime, thisMonthEndTime);
        const allOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisMonthStartTime, thisMonthEndTime);
        return findExpensesTotalService.findAllExpenses(allOrders, allPartialOrders);
    },
    thisYearsRevenue: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1).getTime();
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31).getTime();
        const allPartialOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return findExpensesTotalService.findPartialOrdersRevenue(allPartialOrders);
    },
    thisYearsExpenses: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1).getTime();
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31).getTime();
        const allPartialOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        const allOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return findExpensesTotalService.findAllExpenses(allOrders, allPartialOrders);
    },
    thisYearsOrdersSum: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1).getTime();
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31).getTime();
        const allPartialOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return findExpensesTotalService.findPartialOrdersRevenueGroupByMonth(allPartialOrders);


    },
    thisYearsOrdersCount: async ({jwt_token}) => {
        const thisYearStartTime = new Date(new Date().getFullYear(), 1, 1).getTime();
        const thisYearEndTime = new Date(new Date().getFullYear(), 12, 31).getTime();
        const allPartialOrders = findOrderService.findPartialOrdersBetweenDates(jwt_token, thisYearStartTime, thisYearEndTime);
        return findExpensesTotalService.findPartialOrdersCountGroupByMonth(allPartialOrders);
    }
};
