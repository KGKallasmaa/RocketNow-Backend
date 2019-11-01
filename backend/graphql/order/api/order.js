require('dotenv').config();

const order_schema = require('../models/order');
const Order = order_schema.Order;
const PartialOrder = order_schema.PartialOrder;

const user_schemas = require('../../user/models/user');
const RegularUser = user_schemas.RegularUser;
const BusinessUser = user_schemas.BusinessUser;

const category_schemas = require('../../category/models/generalCategory');
const GeneralCategory = category_schemas.GeneralCategory;

const cart_schemas = require('../../shoppingcart/models/shoppingcart');
const ShoppingCart = cart_schemas.ShoppingCart;
const ForexRate = cart_schemas.ForexRate;

const shipping_schema = require('../../shipping/models/shipping');
const ParcelDeliveryLocation = shipping_schema.ParcelDeliveryLocation;

const address_schema = require('../../shipping/models/address');
const OrderAddress = address_schema.OrderAddress;

const good_schemas = require('../../good/models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;
const OrderGood = good_schemas.OrderGood;

const axios = require('axios');
const {transformOrder} = require('../../enchancer');

const findUserService = require('../../user/services/findUser.jsx');
const findOrderService = require('../services/findOrder.jsx');
const updateOrderStatus = require('../services/updateOrderStatus.jsx');

const {transformPartialOrderUpdate} = require('../../enchancer');

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

async function convertToStipeEUR(currency, price) {
    if (currency === "EUR") return Math.floor(Math.round(100 * price));
    /*
    Forex rates are provided by FreeForexApi. In an hour we can make 100 requests. Currently we support EUR,USD,RUB and GBP. Forex rates are updated at maximum every 1.8 minutes ( 60/ (100/3))
     */
    const currentRate = await ForexRate.findOne({source: currency, target: "EUR"});
    if (!currentRate) {
        const newForex = new ForexRate({
            source: currency,
            rate: Number(await getForexData(currency))
        });
        const result = await newForex.save();
        return Math.ceil(100 * result.rate * price);
    }
    const oldestAcceptableUpdateTime = new Date(Date.now() - 108000);//1.8 minutes
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
    return Math.floor(Math.round(100 * (currentRate.rate * price)));
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
            image = "https://res.cloudinary.com/dl7zea2jd/image/upload/v1565514682/shipping_pictures/AddressDeliveryLogo_lpqgpp.png";
            const name = ShippingName + " \n";
            description = "Address delivery to " + name;
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

    //TODO: make it dynamic
    const shippingTaxRate = 0.2;

    let item = {};
    item["name"] = (ShippingCost === 0) ? "Free shipping" : "Shipping";
    item["images"] = [image];
    item["description"] = description;
    item["amount"] = await convertToStipeEUR(ShippingCostCurrency, ShippingCost*(1+shippingTaxRate)); //received shippingcost was without taxes
    item["currency"] = 'eur';
    item["quantity"] = 1;
    return item;
}

async function GetStripeFormatedItems(shoppingcart,
                                      shippingItem) {
    let return_array = Array();
    //1. Format ShoppingCart items
    for (let i = 0; i < shoppingcart.goods.length; i++) {
        const cartgood = await CartGood.findById(shoppingcart.goods[i]);
        const good = await Good.findById(cartgood.good);
        const category = await GeneralCategory.findById(good.general_category);
        const quantity = Math.max(Math.min(cartgood.quantity, good.quantity), 1);
        let item = {};
        item["name"] = good.title;
        item["images"] = [good.main_image_cloudinary_secure_url];
        item["amount"] = await convertToStipeEUR(good.currency, good.current_price * (1 + category.tax));
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
                "dateCreated_UTC": current_timestamp,
                "price_per_one_item": cartgood.price_per_one_item,
                "main_image_cloudinary_secure_url": good.main_image_cloudinary_secure_url,
                "quantity": cartgood.quantity,
                "currency": good.currency,
            });
            if (!new_OrderGood) {
                new_OrderGood = new OrderGood({
                    title: good.title,
                    dateCreated_UTC: current_timestamp,
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
            received_timestamp_UTC: current_timestamp,
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
        const ShippingCost = args.checkoutInput.ShippingCost; //without tax
        const totalCost = args.checkoutInput.totalCost; // with tax
        const taxCost = args.checkoutInput.taxCost;//contains items tax + shipping tax
        const ShippingCostCurrency = args.checkoutInput.ShippingCurrency;
        const deliveryEstimate_UTC = args.checkoutInput.deliveryEstimate_UTC;


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

        let userAddress;

        if (ShippingMethod === "ParcelDelivery") {
            userAddress = await OrderAddress.findOne({
                parcelDeliveryLocation: ParcelDeliveryLocation,
                shippingName: ShippingName,
                shippingMethod: ShippingMethod,
            });
            if (!userAddress) {
                userAddress = new OrderAddress({
                    shippingName: ShippingName,
                    parcelDeliveryLocation: ParcelDeliveryLocation,
                    shippingMethod: ShippingMethod,
                });
                await userAddress.save();
                console.log("Saved a new shipping address for user #" + regular_user._id)
            }
        } else if (ShippingMethod === "AddressDelivery") {
            userAddress = await OrderAddress.findOne({
                shippingMethod: ShippingMethod,
                shippingName: ShippingName,
                addressOne: ShippingAddressLine1,
                addressTwo: ShippingAddressLine2,
                city: ShippingCity,
                region: ShippingRegion,
                zip: ShippingZip,
                country: ShippingCountry,
            });
            if (!userAddress) {
                userAddress = new OrderAddress({
                    shippingMethod: ShippingMethod,
                    shippingName: ShippingName,
                    addressOne: ShippingAddressLine1,
                    addressTwo: ShippingAddressLine2,
                    city: ShippingCity,
                    region: ShippingRegion,
                    zip: ShippingZip,
                    country: ShippingCountry,
                });
                await userAddress.save();
                console.log("Saved a new shipping address for user #" + regular_user._id)
            }
        } else {
            return Error("Shippingmethod " + ShippingMethod.toLowerCase() + " is not supported");
        }

        await ShoppingCart.update(
            {_id: shoppingcart._id},
            {
                $set: {
                    "stripe_charged_total": totalCost,
                    "shipping_cost": ShippingCost,
                    "tax_cost": taxCost,
                    "shippingAddress": userAddress,
                    "deliveryEstimate_UTC": deliveryEstimate_UTC
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
        console.log("User # " + regular_user._id + " entered checkout ");
        return {sessionId: session.id};
    },
    orderGoods: async args => {
        /*
        User made a successful order. We have recived the payment. Now it's time to make an order
        Order statuses : {RECEIVED","PROCESSING","PROCESSED","SHIPPED"}
        PartialOrder statuses : {"RECEIVED","PROCESSING","PROCESSED","SHIPPED"}
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
        const partial_order_status = "RECEIVED";
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
            order_items: await getOrderItemsFromPartialOrders(Partial_Orders),
            deliveryEstimate_UTC: shoppingcart.deliveryEstimate_UTC,
            shippingAddress: shoppingcart.shippingAddress
        });
        await new_Order.save();


        //4.Change the goods availability and delete cartgoods
        for (let i = 0; i < shoppingcart.goods.length; i++) {
            const cartgood = await CartGood.findById(shoppingcart.goods[i]);
            await CartGood.findByIdAndDelete(cartgood.id);
        }
        // 5. Delete the current shopping cart
        await ShoppingCart.findByIdAndDelete(shoppingcart._id);

        //6. Update user status to customer
        if (customer.isCustomer === false) {
            await RegularUser.update(
                {_id: customer._id},
                {
                    $set: {
                        "isCustomer": true,
                    }
                }
            );
        }


        //Finally return the shopping cart
        console.log("User # " + customer._id + " submitted an order # " + new_Order._id);

        return transformOrder(new_Order);
    },
    individualOrder: async ({jwt_token, order_id}) => {
        const decoded = jwt.decode(jwt_token, process.env.PERSONAL_JWT_KEY);
        if (!decoded) return Error('JWT was not decoded properly');

        const user = await RegularUser.findById(decoded.userId);
        if (!user) return Error('User does not exist');
        let orders;
        if (order_id) {
            orders = await Order.find({_id: order_id});
        } else {
            orders = await Order.find({customer: user._id}).sort([['received_timestamp_UTC', 'descending']]);
        }

        return orders.map(order => {
            return transformOrder(order);
        });
    },
    updatePartialOrderStatus: async ({jwt_token, partialOrderId, newStatus}) => {
        const businessUser = await findUserService.findBusinessUserByJWT(jwt_token);
        if (businessUser.id === null) {
            return new Error("Business user was not found.")
        }
        const current_timestamp = new Date();
        const partialOrder = await findOrderService.findPartialOrderById(partialOrderId,current_timestamp);
        if (partialOrder === null) {
            return new Error("PartialOrder #" + partialOrderId + " was not found");
        }
        const updatedPartialOrder = await updateOrderStatus.updatePartialOrderStatus(partialOrder, newStatus,current_timestamp);
        const order = await findOrderService.findOrderByPartialOrder(updatedPartialOrder);
        await updateOrderStatus.updateOrderStatus(order, newStatus);
        return transformPartialOrderUpdate(partialOrder,order.shippingAddress);
    }
};
