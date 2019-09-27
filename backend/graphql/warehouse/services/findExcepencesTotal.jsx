require('dotenv').config();

//Constants
const monthDictionary = {
    "1": "Jan ",
    "2": "Feb ",
    "3": "Mar ",
    "4": "Apr ",
    "5": "May ",
    "6": "June ",
    "7": "July ",
    "8": "Aug ",
    "9": "Sep ",
    "10": "Okt ",
    "11": "Nov ",
    "12": "Dec ",
};

const findPartialOrdersRevenue = async function findPartialOrdersRevenue(partialOrders) {
    let sum = 0;
    for (let i = 0; i < partialOrders.length; i++) {
        sum += partialOrders[i].partial_subtotal;
    }
    return sum;
};

const findAllExpenses = async function findPartialOrdersRevenue(orders, partialOrders) {
    let expenses = 0;
    //Partial-order related fees
    for (let i = 0; i < partialOrders.length; i++) {
        const partialOrderShippingCost_with_Tax = partialOrders[i].partial_shipping_cost;
        const partialOrderShippingCost_withOut_Tax = partialOrderShippingCost_with_Tax / (1 + 0.2); //Value added TAX for shipping is 20% in Estonia
        expenses -= partialOrderShippingCost_withOut_Tax;

        const stripeVariableFee = partialOrders[i].partial_subtotal * (0.014);
        expenses += stripeVariableFee;
    }
    //Order related fees
    for (let i = 0; i < orders.length; i++) {
        const stripeFixedFee = 0.25 / orders[i].partial_orders.length;
        expenses += stripeFixedFee;

        const rocketNowFee = (orders[i].subtotal - orders[i].tax_cost) * 0.1; // RocketNow fee is 10%
        expenses += rocketNowFee;
    }
    return expenses;
};

const findPartialOrdersRevenueGroupByMonth = async function findPartialOrdersRevenue(partialOrders) {
    const currentTime = new Date();
    const thisMonth = currentTime.getMonth();

    const monthAndRevenue = {
        Jan: 0.0,
        Feb: 0.0,
        Mar: 0.0,
        Apr: 0.0,
        May: 0.0,
        June: 0.0,
        July: 0.0,
        Aug: 0.0,
        Sep: 0.0,
        Okt: 0.0,
        Nov: 0.0,
        Dec: 0.0,
    };

    for (let i = 1; i <= thisMonth; i++) {
        const monthAsString = monthDictionary[i];
        let sum = 0;
        const start = new Date(currentTime.getFullYear(), i, 1).getTime();
        const finish = new Date(currentTime.getFullYear(), i, 31).getTime();

        const suitablePartialOrders = partialOrders.find({
            age: {$gt: start, $lt: finish}
        });
        for (let j = 0; j < suitablePartialOrders.length; j++) {
            sum += suitablePartialOrders[j].partial_subtotal
        }
        monthAndRevenue[monthAsString] = sum;
    }
    return monthAndRevenue;
};
const findPartialOrdersCountGroupByMonth = async function findPartialOrdersRevenue(partialOrders) {
    const currentTime = new Date();
    const thisMonth = currentTime.getMonth();

    const monthAndCount = {
        Jan: 0,
        Feb: 0,
        Mar: 0,
        Apr: 0,
        May: 0,
        June: 0,
        July: 0,
        Aug: 0,
        Sep: 0,
        Okt: 0,
        Nov: 0,
        Dec: 0,
    };

    for (let i = 1; i <= thisMonth; i++) {
        const monthAsString = monthDictionary[i];
        const start = new Date(currentTime.getFullYear(), i, 1).getTime();
        const finish = new Date(currentTime.getFullYear(), i, 31).getTime();

        monthAndCount[monthAsString] = partialOrders.find({
            age: {$gt: start, $lt: finish}
        }).length;
    }
    return monthAndCount;
};

module.exports = {
    'findPartialOrdersRevenue': findPartialOrdersRevenue,
    'findAllExpenses': findAllExpenses,
    'findPartialOrdersRevenueGroupByMonth': findPartialOrdersRevenueGroupByMonth,
    'findPartialOrdersCountGroupByMonth': findPartialOrdersCountGroupByMonth
};
