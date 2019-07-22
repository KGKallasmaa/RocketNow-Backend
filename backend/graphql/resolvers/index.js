const userResolver = require('./user');
const goodResolver = require('./good');
const searchResolver = require('./search');
const shoppingcartResolver = require('./shoppingcart');
const categoryResolver = require('./category');
const warehouseResolver = require('./warehouse');
const orderResolver = require('./order');
const shippingResolver = require('./shipping');


const rootResolver = {
  ...userResolver,
  ...goodResolver,
  ...shoppingcartResolver,
  ...categoryResolver,
  ...searchResolver,
  ...warehouseResolver,
  ...orderResolver,
  ...shippingResolver
};

module.exports = rootResolver;
