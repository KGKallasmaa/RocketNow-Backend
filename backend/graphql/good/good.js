require('dotenv').config();

const {transformGood} = require('../enchancer');

const good_schemas = require('./models/good');
const Good = good_schemas.Good;

const user_schemas = require('../user/models/user');
const BusinessUser = user_schemas.BusinessUser;
const RegularUser = user_schemas.RegularUser;

const category_schemas = require('../category/models/category');
const GeneralCategory = category_schemas.GeneralCategory;

const index_schema = require('../search/models');
const Index = index_schema.Index;

const jwt = require('jsonwebtoken');
const stopwords = require('stopword');


const stripe = require('stripe')(process.env.STRIPE_API_SECRET);





function get_keywords(title, description, general_category_name, seller_name) {
    let titles_as_array = stopwords.removeStopwords(title.split(" ").join('|').toLowerCase().split('|').filter(n => n));
    //TODO: get meaningful keywords
    return titles_as_array;
}


module.exports = {
    addPhysicalGood: async args => {
        try {
            //Find the seller
            const KEY = process.env.BUSINESS_JWT_KEY;
            let decoded = jwt.decode(args.goodInput.seller_jwt_token, KEY);
            //Check if the user_id is valid
            const seller = await BusinessUser.findById(decoded.userId);
            if (!seller) {
                throw new Error('Seller does not exists.');
            }
            const general_category = await GeneralCategory.findOne({name: args.goodInput.general_category_name});
            if (!general_category) {
                throw new Error('General category was not found');
            }
            //Check if seller already has a good with that name
            const good = await Good.findOne({title: args.goodInput.title, seller: seller,});
            if (good !== null) {
                throw new Error("This seller already has a good with that name. It has id %s", good._id);
            }

            const keywords = get_keywords(args.goodInput.title, args.goodInput.description, general_category.name, seller.name);
            //TODO: extract meaningful keywords

            //Goods have a cloudinary prefix "good_pictures/"
            const reformatted_main_image_cloudinary_id = "good_pictures/" + args.goodInput.main_image_cloudinary_public_id;

            //TODO: implement map funcion
            let reformatted_other_images_array = Array();
            for (let index = 0; index < args.goodInput.other_images_cloudinary_public_id.length; index++) {
                const element = "good_pictures/" + args.goodInput.other_images_cloudinary_public_id[index];
                reformatted_other_images_array.push(element);
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


            //Add good to our database
            const new_good = new Good({
                nr:await Good.find().length+1,
                title: args.goodInput.title,
                description: args.goodInput.description,
                quantity: +args.goodInput.quantity,
                booked: 0, //When the good is added then no orders have been made
                current_price: +args.goodInput.current_price,
                listing_price: +args.goodInput.listing_price,
                listing_timestamp: +parseInt(args.goodInput.listing_timestamp, 10),
                general_category: general_category._id,
                main_image_cloudinary_public_id: reformatted_main_image_cloudinary_id,
                main_image_cloudinary_secure_url: args.goodInput.main_image_cloudinary_secure_url,
                other_images_cloudinary_public_id: reformatted_other_images_array,
                currency: args.goodInput.currency,
                seller: seller,
                height_in: millimeter_to_in(args.goodInput.height_mm),
                length_in: millimeter_to_in(args.goodInput.length_mm),
                width_in: millimeter_to_in(args.goodInput.width_mm),
                weight_oz: gram_to_oz(args.goodInput.weight_g),
            });

//TODO: add past data to mongo


            if (custom_attribute_names.length === custom_attribute_values.length && (custom_attribute_values.length !== 0 && custom_attribute_names !== 0)) {
                new_good.custom_attribute_values = filtered_custom_attribute_values;
                new_good.custom_attribute_names = filtered_custom_attribute_names;
            }

            const result = await new_good.save();

            // Add Good information to the Search Index
            for (let i = 0; i < keywords.length; i++) {
                const current_keyword = keywords[i];
                let current_index_value = await Index.findOne({term: current_keyword});
                //Is this keyword in the index?
                if (current_index_value) {
                    //Add a new page to that keyword
                    current_index_value.pages.push(result);
                    current_index_value.save();
                } else {
                    const new_index_entry = new Index({
                        term: current_keyword,
                        pages: Array(result)
                    });
                    new_index_entry.save();
                }
            }

            let image_array = [args.goodInput.main_image_cloudinary_secure_url];
            //TODO:add one line solution
            for (let index = 0; index < args.goodInput.other_images_cloudinary_secure_url.length; index++) {
                const element = args.goodInput.other_images_cloudinary_secure_url[index];
                image_array.push(element);
            }

            //Add product to Stripes database
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
            console.log("Product" + JSON.stringify(product));

            //Addding sku infonormation
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
            console.log("sku:" + JSON.stringify(sku));

            return transformGood(result);
        } catch
            (err) {
            throw err;
        }
    },
    individualGood: async ({nr,jwt_token}) => {
        const good = await Good.findOne({nr:nr});
        if (!good){
            return Error("Good was not found");
        }
        //TODO: integrate reccomendations
        return transformGood(good);
    },
    businessUserGoods: async ({nr,businessname}) => {
        const user = await BusinessUser.findOne({nr:nr,businessname:businessname});
        if (!user) {
            return Error('This business does not exist');
        }
        const goods= await Good.find({seller:user});

        return goods.map(good => {
            return transformGood(good);
        });
    }
};