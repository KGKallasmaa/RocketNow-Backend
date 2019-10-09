const userResolver = require('./user/api/user');
const goodResolver = require('./good/good');
const searchResolver = require('./search/api/search');
const shoppingcartResolver = require('./shoppingcart/shoppingcart');
const categoryResolver = require('./category/api/category');
const warehouseResolver = require('./warehouse/api/warehouse');
const orderResolver = require('./order/order');
const shippingResolver = require('./shipping/shipping');


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
