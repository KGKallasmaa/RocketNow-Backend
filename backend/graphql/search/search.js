require('dotenv').config();

const {transformGood} = require('../enchancer');

const good_schemas = require('../good/models/good');
const Good = good_schemas.Good;

const index_schema = require('./models');
const Index = index_schema.Index;

const stopwords = require('stopword');

async function rankGoods(all_goods){
   //todo develoop
   return  all_goods;
}
async function getGoods(query_array){
    //todo: implement synonym searching
    const allIndex_values = await Index.find({term:{"$in": query_array}}).select('pages -_id');

    let all_ids_array = Array();
    for (let i = 0; i < allIndex_values.length; i++) {
        all_ids_array.push.apply(all_ids_array,allIndex_values[i].pages);
    }
    const unique_pages = [...new Set(all_ids_array)];
    const allGood_values = await Good.find({'_id': {"$in":unique_pages}});
    return allGood_values;
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
    trending: async ({country}) => {
        //TODO: develop real funcionality. Use
        let goods = await Good.find();
        goods = goods.slice(0,3);

        return goods.map(good => {
            return transformGood(good);
        });
    },
    recommend: async ({jwt_token,nr}) => {
        //TODO: develop real funcionality. Use Recomendbee
        let goods = await Good.find();

        goods = goods.slice(0,nr);

        return goods.map(good => {
            return transformGood(good);
        });
    }
};
