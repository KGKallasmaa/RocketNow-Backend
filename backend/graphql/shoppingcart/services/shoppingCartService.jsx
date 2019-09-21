require('dotenv').config();


const cartSchemas = require('../models/shoppingcart');
const ShoppingCart = cartSchemas.ShoppingCart;

const goodSchemas = require('../../good/models/good');
const {findRegularUserByJWT} = require("../../user/services/findUser");
const CartGood = goodSchemas.CartGood;



const findExistingShoppingCartByJWT = async function findExsistingShoppingCartByJWT(jwt_token) {
    const user = await findRegularUserByJWT(jwt_token);
    const cartId = (user) ?  user.id: jwt_token;
    return await ShoppingCart.findOne({cart_identifier: cartId})
};

const findExistingShoppingCartByJWTorCreateNew = async function findExsistingShoppingCartByJWT(jwt_token) {
    const shoppingcart = await findExistingShoppingCartByJWT(jwt_token);
    if (!shoppingcart){
        const user = await findRegularUserByJWT(jwt_token);
        const cartId = (user) ?  user.id: jwt_token;
        const newShoppingcart = new ShoppingCart({
            cart_identifier:cartId,
            goods: [],
            success_id: Math.random().toString(36).substr(2, 9)
        });
        return await newShoppingcart.save();
    }
    return shoppingcart;
};

const addNonExcistingGoodToCart = async function addNonExcistingGoodToCart(shoppingcart,good,quanitity) {
    const new_shoppingCartGood = new CartGood({
        price_per_one_item: good.current_price,
        quantity: quanitity,
        good: good,
        shoppingcart: shoppingcart
    });
    shoppingcart.goods.push(await new_shoppingCartGood.save());
    return await shoppingcart.save();
};

const removeCartGoodFromShoppingCart = async function removeCartGoodFromShoppingCart(shoppingcart,cartGood) {
    await ShoppingCart.update(
        {_id: shoppingcart._id},
        {$pull: {goods: cartGood._id}}
    );
    await CartGood.remove(
        {_id: cartGood._id}
    );
};

module.exports = {
    findExistingShoppingCartByJWT: findExistingShoppingCartByJWT,
    addNonExcistingGoodToCart: addNonExcistingGoodToCart,
    findExistingShoppingCartByJWTorCreateNew:findExistingShoppingCartByJWTorCreateNew,
    removeCartGoodFromShoppingCart:removeCartGoodFromShoppingCart
};
