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
const axios = require('axios');

const cart_schemas = require('../../shoppingcart/models/shoppingcart');
const ForexRate = cart_schemas.ForexRate;

const good_schemas = require('../../good/models/good');
const OrderGood = good_schemas.OrderGood;

async function getForexData(sourceCurrency) {
    const KEY = sourceCurrency + "_EUR";
    const URL = "https://free.currconv.com/api/v7/convert?q=" + KEY + "&compact=ultra&apiKey=" + process.env.FREE_FOREX_API_KEY;
    return await axios.get(URL).then(response => {
            console.log("Forex rate for " + sourceCurrency + "/EUR was updated ");
            return response.data[KEY];
        }
    ).catch(error => {
        return Error("Error accessing Forex data " + error)
    });
}

const findPartialOrdersRevenue = async function findPartialOrdersRevenue(partialOrders) {
    let sum = 0;
    for (let i = 0; i < partialOrders.length; i++) {
        const element = partialOrders[i];
        for (let j = 0; j < element.order_items.length; j++) {
            const orderGood = await OrderGood.findById(element.order_items[j]);
            sum += await convertToEUR(orderGood.currency,orderGood.price_per_one_item)*orderGood.quantity;
        }
    }
    return Math.round(sum * 100) / 100;
};

const convertToEUR = async function convertToEUR(currency, price) {
    if (currency === "EUR") return price;
    const currentRate = await ForexRate.findOne({source: currency, target: "EUR"});
    if (!currentRate) {
        const newForex = new ForexRate({
            source: currency,
            rate: Number(await getForexData(currency))
        });
        const result = await newForex.save();
        return Math.round(100 * (result.rate * price));
    }
    const oldestAcceptableUpdateTime = new Date( Date.now() - 1000 * 60*1.8 );//1.8 minutes
    if (parseInt(currentRate.lastUpdateTime_UTC) < oldestAcceptableUpdateTime) {
        await ForexRate.update(
            {_id: currentRate._id},
            {
                $set: {
                    "rate": await getForexData(currency),
                    "lastUpdateTime_UTC": new Date().getTime()
                }
            }
        );
    }
    return Math.floor(Math.round(100 * (currentRate.rate * price)))/100;
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
    return Math.round(expenses * 100) / 100;
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
        monthAndRevenue[monthAsString] = Math.round(sum * 100) / 100;
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
    'findPartialOrdersCountGroupByMonth': findPartialOrdersCountGroupByMonth,
    'convertToEUR':convertToEUR
};
