const user_schemas = require('./user/models/user');
const good_schemas = require('./good/models/good');
const address_schemas = require('./shipping/models/address');
const shipping_schemas = require('./shipping/models/shipping');

const category_schemas = require('./category/models/category');
const GeneralCategory = category_schemas.GeneralCategory;


/*
Users
*/
const user = async userId => {
    try {
        const user = await user_schemas.RegularUser.findById(userId);
        return {
            ...user._doc,
            _id: user.id,
        };
    } catch (err) {
        throw err;
    }
};

const businessuser = async userId => {
    try {
        const user = await user_schemas.BusinessUser.findById(userId);
        return {
            ...user._doc,
            _id: user.id,
        };
    } catch (err) {
        throw err;
    }
};

/*
Goods
*/
const transformGood = async good => {
    const this_general_category = await GeneralCategory.findById(good.general_category);
    return {
        ...good._doc,
        _id: good.id,
        general_category: transformGeneralCategory.bind(this, this_general_category),
        seller: businessuser.bind(this, good.seller)
    }
};

/*
Categories
*/
const transformGeneralCategory = category => {
    return {
        ...category._doc,
        _id: category.id,
    };
};

/*
Order
*/
const transformOrder = async order => {
    return {
        ...order._doc,
        _id: order._id,
        customer: user.bind(this, order.customer._id),
        fulfillers: transformOrderBusinessUsers.bind(this, order.fulfillers),
        partial_orders: transformPartialOrders.bind(this, order.partial_orders),
        order_items: order_items.bind(this, order.order_items),
        shippingAddress: transformShippingAddress.bind(this, order.shippingAddress)
    };
};
const transformShippingAddress = async shippingAddressID => {
    const address = await address_schemas.OrderAddress.findById(shippingAddressID);
    if (address.shippingMethod ==='AddressDelivery') {
        return {
            ...address._doc,
            parcelDeliveryLocation: null,
            _id: address.id,
        };
    }
    return {
        ...address._doc,
        parcelDeliveryLocation: transformPartialDeliveryLocation.bind(this, address.parcelDeliveryLocation),
        _id: address.id,
    };
};
const transformPartialDeliveryLocation = async parcelDeliveryLocationID => {
    const parcelDeliveryLocation = await shipping_schemas.ParcelDeliveryLocation.findById(parcelDeliveryLocationID);
    return {
        ...parcelDeliveryLocation._doc,
        _id: parcelDeliveryLocation.id,
    };
};

const transformPartialOrders = async partialOrders => {
    return partialOrders.map(partialOrder => {
        return transformPartialOrder(partialOrder);
    });
}
const transformPartialOrder = async partialOrder => {
    return {
        ...partialOrder._doc,
        _id: partialOrder.id,
    };
};

const order_items = async orderItems => {
    return orderItems.map(good => {
        return transformOrderGood(good);
    });
};
const transformOrderGood = async ordergoodID => {
    const ordergood = await good_schemas.OrderGood.findById(ordergoodID);
    return {
        ...ordergood._doc,
        _id: ordergood.id,
    };
};

const transformOrderBusinessUsers = async sellers => {
    try {
        if (sellers.length === 0) {
            throw new Error("Every order needs a business user")
        }
        return sellers.map(seller => {
            return businessuser(seller)
        });
    } catch (err) {
        throw err;
    }
}

/*
Shopping cart
*/
//1.
const transformShoppingCart = cart => {
    try {
        return {
            ...cart._doc,
            _id: cart.id,
            goods: cart_goods.bind(this, cart.goods)
        };
    } catch (err) {
        throw err;
    }
};
//2.
const cart_goods = async cartGoods => {
    try {
        if (cartGoods.length === 0) {
            return [];
        }
        return cartGoods.map(good => {
            return transformCartGood(good);
        });
    } catch (err) {
        throw err;
    }
};

//3.
const transformCartGood = async cartgood => {
    try {
        const the_cart_good = await good_schemas.CartGood.findById(cartgood);
        return {
            ...the_cart_good._doc,
            _id: the_cart_good.id,
            good: transformGoodForCart.bind(this, the_cart_good.good)
        };
    } catch (err) {
        throw err;
    }
};
//4.
const transformGoodForCart = async good => {
    try {
        const the_good = await good_schemas.Good.findById(good._id);
        return {
            ...the_good._doc,
            _id: the_good.id,
            seller: businessuser.bind(this, the_good.seller)
        };
    } catch (err) {
        throw err;
    }
};

exports.transformGood = transformGood;
exports.transformGeneralCategory = transformGeneralCategory;
exports.transformShoppingCart = transformShoppingCart;
exports.user = user;
exports.businessuser = businessuser;
exports.transformOrder = transformOrder;