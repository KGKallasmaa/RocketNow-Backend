require('dotenv').config();

const address_schema = require('../models/address');
const order_schema = require('../../order/models/order');

const makeShippingAddressDefault = async function makeShippingAddressDefault(user_id, location_id) {
    //Set old locations as not default
    const orders = await order_schema.Order.find({customer: user_id}).select('shippingAddress -_id');
    const ids = [];
    for (let i = 0; i < orders.length; i++) {
        if (orders[i].shippingAddress !== location_id) {
            ids[i] = orders[i].shippingAddress;
        }
    }
    //Set old locations as not default
    await address_schema.OrderAddress.updateMany(
        {_id: {$in: ids}},
        {$set: {"isDefault": false}},
        {multi: true}
    );
    //Set new locations as default
    await address_schema.OrderAddress.updateOne(
        {_id: location_id},
        {$set: {"isDefault": true}}
    );
    console.log("Regular user #"+user_id+" set order address #"+location_id+" as new default shipping address.");
    const result = await address_schema.OrderAddress.findById(location_id);
    return result.isDefault === true;
};
const makeShippingLocationNotActive = async function makeShippingLocationNotActive(user_id, location_id) {
    //Set new locations as not active
    await address_schema.OrderAddress.updateOne(
        {_id: location_id},
        {$set: {"isActive": false}}
    );
    console.log("Regular user #"+user_id+" set wants order address #"+location_id+" not to be shown.");
    const result = await address_schema.OrderAddress.findById(location_id);
    return result.isActive === false;
};


module.exports = {
    'makeShippingAddressDefault': makeShippingAddressDefault,
    'makeShippingLocationNotActive': makeShippingLocationNotActive,
};
