require('dotenv').config();

const order_schema = require('../../models/order');
const Order = order_schema.Order;
const PartialOrder = order_schema.PartialOrder;

const user_schemas = require('../../models/user');
const RegularUser = user_schemas.RegularUser;
const BusinessUser = user_schemas.BusinessUser;

const cart_schemas = require('../../models/shoppingcart');
const ShoppingCart = cart_schemas.ShoppingCart;

const shipping_schema = require('../../models/shipping');
const ParcelDeliveryLocation = shipping_schema.ParcelDeliveryLocation;

const good_schemas = require('../../models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;
const OrderGood = good_schemas.OrderGood;
const axios = require('axios');

const {transformOrder} = require('./merge');


//TODO: remove
async function test() {
    //TODO: remove after manual input

    const name_array = [
        "Jüri Konsum",
        "Kakumäee Selver"
    ];

    const x_coordinate_aray = [
        24.912249,
        24.626617
    ];
    const y_coordinate_aray = [
        59.357965,
        59.428133
    ];


    for (let i = 0; i < name_array.length; i++) {
        const current_name = name_array[i];
        const current_x = x_coordinate_aray[i];
        const current_y = y_coordinate_aray[i];

        const test_1 = new ParcelDeliveryLocation({
            provider: "Itella",
            name: current_name,
            country: "Estonia",
            x_coordinate: current_x,
            y_coordinate: current_y
        });
        const result1 = await test_1.save();
    }

    return true;

}

//TODO: implement real stripe api key 
const stripe = require('stripe')(process.env.STRIPE_API_SECRET);
//const stripe = require('stripe')('sk_test_pBnnOLzSC3Jo0E3RDmE5S1Q5');

const jwt = require('jsonwebtoken');


//Helper funcions
async function findUser(jwt_token) {
    const decoded = jwt.decode(jwt_token, process.env.PERSONAL_JWT_KEY);
    const user = await RegularUser.findById(decoded.userId);
    if (!user) throw new Error('User does not exists.');
    return user;
}

async function findShoppingCart(user) {
    const cart = await ShoppingCart.findOne({cart_identifier: user._id});
    if (!cart) throw new Error('User does not exists.');
    return cart;
}

async function findShoppingCartByJWT(jwt_token) {
    const decoded = jwt.decode(jwt_token, process.env.PERSONAL_JWT_KEY);
    const user = await RegularUser.findById(decoded.userId);
    if (!user) throw new Error('JWT was not decoded properly');
    const shoppingcart = await ShoppingCart.findOne({cart_identifier: decoded.userId});
    if (!shoppingcart) throw new Error("No shopping cart found for this user");
    return shoppingcart;
}

async function groupCartGoodsByBusinessAndUpdateBookedQuantity(shoppingcart) {
    let BusinessUser_Cartgoods = {};

    for (let i = 0; i < shoppingcart.goods.length; i++) {
        const cartgood = await CartGood.findById(shoppingcart.goods[i]);
        const good = await Good.findById(cartgood.good);
        const seller = good.seller;

        if (seller in BusinessUser_Cartgoods) {
            let current_array = BusinessUser_Cartgoods[seller];
            current_array.push(cartgood);
            BusinessUser_Cartgoods[seller] = current_array;
        } else {
            BusinessUser_Cartgoods[seller] = [cartgood];
        }

        const Updated_Booked_Quantity = good.booked + cartgood.quantity;
        await Good.update(
            {_id: good._id},
            {
                $set: {
                    "booked": Updated_Booked_Quantity,
                }
            }
        );
    }

    return BusinessUser_Cartgoods;
}

//TODO: design a permanent solution
const FIXER_MaxMonthlyQuery_COUNT = 1000;
const ONE_MONTH_IN_MS = 2592000000;
const QUERY_UPTATE_INTERVAl_MS = ONE_MONTH_IN_MS / FIXER_MaxMonthlyQuery_COUNT;
let NextAvailableQueryTimestamp = undefined;
let usd_eur = undefined;
let gbp_eur = undefined;
let rub_eur = undefined;

async function uptadedForexRates() {
    const KEY = process.env.FIXER_IO_API_KEY;
    const URL = "http://data.fixer.io/api/latest?access_key=" + KEY + "&base=EUR&symbols = USD,RUB,GBP";
    let return_value = false;
    await axios.get(URL)
        .then(response => {
            if (response.data.success === true) {
                usd_eur = response.data.rates.USD;
                gbp_eur = response.data.rates.GBP;
                rub_eur = response.data.rates.RUB;
                return_value = true;
            }
        })
        .catch(error => {
            console.log("Error accessing Forex data " + error)
        });
    return return_value;
}

async function convertToStipeEUR(timestamp,
                                 currency,
                                 price) {
    //Currently we support USD,RUB;EUR,GBP
    if (!NextAvailableQueryTimestamp || !usd_eur || !gbp_eur || !rub_eur) {
        NextAvailableQueryTimestamp = timestamp;
    }
    if (NextAvailableQueryTimestamp <= timestamp) {
        const response = await uptadedForexRates();
        if (response !== true) {
            throw new Error("Error updating Forex rates")
        }
        NextAvailableQueryTimestamp += QUERY_UPTATE_INTERVAl_MS;
    }

    let ReformattedPrice = 0;

    switch (currency) {
        case "EUR":
            ReformattedPrice = price;
            break;
        case "USD":
            ReformattedPrice = price * usd_eur;
            break;
        case "GBP":
            ReformattedPrice = price * gbp_eur;
            break;
        case "RUB":
            ReformattedPrice = price * rub_eur;
            break;
        default:
            throw new Error("We're unable to convert currency %s", (currency))
    }
    return Math.ceil(100 * ReformattedPrice);
}

async function FormatShippingItem(
    ParcelDeliveryLocationId,
    ShippingName,
    ShippingAddressLine1,
    ShippingAddressLine2,
    ShippingCity,
    ShippingRegion,
    ShippingZip,
    ShippingCountry,
    ShippingMethod,
    ShippingCost,
    ShippingCostCurrency) {


    let image = undefined;
    let description = undefined;

    switch (ShippingMethod) {
        case ("AddressDelivery"):
            image = "https://res.cloudinary.com/dl7zea2jd/image/upload/v1561837922/shipping_pictures/AddressDeliveryLogo_hgnqht.png";
            const name = ShippingName + " \n";
            const address = ShippingAddressLine1 + (ShippingAddressLine2 !== undefined) ? "-" + ShippingAddressLine2 : "" + " \n";
            const region = ShippingZip + ", " + ShippingCity + ", " + ShippingRegion + " \n";
            const country = ShippingCountry + " \n";
            description = name + address + region + country;
            break;
        case ("ParcelDelivery"):
            const ShippingProvider = await ParcelDeliveryLocation.findById(ParcelDeliveryLocationId);
            switch (ShippingProvider.provider) {
                case "Omniva":
                    image = "https://res.cloudinary.com/dl7zea2jd/image/upload/v1561836505/shipping_pictures/OmnivaLogo_hcoipn.png";
                    break;
                case "Itella":
                    image = "https://res.cloudinary.com/dl7zea2jd/image/upload/v1561836505/shipping_pictures/ItellaLogo_y4og8b.png";
                    break;
                case "DBD":
                    image = "https://res.cloudinary.com/dl7zea2jd/image/upload/v1561836505/shipping_pictures/DPD_kfsidq.png";
                    break;
            }
            description = "Location: " + ShippingProvider.name;
            break;
        default:
            console.log("Shipping method " + ShippingMethod + " is not supported.")
    }

    let item = {};
    item["name"] = (ShippingCost === 0) ? "Free shipping" : "Shipping";
    item["images"] = [image];
    item["description"] = description;
    item["amount"] = await convertToStipeEUR(new Date().getTime(), ShippingCostCurrency, ShippingCost, 1);
    item["currency"] = 'eur';
    item["quantity"] = 1;
    return item;
}

async function GetStripeFormatedItems(shoppingcart,
                                      shippingItem) {
    let return_array = Array();
    const CurrentTimestamp = new Date().getTime();
    //1. Format ShoppingCart items
    for (let i = 0; i < shoppingcart.goods.length; i++) {
        const cartgood = await CartGood.findById(shoppingcart.goods[i]);
        const good = await Good.findById(cartgood.good);
        const quantity = Math.max(Math.min(cartgood.quantity, good.quantity), 1);
        let item = {};
        item["name"] = good.title;
        item["images"] = [good.main_image_cloudinary_secure_url];
        item["amount"] = await convertToStipeEUR(CurrentTimestamp, good.currency, good.current_price);
        item["currency"] = 'eur';
        item["quantity"] = quantity;
        return_array.push(item);
    }
    //2. Add Shipping info
    return_array.push(shippingItem);
    return return_array;
}

async function getPartialOrders(BusinessUser_Cartgoods,
                                current_timestamp,
                                partial_order_status,
                                order_shipping_cost,
                                order_total,
                                order_tax_cost) {
    let PartialOrders = [];
    for (const businessuser in BusinessUser_Cartgoods) {
        const cartgoods = BusinessUser_Cartgoods[businessuser];

        let order_items = [];
        let partial_subtotal = 0;

        for (let i = 0; i < cartgoods.length; i++) {
            const cartgood = cartgoods[i];
            const good = await Good.findById(cartgood.good);

            let new_OrderGood = await OrderGood.findOne({
                "title": good.title,
                "price_per_one_item": cartgood.price_per_one_item,
                "main_image_cloudinary_secure_url": good.main_image_cloudinary_secure_url,
                "quantity": cartgood.quantity,
                "currency": good.currency,
            });
            if (!new_OrderGood) {
                new_OrderGood = new OrderGood({
                    title: good.title,
                    price_per_one_item: cartgood.price_per_one_item,
                    main_image_cloudinary_secure_url: good.main_image_cloudinary_secure_url,
                    quantity: cartgood.quantity,
                    currency: good.currency,
                });
                await new_OrderGood.save();
            }
            partial_subtotal += cartgood.price_per_one_item * cartgood.quantity;
            order_items.push(new_OrderGood);
        }
        const partial_shipping_cost = (partial_subtotal === 0) ? 0 : (partial_subtotal * order_shipping_cost) / order_total;
        //TODO: fix tax calculations
        const partial_tax_cost = (partial_subtotal === 0) ? 0 : (partial_subtotal * order_tax_cost) / order_total;


        const new_partialOrder = new PartialOrder({
            new_timestamp_UTC: current_timestamp,
            partial_subtotal: partial_subtotal,
            partial_shipping_cost: partial_shipping_cost,
            partial_tax_cost: partial_tax_cost,
            partial_order_status: partial_order_status,
            fulfiller: businessuser,
            order_items: order_items
        });
        await new_partialOrder.save();
        PartialOrders.push(new_partialOrder);
    }
    return PartialOrders;
}

async function getOrderItemsFromPartialOrders(PartialOrders) {
    let order_items = [];
    for (let index = 0; index < PartialOrders.length; index++) {
        const SinglePartialOrder = PartialOrders[index];
        order_items.push(...SinglePartialOrder.order_items);
    }
    console.log(order_items);
    return order_items;
}


module.exports = {
    showCheckout: async args => {
        const jwt_token = args.checkoutInput.jwt_token;
        const ParcelDeliveryLocation = args.checkoutInput.ParcelDeliveryLocation;
        const ShippingName = args.checkoutInput.ShippingName;
        const ShippingAddressLine1 = args.checkoutInput.ShippingAddressLine1;
        const ShippingAddressLine2 = args.checkoutInput.ShippingAddressLine2;
        const ShippingCity = args.checkoutInput.ShippingCity;
        const ShippingRegion = args.checkoutInput.ShippingRegion;
        const ShippingZip = args.checkoutInput.ShippingZip;
        const ShippingCountry = args.checkoutInput.ShippingCountry;
        const ShippingMethod = args.checkoutInput.ShippingMethod;
        const ShippingCost = args.checkoutInput.ShippingCost;
        const ShippingCostCurrency = args.checkoutInput.ShippingCurrency;


        //1. Find the corresponding user
        const regular_user = await findUser(jwt_token);
        //2. Find the shoppingcart
        const shoppingcart = await findShoppingCart(regular_user);
        //3. Format Shipping item
        const ShippingItem = await FormatShippingItem(
            ParcelDeliveryLocation,
            ShippingName,
            ShippingAddressLine1,
            ShippingAddressLine2,
            ShippingCity,
            ShippingRegion,
            ShippingZip,
            ShippingCountry,
            ShippingMethod,
            ShippingCost,
            ShippingCostCurrency
        );

        //4. Get the list of items that are currently in the shoppingcart
        const shoppingcart_items_formated_for_stripe = await GetStripeFormatedItems(shoppingcart, ShippingItem);
        //TODO: add real information
        //TODO: add suport. gerate unique Ids till ou have a cone that doest overlap
        const UNICUE_ORDER_ID = shoppingcart.success_id;

        //5. Update shopping cart: Add the stripe_charged_total; shipping_cost and tax_cost atributes
        const stripe_charged_total = async function (shoppingcart, shippingcost) {
            let total = 0;
            for (let i = 0; i < shoppingcart.goods.length; i++) {
                const cartgood = await CartGood.findById(shoppingcart.goods[i]);
                const good = await Good.findById(cartgood.good);
                const quantity = Math.max(Math.min(cartgood.quantity, good.quantity), 1);
                console.log("Testing: quantitity " + quantity)
                console.log("Price: " + good.current_price);
                total += quantity * good.current_price;
            }
            return total + shippingcost;
        };
        //TODO: tax calculation
        await ShoppingCart.update(
            {_id: shoppingcart._id},
            {
                $set: {
                    "stripe_charged_total": await stripe_charged_total(shoppingcart, ShippingCost),
                    "shipping_cost": ShippingCost,
                    "tax_cost": 0,
                }
            }
        );

        const SuccessUrl = process.env.CLIENT_URL + "/success/" + UNICUE_ORDER_ID;
        const CancelUrl = process.env.CLIENT_URL + "/cancel/" + UNICUE_ORDER_ID;

        const session = await stripe.checkout.sessions.create({
            customer_email: regular_user.email,
            payment_method_types: ['card'],
            line_items: shoppingcart_items_formated_for_stripe,
            payment_intent_data: {
                capture_method: 'manual',
            },
            success_url: SuccessUrl,
            cancel_url: CancelUrl,
        });
        //Save nessesry session details
        return {sessionId: session.id};
    },
    orderGoods: async args => {
        /*
        User made a successful order. We have recived the payment. Now it's time to make an order
        Order statuses : {RECEIVED","PROCESSING","PROCESSED","SHIPPED","DELIVERED"}
        PartialOrder statuses : {"NEW","RECEIVED","PROCESSING","PROCESSED","SHIPPED"}
         */
        const jwt_token = args.orderInput.jwt_token;
        const success_id = args.orderInput.success_id;
        const customer = await findUser(jwt_token);
        const shoppingcart = await findShoppingCartByJWT(jwt_token);

        //1. Is this success_id correct
        if (shoppingcart.success_id !== success_id) {
            throw new Error("Users shopping cart success_id is not equal to " + success_id)
        }
        const order_total = shoppingcart.stripe_charged_total;
        const order_shipping_cost = shoppingcart.shipping_cost;
        const order_tax_cost = shoppingcart.tax_cost;
        const order_subtotal = order_total - order_shipping_cost - order_tax_cost;
        const order_status = "RECEIVED";
        const partial_order_status = "NEW";
        const current_timestamp = new Date().getTime();

        //2. Create a partial Orders (for the Business clients)
        const BusinessUser_Cartgoods = await groupCartGoodsByBusinessAndUpdateBookedQuantity(shoppingcart);
        const Partial_Orders = await getPartialOrders(
            BusinessUser_Cartgoods,
            current_timestamp,
            partial_order_status,
            order_shipping_cost,
            order_total,
            order_tax_cost);
        //3. Create the Order (for the customer)
        const new_Order = new Order({
            received_timestamp_UTC: current_timestamp,
            status: order_status,
            customer: customer,
            fulfillers: Object.keys(BusinessUser_Cartgoods),
            partial_orders: Partial_Orders,
            subtotal: order_subtotal,
            shipping_cost: order_shipping_cost,
            tax_cost: order_tax_cost,
            order_items: await getOrderItemsFromPartialOrders(Partial_Orders)
        });
        await new_Order.save();


        //4.Change the goods availability and delete cartgoods
        for (let i = 0; i < shoppingcart.goods.length; i++) {
            const cartgood = await CartGood.findById(shoppingcart.goods[i]);
            await CartGood.findByIdAndDelete(cartgood.id);
        }
        // 5. Delete the current shopping cart
        await ShoppingCart.findByIdAndDelete(shoppingcart._id);

        //Finally return the shopping cart
        return transformOrder(new_Order);
    }
}
;
