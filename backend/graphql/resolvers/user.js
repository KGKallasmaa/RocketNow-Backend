require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const user_schemas = require('../../models/user');
const BusinessUser = user_schemas.BusinessUser;
const RegularUser = user_schemas.RegularUser;

const cart_schemas = require('../../models/shoppingcart');
const ShoppingCart = cart_schemas.ShoppingCart;

const good_schemas = require('../../models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;

const shoppingcartResolver = require('./shoppingcart');
const {transformShoppingCart} = require('./merge');


//Helper function
async function addGoodsFromPreLoginToMain(userId, pre_login_shoppingcartId) {
    const pre_login_shoppingcart = await ShoppingCart.findOne({"cart_identifier": pre_login_shoppingcartId});
    let do_be_deleted_cartgoods_array = [];

    for (let i = 0; i < pre_login_shoppingcart.goods.length; i++) {
        const cartgood = await CartGood.findById(pre_login_shoppingcart.goods[i]);

        const quantity = cartgood.quantity;
        const good_id = cartgood.good;


        //Using an exsisting method, defined in shoppingcart resolvers
        const response = await shoppingcartResolver.addToCart({
            cart_identifier: userId,
            good_id: good_id,
            quantity: quantity
        });
        do_be_deleted_cartgoods_array.push(cartgood._id);
    }
    //Delete the old cartgoods
    for (let i = 0; i < do_be_deleted_cartgoods_array.length ; i++) {
        await CartGood.remove(
            {_id: do_be_deleted_cartgoods_array[i]}
        );
    }

    //Delete the old shoppingcart
    await ShoppingCart.remove(
        {_id: pre_login_shoppingcart._id}
    );

    const main_shoppingcart = await ShoppingCart.findOne({"cart_identifier": userId});

    return main_shoppingcart;
}

async function UpdateShoppingCart(userId, old_cart_id) {
    const pre_login_shoppingcart = await ShoppingCart.findOne({"cart_identifier": old_cart_id}).select('goods');
    const main_shoppingcart = await ShoppingCart.findOne({"cart_identifier": userId});

    //1. Does the user have a pre_login_cart problem do worry about?
    if (!pre_login_shoppingcart) {
        //1.1 Does the user have a main shoppingcart?
        if (main_shoppingcart) {
            return main_shoppingcart;
        }
        //return true -> evrythings i ok with the user
        return true;

    }
    //2.Add goods from pre_login cart to the main shopping cart. Then delete the pre login shoppingcart. Using an existing method, defined in shoppingcart resolvers file, to do it more effectively.
    return await addGoodsFromPreLoginToMain(userId, old_cart_id)
}

module.exports = {
    createUser: async args => {
        try {
            const existingUser = await RegularUser.findOne({email: args.userInput.email});
            if (existingUser) {
                throw new Error('User exists already.');
            }
            const hashedPassword = await bcrypt.hash(args.userInput.password, 12);

            //Create new user
            const user = new RegularUser({
                fullname: args.userInput.fullname,
                email: args.userInput.email,
                password: hashedPassword
            });
            const result = await user.save();
            return {...result._doc, password: null, _id: result.id};
        } catch (err) {
            throw err;
        }
    },
    individualUser: async ({jwt_token}) => {
       // console.log("111111")
        //Find user
        const KEY = process.env.PERSONAL_JWT_KEY;
        let decoded = jwt.decode(jwt_token, KEY);

        //Check if the user_id is valid
        const user = await RegularUser.findById(decoded.userId);
        if (!user) {
            throw new Error('JWT was not decoded properly');
        }
        return {...user._doc, password: null, _id: user.id};

    },
    login: async ({email, password, old_cart_id}) => {
        //1. Validate the email and password are correct
        const user = await RegularUser.findOne({email: email});
        if (!user) throw new Error('User does not exist!');

        const pw_is_correct = await bcrypt.compare(password, user.password);

        if (!pw_is_correct) throw new Error('Password is not correct.');

        //2. Add product that the user has added as an incognito user to their shoppingcart

        //TODO: debug shoppingcart merges

        const result = await UpdateShoppingCart(user.id, old_cart_id);

        if (!result) throw new Error('Shoppingcart was not found correctly');
      //  console.log("response from shoppingcart f." + result);


        //3. Return a token
        const KEY = process.env.PERSONAL_JWT_KEY;

        const current_time = new Date().getTime();
        const expires_in = 3600000; //expires in one hour

        const expiresIn_as_String = (current_time + expires_in).toString();
        const token = jwt.sign({userId: user.id, email: user.email}, KEY, {expiresIn: expiresIn_as_String});

        return {userId: user.id, token: token, tokenExpiration: (expiresIn_as_String)};
    },
    createBusinessUser: async args => {
        try {
            const existingUser = await BusinessUser.findOne({
                email: args.userInput.email
            });

            if (existingUser) throw new Error('BusinessUser exists already.');

            const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
            const user = new BusinessUser({
                businessname: args.userInput.businessname,
                email: args.userInput.email,
                password: hashedPassword
            });
            const result = await user.save();
            return {
                ...result._doc,
                password: null,
                _id: result.id
            };
        } catch (err) {
            throw err;
        }
    },
    businessLogin: async ({email, password}) => {
        //1. Validate the email and password are correct
        const user = await BusinessUser.findOne({
            email: email
        });

        if (!user) throw new Error('BusinessUser does not exist!');

        const pw_is_correct = await bcrypt.compare(password, user.password);
        if (!pw_is_correct) throw new Error('BusinessPassword is not correct.');
        //2. Return a token
        const KEY = process.env.BUSINESS_JWT_KEY;
        const current_time = new Date().getTime();
        const expires_in = 3600000; //expires in one hour

        const token = jwt.sign({
            userId: user.id,
            email: user.email
        }, KEY, {
            expiresIn: expires_in + current_time
        });
        return {
            userId: user.id,
            token: token,
            tokenExpiration: expires_in + current_time
        };
    }
};
