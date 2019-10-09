require('dotenv').config();

const {transformGood} = require('../../enchancer');

const good_schemas = require('../../good/models/good');
const Good = good_schemas.Good;

const algoliaService = require('../services/algoliaService.jsx');

function sortCustomAttributes(elements) {
    return elements.filter((key, idx) => elements.lastIndexOf(key) === idx).sort((a, b) => a < b ? -1 : 1);
}


function isNumber(n) {
    return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}

module.exports = {
    search: async ({query}) => {
        const goodIds = await algoliaService.getRelevantGoodIdsFromAlgolia(query);
        const goods = await Good.find({_id: {$in: goodIds}});
        let quanitativeAttributes = [];
        let nonQuanitativeAttributes = [];
        for (let i = 0; i < goods.length; i++) {
            for (let j = 0; j < goods[i].custom_attribute_values.length; j++) {
                if (isNumber(goods[i].custom_attribute_values[j])) {
                    quanitativeAttributes.push(goods[i].custom_attribute_names[j])
                } else {
                    nonQuanitativeAttributes.push(goods[i].custom_attribute_names[j])
                }
            }
        }
        quanitativeAttributes = sortCustomAttributes(quanitativeAttributes);
        nonQuanitativeAttributes = sortCustomAttributes(nonQuanitativeAttributes);
        return {
            numericRefinements:quanitativeAttributes,
            nonNumericRefinements:nonQuanitativeAttributes,
        };
    },
    trending: async () => {
        //TODO: delete. Algolia implemented
        let goods = await Good.find();
        goods = goods.slice(0, 3);

        return goods.map(good => {
            return transformGood(good);
        });
    },
    bestselling: async ({nr}) => {
        //TODO: develop real funcionality. Use
        let goods = await Good.find();
        goods = goods.slice(0, nr);

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
    }
};
