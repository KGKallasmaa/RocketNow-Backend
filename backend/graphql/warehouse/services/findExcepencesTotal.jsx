require('dotenv').config();

const findPartialOrdersRevenue = async function findPartialOrdersRevenue(partialOrders){
    let sum = 0;
    for (let i = 0; i < partialOrders.length; i++) {
        sum += partialOrders[i].partial_subtotal;
    }
    return sum;
};

const findAllExpenses = async function findPartialOrdersRevenue(orders,partialOrders){
    /*
    TODO: verify calcluations
    */
    /*
      Example order
      Order price: 120€ (with VAT)
      Shipping cost: 5€ (with VAT)

      Order without VAT: 120/1.2 + 5/1.2 = 100 + 4.16 =  104.16
      StripeFee: 125*1.4% +0.25 = 2
      RocketNowFee: 104.16*0.1 = 10.41

     Money RocketNow received: 125-2 = 123
     Money RocketNow pays to the government (VAT) = 125-104.16 = 20.84
       */

    /*
   Expenses:
   1. Shipping fee = -4.16
   2. Stripe fee = +2
   3. RocketNow fee = +10.41
   4. Total = -4.16+2+10.41 = 8.25
    */

    let expences = 0;
    //Partial-order related fees
    for (let i = 0; i < partialOrders.length; i++) {
        const partialOrderShippingCost_with_Tax = partialOrders[i].partial_shipping_cost;
        const partialOrderShippingCost_withOut_Tax = partialOrderShippingCost_with_Tax/(1+0.2); //Value added TAX for shipping is 20% in Estonia
        expences -= partialOrderShippingCost_withOut_Tax;

        const stripeVariableFee = partialOrders[i].partial_subtotal*(0.014);
        expences += stripeVariableFee;
    }
    //Order related fees
    for (let i = 0; i < orders.length; i++) {
       const stripeFixedFee = 0.25/orders[i].partial_orders.length;
       expences +=stripeFixedFee;

       const rocketNowFee = (orders[i].subtotal-orders[i].tax_cost)*0.1; // RocketNow fee is 10%
       expences += rocketNowFee;
    }
    return expences;
};

module.exports = {
    'findPartialOrdersRevenue': findPartialOrdersRevenue,
    'findAllExpenses': findAllExpenses,
};
