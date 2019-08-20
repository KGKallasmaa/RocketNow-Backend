require('dotenv').config();

const category_schemas = require('../models/generalCategory');
const GeneralCategory = category_schemas.GeneralCategory;

const {transformGeneralCategory} = require('../../enchancer');


module.exports = {
    createGeneralCategory: async ({name,tax}) => {
        try {
            const existingCategory = await GeneralCategory.findOne({name: name});
            if (existingCategory) {
                return new Error('This general category already exists.');
            }

            const category = new GeneralCategory({
                name: name,
                tax:tax
            });

            const result = await category.save();

            return {...result._doc, _id: result.id};
        } catch (err) {
            throw err;
        }
    },
    allGeneralCategories: async () => {
        try {
            const allgeneralcategoeis = await GeneralCategory.find().sort({'name': 1});
            if (!allgeneralcategoeis) {
                return  new Error('No general categories found.');
            }

            return allgeneralcategoeis.map(category => {
                return transformGeneralCategory(category);
            });

        } catch (error) {
            throw error
        }
    }
};