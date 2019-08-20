require('dotenv').config();

const {transformGood} = require('../enchancer');

const good_schemas = require('../good/models/good');
const Good = good_schemas.Good;

const jwt = require('jsonwebtoken');

const user_schemas = require('../user/models/user');
const BusinessUser = user_schemas.BusinessUser;


//Helper functions
async function findUser(jwt_token) {
    const KEY = process.env.BUSINESS_JWT_KEY;
    let decoded = jwt.decode(jwt_token, KEY);

    //Check if the user_id is valid
    const user = await BusinessUser.findById(decoded.userId);
    if (!user) {
        throw new Error('JWT was not decoded properly');
    }
    return user;

}

module.exports = {
    getAllMyListedGoods: async ({jwt_token}) => {
        try {
            //Find if the business user exists
            const business_user = await findUser((jwt_token));

            const goods = await Good.find({
                seller: business_user.id
            }).sort({'listing_timestamp': 'desc'});
            return goods.map(good => {
                return transformGood(good);
            });
        } catch (err) {
            throw err;
        }
    }
};
