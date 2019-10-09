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

module.exports = {
    'getRelevantGoodIdsFromAlgolia': getRelevantGoodIdsFromAlgolia,
};

