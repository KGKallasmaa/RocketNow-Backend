const userResolver = require('./user/api/user');
const goodResolver = require('./good/api/good');
const searchResolver = require('./search/api/search');
const emailResolver = require('./email/api/email');
const shoppingcartResolver = require('./shoppingcart/api/shoppingcart');
const categoryResolver = require('./category/api/category');
const warehouseResolver = require('./warehouse/api/warehouse');
const orderResolver = require('./order/api/order');
const shippingResolver = require('./shipping/api/shipping');
const estimateResolver =require('./estimate/api/estimate');


const rootResolver = {
  ...userResolver,
  ...goodResolver,
  ...emailResolver,
  ...shoppingcartResolver,
  ...categoryResolver,
  ...searchResolver,
  ...warehouseResolver,
  ...orderResolver,
  ...estimateResolver,
  ...shippingResolver
};

module.exports = rootResolver;
