const user_schemas = require('../../models/user');
const good_schemas = require('../../models/good');

const category_schemas = require('../../models/category');
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
const transformOrder = order => {
    try {
        return {
            ...order._doc,
            fulfillers: transformOrderBusinessUsers.bind(this, order.fulfillers),
            _id:order.id,
            order_items: order_items.bind(this, order.order_items)
        };
    } catch (error) {
        throw error
    }
}
const order_items = async orderItems => {
    try {
        if (orderItems.length === 0) {
            throw new Error ("Order can't be empty")
        }
        return orderItems.map(ordergood => {
            return transformOrderGood(ordergood);
        });
    } catch (err) {
        throw err;
    }
};
const transformOrderGood = async ordergood => {
    try {
         return {
             ...ordergood._doc,
             _id:ordergood.id,
         };
    } catch (error) {
        throw new error
    }
}
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