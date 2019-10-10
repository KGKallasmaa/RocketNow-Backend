require('dotenv').config();


const cartSchemas = require('../models/shoppingcart');
const ShoppingCart = cartSchemas.ShoppingCart;

const goodSchemas = require('../../good/models/good');
const findUser = require("../../user/services/findUser.jsx");
const CartGood = goodSchemas.CartGood;
const Good = goodSchemas.Good;


function getCartId(user, jwt_token) {
    let cartId = undefined;
    if (user.id === undefined) {
        cartId = jwt_token;
    } else {
        cartId = user.id;
    }
    return cartId
}

const findExistingShoppingCartByJWT = async function findExsistingShoppingCartByJWT(jwt_token) {
    const user = await findUser.findRegularUserByJWT(jwt_token);
    const cartId = getCartId(user, jwt_token);
    return await ShoppingCart.findOne({cart_identifier: cartId})
};

const findExistingShoppingCartByJWTorCreateNew = async function findExsistingShoppingCartByJWT(jwt_token) {
    const shoppingcart = await findExistingShoppingCartByJWT(jwt_token);
    if (shoppingcart == null) {
        const user = await findUser.findRegularUserByJWT(jwt_token);
        const cartId = getCartId(user, jwt_token);
        const newShoppingcart = new ShoppingCart({
            cart_identifier: cartId,
            goods: [],
            success_id: Math.random().toString(36).substr(2, 9)
        });
        return await newShoppingcart.save();
    }
    return shoppingcart;
};

const addNonExcistingGoodToCart = async function addNonExcistingGoodToCart(shoppingcart, good, quanitity) {
    const new_shoppingCartGood = new CartGood({
        price_per_one_item: good.current_price,
        quantity: quanitity,
        good: good,
        shoppingcart: shoppingcart
    });
    shoppingcart.goods.push(await new_shoppingCartGood.save());
    return await shoppingcart.save();
};

const removeCartGoodFromShoppingCart = async function removeCartGoodFromShoppingCart(shoppingcart, cartGood) {
    await ShoppingCart.update(
        {_id: shoppingcart._id},
        {$pull: {goods: cartGood._id}}
    );
    await CartGood.remove(
        {_id: cartGood._id}
    );
    if (shoppingcart.goods.length === 0){
        deleteShoppingCartByCartId(shoppingcart.cart_identifier);
    }
};
const deleteShoppingCartByCartId = async function deleteShoppingCartByCartId(cartId) {
    const shoppingCart = await ShoppingCart.findOne({cart_identifier: cartId});
    CartGood.remove(
        {shoppingcart: shoppingCart._id}
    );
    ShoppingCart.remove(
        {cart_identifier: cartId}
    );
};

const updateCartGoodQuantity = async function (shoppingcart, good, extraQuantity) {
    const cartgood = await CartGood.findOne({
        shoppingcart: shoppingcart,
        good: good
    });
    if (cartgood) {
        const quanitityAvailable = Math.max(good.quantity - good.booked, 0);
        const proposedQuantity = cartgood.quantity + extraQuantity;
        const new_quantity = Math.min(proposedQuantity, quanitityAvailable);
        if (new_quantity === 0) {
            await removeCartGoodFromShoppingCart(shoppingcart, cartgood);
        } else {
            await CartGood.update(
                {_id: cartgood._id},
                {$set: {"quantity": new_quantity}}
            )
        }
        return shoppingcart;
    }
    return await addNonExcistingGoodToCart(shoppingcart, good, extraQuantity);
};

const mergePreLoginShoppingCartWithExcistingShoppingCart = async function mergePreLoginShoppingCartWithExcistingShoppingCart(userId, old_cart_id) {
    const pre_login_shoppingcart = await ShoppingCart.findOne({"cart_identifier": old_cart_id});
    if (pre_login_shoppingcart !== null) {
        for (let i = 0; i < pre_login_shoppingcart.goods.length; i++) {
            const cartgood = await CartGood.findById(pre_login_shoppingcart.goods[i]);
            const good = await Good.findById(cartgood.good);
            await addToCart(userId,good,cartgood.quantity);
        }
        deleteShoppingCartByCartId(old_cart_id);
    }
    const main_shoppingcart = await ShoppingCart.findOne({"cart_identifier": userId});
    if (main_shoppingcart == null && pre_login_shoppingcart == null) {
        return true;
    }
    return main_shoppingcart;
};


const addToCart = async function addToCart(cart_identifier,good,quantity){
    const shoppingcart = await findExistingShoppingCartByJWTorCreateNew(cart_identifier);
    if (shoppingcart.goods.length === 0) {
        return await addNonExcistingGoodToCart(shoppingcart,good,quantity);
    }
    return await updateCartGoodQuantity(shoppingcart,good,quantity);
};


module.exports = {
    addToCart:addToCart,
    findExistingShoppingCartByJWT:findExistingShoppingCartByJWT,
    mergePreLoginShoppingCartWithExcistingShoppingCart: mergePreLoginShoppingCartWithExcistingShoppingCart,
    findExistingShoppingCartByJWTorCreateNew: findExistingShoppingCartByJWTorCreateNew,
};
