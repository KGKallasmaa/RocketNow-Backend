require('dotenv').config();

let category_schemas = require('../../models/category');
let GeneralCategory = category_schemas.GeneralCategory;

const {transformGeneralCategory, transformSubCategory} = require('./merge');


module.exports = {
    createGeneralCategory: async ({name}) => {
        try {
            const existingCategory = await GeneralCategory.findOne({name: name});
            if (existingCategory) {
                throw new Error('This general category already exists.');
            }

            const category = new GeneralCategory({
                name: name,
            });

            const result = await category.save();

            return {...result._doc, _id: result.id};
        } catch (err) {
            throw err;
        }
    },
    allGeneralCategories: async () => {
        try {
            let allgeneralcategoeis = await GeneralCategory.find().sort({'name': 1});
            if (!allgeneralcategoeis) {
                throw new Error('No general categories found.');
            }

            return allgeneralcategoeis.map(category => {
                return transformGeneralCategory(category);
            });

        } catch (error) {
            throw error
        }
    },
    allSubCategories: async () => {
        try {
            let allsubcategories = await SubCategory.find().sort({'name': 1});
            if (!allsubcategories) {
                throw new Error('No sub categories found.');
            }

            return allsubcategories.map(category => {
                return transformSubCategory(category);
            });

        } catch (error) {
            throw error
        }
    }
};