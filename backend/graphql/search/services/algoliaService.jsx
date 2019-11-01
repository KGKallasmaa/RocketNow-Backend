require('dotenv').config();

const client = require('algoliasearch')(process.env.ALGOLIA_API_KEY, process.env.ALGOLIA_ADMIN_KEY);
const index = client.initIndex('product');

const getRelevantGoodIdsFromAlgolia = async function getRelevantGoodIdsFromAlgolia(query) {
    return index.search({ query: query}).then(({ hits } = {}) => {
            let listOfGoodIds = [];
            for (let i = 0; i < hits.length; i++) {
                let id = hits[i].id;
                if (id === undefined) {
                    id = hits[i]._id
                }
                listOfGoodIds.push(id);
            }
            return listOfGoodIds;
        }).catch(() => {
            return new Error("Problem fetching the refinements");
    });
};

const addNewGoodToAlgolia = async function addNewGoodToAlgolia(new_good,seller,height,length,width,weight,custom_attribute_names,custom_attribute_values) {
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
        height_mm:height,
        length_mm:length,
        width_mm:width,
        weight_g:weight,
    }];

    for (let i = 0; i < custom_attribute_names.length ; i++) {
        algoliaGood[custom_attribute_names[i]] = custom_attribute_values[i];
    }

    index.addObjects(algoliaGood, (err, content) => {
        console.log(`Problem adding good #${algoliaGood._id} to Algolia`);
        return false;
    });
    return true;
};

module.exports = {
    'getRelevantGoodIdsFromAlgolia': getRelevantGoodIdsFromAlgolia,
    'addNewGoodToAlgolia':addNewGoodToAlgolia
};

