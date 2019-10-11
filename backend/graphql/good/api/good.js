require('dotenv').config();
const {transformGood} = require('../../enchancer');

const good_schemas = require('../models/good');
const Good = good_schemas.Good;

const user_schemas = require('../../user/models/user');
const BusinessUser = user_schemas.BusinessUser;
const RegularUser = user_schemas.RegularUser;

const category_schemas = require('../../category/models/generalCategory');
const GeneralCategory = category_schemas.GeneralCategory;

const jwt = require('jsonwebtoken');


const stripe = require('stripe')(process.env.STRIPE_API_SECRET);
const client = require('algoliasearch')(process.env.ALGOLIA_API_KEY,process.env.ALGOLIA_ADMIN_KEY);
const index = client.initIndex('product');


module.exports = {
    addPhysicalGood: async args => {

        //Find the seller
        let decoded = jwt.decode(args.goodInput.seller_jwt_token, process.env.BUSINESS_JWT_KEY);
        //Check if the user_id is valid
        const seller = await BusinessUser.findById(decoded.userId);
        if (!seller) {
            return new Error('Seller does not exists.');
        }

        const general_category = await GeneralCategory.findOne({name: args.goodInput.general_category_name});
        if (!general_category) {
            return new Error('General category was not found');
        }
        //Check if seller already has a good with that name
        const good = await Good.findOne({title: args.goodInput.title, seller: seller,});
        if (good !== null) {
            return new Error("This seller already has a good with that name. It has id %s", good._id);
        }

        const custom_attribute_names = Array(args.goodInput.custom_attribute_1_name, args.goodInput.custom_attribute_2_name, args.goodInput.custom_attribute_3_name, args.goodInput.custom_attribute_4_name, args.goodInput.custom_attribute_5_name);
        const custom_attribute_values = Array(args.goodInput.custom_attribute_1_value, args.goodInput.custom_attribute_2_value, args.goodInput.custom_attribute_3_value, args.goodInput.custom_attribute_4_value, args.goodInput.custom_attribute_5_value);


        //Filtering values
        const filtered_custom_attribute_names = custom_attribute_names.filter(function (el) {
            return el != null;
        });

        const filtered_custom_attribute_values = custom_attribute_values.filter(function (el) {
            return el != null;
        });


        let millimeter_to_in = function millimeter_to_in(millimeter) {
            return Math.round((0.0393701 * millimeter) * 100) / 100;
        };

        let gram_to_oz = function gram_to_oz(gram) {
            return Math.round((0.035274 * gram) * 100) / 100;
        };

        let count = 0;
        const allGoods = await Good.find();
        if (allGoods) {
            count += allGoods.length;
        }

        //Add good to our database
        const new_good = new Good({
            nr: count + 1,
            title: args.goodInput.title,
            description: args.goodInput.description,
            quantity: +args.goodInput.quantity,
            current_price: +args.goodInput.listing_price,
            listing_price: +args.goodInput.listing_price,
            general_category: general_category._id,
            main_image_cloudinary_secure_url: args.goodInput.main_image_cloudinary_secure_url,
            other_images_cloudinary_secure_url: args.goodInput.other_images_cloudinary_secure_url,
            currency: args.goodInput.currency,
            seller: seller,
            height_in: millimeter_to_in(args.goodInput.height_mm),
            length_in: millimeter_to_in(args.goodInput.length_mm),
            width_in: millimeter_to_in(args.goodInput.width_mm),
            weight_oz: gram_to_oz(args.goodInput.weight_g),
        });


        if (custom_attribute_names.length === custom_attribute_values.length && (custom_attribute_values.length !== 0 && custom_attribute_names !== 0)) {
            new_good.custom_attribute_values = filtered_custom_attribute_values;
            new_good.custom_attribute_names = filtered_custom_attribute_names;
        }

        const result = await new_good.save();


        let image_array = [args.goodInput.main_image_cloudinary_secure_url];
        for (let index = 0; index < args.goodInput.other_images_cloudinary_secure_url.length; index++) {
            const element = args.goodInput.other_images_cloudinary_secure_url[index];
            image_array.push(element);
        }

        //Add product to Stripes database
        // const formated_title = new_good.title.split(' ').join('%');
        // const url = "http://rocketnow.eu/goods/" + new_good.nr + "/" + formated_title; TODO: add url
        const product = await stripe.products.create({
            id: new_good.id,
            name: new_good.title,
            type: 'good',
            description: new_good.description,
            package_dimensions: {
                height: result.height_in,
                length: result.length_in,
                weight: result.weight_oz,
                width: result.width_in
            },
            images: image_array,
            metadata: {
                SellerName: seller.businessname,
                SellerEmail: seller.email
            }
        });

        //TODO: debug
        /*
              const sku = await stripe.skus.create({
            id: new_good.id,
            product: product.id,
            image: args.goodInput.main_image_cloudinary_secure_url,
            price: Math.ceil(args.goodInput.current_price * 100),
            currency: (args.goodInput.currency).toLowerCase(),
            package_dimensions: {
                height: result.height_in,
                length: result.length_in,
                weight: result.weight_oz,
                width: result.width_in
            },
            inventory: {
                quantity: args.goodInput.quantity,
                type: "finite",
            }
        });
        console.log(sku);
         */
        const algoliaGood = [{
            _id: new_good._id,
            title: new_good.title,
            description: new_good.description,
            quantity: new_good.quantity,
            current_price: new_good.current_price,
            general_category: general_category.name,
            main_image_cloudinary_secure_url: new_good.main_image_cloudinary_secure_url,
            currency: new_good.currency,
            seller_displayname: seller.displayname,
            height_mm: args.goodInput.height_mm,
            length_mm: args.goodInput.length_mm,
            width_mm: args.goodInput.width_mm,
            weight_g: args.goodInput.weight_g,
        }];

        for (let i = 0; i < custom_attribute_names.length ; i++) {
            algoliaGood[custom_attribute_names[i]] = custom_attribute_values[i];
        }

        index.addObjects(algoliaGood, (err, content) => {
            console.log(`Problem adding good #${algoliaGood._id} to Algolia`);
        });


        console.log("New good #" + result.id + " was successfully added to the db");
        return transformGood(result);

    },
    individualGood: async ({nr, jwt_token}) => {
        const good = await Good.findOne({nr: nr});
        if (!good) {
            return Error("Good was not found");
        }
        //TODO: integrate reccomendations
        return transformGood(good);
    },
    businessUserGoods: async ({nr, displayname}) => {
        const user = await BusinessUser.findOne({nr: nr, displayname: displayname});
        if (!user) {
            return Error('This business does not exist');
        }
        const goods = await Good.find({seller: user});

        return goods.map(good => {
            return transformGood(good);
        });
    }
};