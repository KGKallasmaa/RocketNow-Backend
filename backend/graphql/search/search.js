require('dotenv').config();

const {transformGood} = require('../enchancer');

const good_schemas = require('../good/models/good');
const Good = good_schemas.Good;

const generalCategorySchemas = require('../category/models/generalCategory');
const GeneralCategory = generalCategorySchemas.GeneralCategory;

const index_schema = require('./models');
const Index = index_schema.Index;

const stopwords = require('stopword');

const cart_schemas = require('../shoppingcart/models/shoppingcart')
const ForexRate = cart_schemas.ForexRate;


const axios = require('axios');


async function getForexData(sourceCurrency) {
    const KEY = sourceCurrency + "_EUR";
    const URL = "https://free.currconv.com/api/v7/convert?q=" + KEY + "&compact=ultra&apiKey=" + process.env.FREE_FOREX_API_KEY;
    return await axios.get(URL).then(response => {
            console.log("Forex rate for " + sourceCurrency + "/EUR was updated ");
            return response.data[KEY];
        }
    ).catch(error => {
        return Error("Error accessing Forex data " + error)
    });
}


async function rankGoods(all_goods) {
//todo
    return all_goods;
}

async function convertToEUR(currency, price) {
    if (currency === "EUR") return price;
    /*
    Forex rates are provided by FreeForexApi. In an hour we can make 100 requests. Currently we support EUR,USD,RUB and GBP. Forex rates are updated at maximum every 1.8 minutes ( 60/ (100/3))
     */
    const currentRate = await ForexRate.findOne({source: currency, target: "EUR"});
    if (!currentRate) {
        const newForex = new ForexRate({
            source: currency,
            rate: Number(await getForexData(currency))
        });
        const result = await newForex.save();
        return Math.round(100 * (result.rate * price));
    }
    const oldestAcceptableUpdateTime = new Date(Date.now() - 1000 * 60 * 1.8);//1.8 minutes
    if (parseInt(currentRate.lastUpdateTime_UTC) < oldestAcceptableUpdateTime) {
        await ForexRate.update(
            {_id: currentRate._id},
            {
                $set: {
                    "rate": await getForexData(currency),
                    "lastUpdateTime_UTC": new Date().getTime()
                }
            }
        );
    }
    return Math.floor(Math.round(100 * (currentRate.rate * price))) / 100;
}


function sortCategoryByQuantity(dict) {
    let items = Object.keys(dict).map(function (key) {
        return [key, dict[key]];
    });
    items.sort(function (first, second) {
        return second[1] - first[1];
    });
    for (let i = 0; i < Object.keys(items).length; i++) {
        const value = items[Object.keys(items)[i]];
        items[i] = value[0].toString();
    }
    return items;
}


function mapNumbericAtributes(dict) {
    let returnArray = [];
    const keys = Object.keys(dict);

    for (let i = 0; i < keys.length; i++) {
        const name = keys[i];
        const values = dict[name].map(Number);
        const min = Math.min.apply(null, values).toString();
        const max = Math.max.apply(null, values).toString();
        const toBeAdded = [name, min, max];
        if (returnArray.length === 0) {
            returnArray = toBeAdded;
        } else {
            returnArray = returnArray.concat(toBeAdded);
        }
    }
    return returnArray;
}

function sortNonQuanitativeDictByAlphabet(dict) {
    let returnArray = [];
    const keys = Object.keys(dict);
    for (let i = 0; i < keys.length; i++) {
        const key = "#" + keys[i];
        const sorterValues = Array.from([...new Set(dict[keys[i]].sort())]);
        if (returnArray.length === 0) {
            returnArray = [key, ...sorterValues];
        } else {
            returnArray = returnArray.concat([key, ...sorterValues]);
        }
    }
    return returnArray;
}


async function getGoods(query_array) {
    //todo: implement synonym searching
    const allIndex_values = await Index.find({term: {"$in": query_array}}).select('pages -_id');

    let all_ids_array = Array();
    for (let i = 0; i < allIndex_values.length; i++) {
        all_ids_array.push.apply(all_ids_array, allIndex_values[i].pages);
    }
    const unique_pages = [...new Set(all_ids_array)];
    return await Good.find({'_id': {"$in": unique_pages}});
}

module.exports = {
    autocomplete: async ({query}) => {
        //TODO
        const goods = await Good.find({}).select('title');
        // TODO: add category info
        return goods.map(good => {
            return transformGood(good);
        });
    },
    search: async args => {
        //0. Get all funcion inputs
        const query = args.searchInput.query;
        const page_nr = args.searchInput.page_nr;
        /*
        1. Reformat the query -> make it lowercase and remove stopwords
        */
        let query_array = [...new Set(stopwords.removeStopwords(query.split(" ").join('|').toLowerCase().split('|')).filter(n => n))];
        /*
        2. Find goods who's keywords contain at least one word from the query_array
        */
        let all_goods = await getGoods(query_array);
        /*
        Final step: return the ranked goods to the user
        */
        all_goods = await rankGoods(all_goods);

        return all_goods.map(good => {
            return transformGood(good);
        });
    },
    trending: async () => {
        //TODO: develop real funcionality. Use
        let goods = await Good.find();
        goods = goods.slice(0, 3);

        return goods.map(good => {
            return transformGood(good);
        });
    },
    bestselling: async ({nr}) => {
        //TODO: develop real funcionality. Use
        let goods = await Good.find();
        goods = goods.slice(0,nr);

        return goods.map(good => {
            return transformGood(good);
        });
    },
    recommend: async ({jwt_token, nr}) => {
        //TODO: develop real funcionality. Use Recomendbee
        let goods = await Good.find();

        goods = goods.slice(0, nr);

        return goods.map(good => {
            return transformGood(good);
        });
    },
    refine: async ({query}) => {
        let query_array = [...new Set(stopwords.removeStopwords(query.split(" ").join('|').toLowerCase().split('|')).filter(n => n))];

        let goods = await getGoods(query_array);

        let categories = {};
        let minPrice = Number.MAX_SAFE_INTEGER;
        let maxPrice = 0;

        let numbericRefinements = {};
        let nonNumbericRefinements = {};

        for (let i = 0; i < goods.length; i++) {
            const element = goods[i];
            const generalCategory = await GeneralCategory.findById(element.general_category);
            //Categories
            if (generalCategory.name in categories) {
                categories[generalCategory.name] = categories[generalCategory.name] + 1;
            } else {
                categories[generalCategory.name] = 1;
            }
            //Price
            let price = await convertToEUR(element.currency, element.current_price * (1 + generalCategory.tax));
            price = Math.ceil(100 * price) / 100;
            if (price < minPrice) {
                minPrice = price
            }
            if (price > maxPrice) {
                maxPrice = price
            }

            //Custom attribute names and values
            for (let j = 0; j < element.custom_attribute_names.length; j++) {
                const name = element.custom_attribute_names[j];
                const value = element.custom_attribute_values[j];
                const isNumber = function isNumeric(value) {
                    const isNr = /^-{0,1}\d+$/.test(value);
                    if (isNr) {
                        return value < 1000000 // breventing serial nr from rendering as nr
                    }
                    ;
                    return false
                };
                switch (isNumber(value)) {
                    case false:
                        if (name in nonNumbericRefinements) {
                            nonNumbericRefinements[name] = nonNumbericRefinements[name].concat([value]);

                        } else {
                            nonNumbericRefinements[name] = [value];
                        }
                        break;
                    case true:
                        if (name in numbericRefinements) {
                            numbericRefinements[name] = numbericRefinements[name].concat([value]);
                        } else {
                            numbericRefinements[name] = [value];
                        }
                        break;
                }
            }
        }
        return {
            total: goods.length,
            minPrice: minPrice,
            maxPrice: maxPrice,
            categories: sortCategoryByQuantity(categories), // CategoryName1,Quanity1,CategoryName2,Quantity2,...
            numbericRefinements: mapNumbericAtributes(numbericRefinements), //RefinmentName1, minPrice1,maxPrice1, RefinementName2, ...
            nonNumbericRefinements: sortNonQuanitativeDictByAlphabet(nonNumbericRefinements),// #Attribute1,[quanitiy]attribute,#Attribute2
        };
    },
};
