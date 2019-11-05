require('dotenv').config();

const cart_schemas = require('../../shoppingcart/models/shoppingcart');
const ShoppingCart = cart_schemas.ShoppingCart;

const shipping_schema = require('../models/shipping');
const ParcelDeliveryLocation = shipping_schema.ParcelDeliveryLocation;

const address_schema = require('../models/address');
const OrderAdress = address_schema.OrderAddress;

const order_schema = require('../../order/models/order');
const Order = order_schema.Order;

const good_schemas = require('../../good/models/good');
const Good = good_schemas.Good;
const CartGood = good_schemas.CartGood;


const user_schemas = require('../../user/models/user');
const BusinessUser = user_schemas.BusinessUser;
const RegularUser = user_schemas.RegularUser;


const jwt = require('jsonwebtoken');
const {getCode, getName} = require('country-list');

//TODO: implement shippo
//const shippo = require('shippo')(process.env.SHIPPO_API_KEY);
//TODO: implement real stripe api key
const stripe = require('stripe')(process.env.STRIPE_API_SECRET);

const token = "shippo_test_2b28c74c4e294d7e7be2315a9a844174f6c88515";

const crg = require('country-reverse-geocoding').country_reverse_geocoding();


//TODO: remove
async function test() {
    //TODO: remove after manual input

    const name_array = [
        "Jüri Konsum",
        "Kakumäee Selver"
    ];

    const x_coordinate_aray = [
        24.912249,
        24.626617
    ];
    const y_coordinate_aray = [
        59.357965,
        59.428133
    ];


    for (let i = 0; i < name_array.length; i++) {
        const current_name = name_array[i];
        const current_x = x_coordinate_aray[i];
        const current_y = y_coordinate_aray[i];

        const test_1 = new ParcelDeliveryLocation({
            provider: "Itella",
            name: current_name,
            country: "Estonia",
            x_coordinate: current_x,
            y_coordinate: current_y
        });
        const result1 = await test_1.save();
    }

    return true;

}

async function findUser(jwt_token) {
    const decoded = jwt.decode(jwt_token, process.env.PERSONAL_JWT_KEY);
    if (!decoded) {
        //user has not loggeed in
        return null;
    }
    return await RegularUser.findById(decoded.userId);

}

async function boxify(cartgoods, method) {
    let boxes = {};

    switch (method) {
        case "Address":
            const maxWeightPerBoxOZ = 705.479; //20 kg
            //Lets but all goods inside one box
            let CurrentBoxNr = 1;
            let CurrentBoxWeightOz = 0;
            for (let i = 0; i < cartgoods.length; i++) {
                const good = await Good.findById(cartgoods[i].good);
                const proposedName = "BOX" + CurrentBoxNr;

                if (proposedName in boxes) {
                    let current = boxes[proposedName];
                    if (good.weight_oz + CurrentBoxWeightOz <= maxWeightPerBoxOZ) {
                        current.push(good);
                        boxes[proposedName] = current;
                    } else {
                        CurrentBoxNr += 1;
                        CurrentBoxWeightOz = 0;
                        current = [good];
                    }
                    boxes["proposedName"] = [good];
                    CurrentBoxWeightOz += good.weight_oz;
                } else {
                    boxes["proposedName"] = [good];
                    CurrentBoxWeightOz += good.weight_oz;
                }
            }
            break;
        case "Parcel":
            //Omniva
            const packageS = {height: 3.54331, length: 25.1969, width: 14.9606}; //in
            const packageM = {height: 7.48031, length: 25.1969, width: 14.9606}; //in
            const packageL = {height: 15.3543, length: 25.1969, width: 14.9606}; //in


            const maxWeightPerBox_oz = 1058.22; //30 kg
            //Lets but all goods inside one box
            let CurrentBox = 1;
            let CurrentBoxOz = 0;

            for (let i = 0; i < cartgoods.length; i++) {
                const good = await Good.findById(cartgoods[i].good);
                if (!good) {
                    throw new Error("Cartgood with good " + cartgoods[i].goods + " dosent exist on db")
                }
                const proposedName = "BOX" + CurrentBox;

                //1. Size validation
                if (good.length_in > 25.1969 || good.width_in > 14.9609) {
                    const dimensions = good.length_in + "," + good.width_in;
                    throw new Error("Good " + good._id + " is not suitable, because it's length and width, " + dimensions + ", are bigger than Omniva allows:  25,1969  14.9609")
                }

                if (proposedName in boxes) {
                    let current = boxes[proposedName];
                    if (good.weight_oz + CurrentBoxOz <= maxWeightPerBox_oz) {
                        current.push(good);
                        boxes[proposedName] = current;
                    } else {
                        CurrentBox += 1;
                        CurrentBoxOz = 0;
                        current = [good];
                    }
                    boxes["proposedName"] = [good];
                    CurrentBoxOz += good.weight_oz;
                }
                //First option
                else {
                    const isSPackage = (good.height_in <= packageS.height);
                    const isMPackage = (good.height_in <= packageM.height && !isSPackage);
                    const isLPackage = (good.height_in <= packageL.height && !isMPackage);


                    if (!isSPackage && !isMPackage && !isLPackage) {
                        throw new Error("Good " + good._id + " is not suitable for Omniva Parcel delivery")
                    }

                    boxes["proposedName"] = [good];
                    CurrentBoxOz += good.weight_oz;
                }
            }
            break;
        default:
            throw new Error("NO shippingmethod " + method + " found")
    }


    return boxes;

}
async function AddressDeliveryShippingCostEstimate(ShippmentCountry, shoppingcart) {
    //TODO: switch to Shippo
    /*
    Values are from Omniva:https://www.omniva.ee/public/files/failid/hinnakiri-pakk-standardpakk-ari-est-en-2018.pdf
    Currently, we assume that goods are shipped from one singel locaion, in Estonia.
     */
    let cost = 0;

    /*
    Pricing
     */
    const baseFareEstonia_EUR = 3.6;
    const WeightFeeEstonia_EUR = 0.24; // Per kg fee. If the shipment weighs 1.5kg then fee = 0,48 ceil(1,5)*0.24
    const DeliveryConformationEmailEstonia_EUR = 0.17;

    //Fees for other countires
    /*
    [Country code]: {BaseFare,WeightFare}
     */
    const Fare_EUR = {
            "Estonia": [3., 0.24],
            "The Republic of Albania": [15.95, 2.85],
            "The Republic of Algeria": [14.86, 3.74],
            "United States": [13.89, 4.84],
            "The Republic of Armenia": [15.10, 4.60],
            "The Republic of Azerbaijan": [14.51, 3.78],
            "Australian Connection": [14.80, 6.87],
            "The Republic of Austria": [12.74, 1.30],
            "The Kingdom of Belgium": [12.63, 1.24],
            "Bosnia and Herzegovina": [15.27, 3.60],
            "Federative Republic of Brazil": [13.51, 9.85],
            "The Republic of Bulgaria": [12.27, 3.36],
            "Gibraltar": [12.01, 3.60],
            "Georgia": [15.34, 5.19],
            "The People's Republic of China": [13.22, 6.96],
            "The Republic of China (Taiwan)": [13.22, 9.15],
            "Kingdom of Spain": [18.18, 1.56],
            "Kingdom of the Netherlands": [13.04, 1.24],
            "Hong Kong (China)": [15.34, 7.55],
            "The Republic of Croatia": [12.45, 4.37],
            "Ireland": [16.35, 1, 50],
            "The State of Israel": [15.05, 2.71],
            "The Republic of India": [15.58, 6.84],
            "The Republic of Island": [26.96, 2.30],
            "The Italian Republic": [16.05, 1.48],
            "Japan": [14.46, 2.83],
            "Canada": [14.57, 5.02],
            "The Republic of Kazakhstan": [12.33, 5.49],
            "The Republic of Korea": [15.69, 9.32],
            "The Hellenic Republic": [16.23, 2.71],
            "The Republic of Cyprus": [13.87, 4.72],
            "The Republic of Lithuania": [12.86, 1.00],
            "The Principality of Liechtenstein": [27.14, 1.30],
            "Grand Duchy of Luxembourg": [11.86, 1.89],
            "South Africa": [12.86, 9.62],
            "The Republic of Latvia": [11.98, 1.89],
            "The Republic of Macedonia": [15.61, 2.99],
            "The Republic of Malta": [15.10, 3.25],
            "Republic of Moldova": [17.50, 3.32],
            "Montenegro": [16.15, 3.53],
            "The Kingdom of Norway": [28.26, 0.94],
            "The Republic of Panama": [11.67, 6.92],
            "The Republic of Poland": [13.04, 1.12],
            "The Portuguese Republic": [13.28, 2.54],
            "The French Republic": [17.64, 1.24],
            "The Kingdom of Sweden": [13.81, 0.83],
            "Romania": [16.28, 2.71],
            "Federal Republic of Germany": [13.28, 1.24],
            "The Republic of Serbia": [18.32, 3.53],
            "Slovak Republic": [12.86, 2.18],
            "The Republic of Slovenia": [11.21, 3.07],
            "Republic of Finland": [16.11, 0.77],
            "Great Britain and Northern Ireland, United Kingdom": [15.10, 1.24],
            "The Swiss Confederation": [27.14, 1.30],
            "The Kingdom of Denmark": [13.12, 0.90],
            "Czech Republic": [12.57, 1.24],
            "The Republic of Turkey": [13.17, 4.35],
            "Ukraine": [17.79, 2.40],
            "The Republic of Hungary": [11.80, 2.18],
            "New Zealand": [16.28, 8.14],
            "The Republic of Belarus": [14.11, 2.71],
            "Vatican City": [12.98, 2.07],
            "The Russian Federation": [19.80, 3.70],
            "The Islamic State of Afghanistan": [12.74, 7.73],
            "The Republic of Angola": [12.74, 7.73],
            "Anguilla": [12.74, 7, 73],
            "Antigua and Barbuda": [12.74, 7, .73],
            "Macau": [12.74, 7.73],
            "United Arab Emirates": [12.74, 7.73],
            "The Republic of Argentinas": [12.74, 7.73],
            "Arubas": [12.74, 7.73],
            "Commonwealth of the Bahamass": [12.74, 7.73],
            "Kingdom of Bahrains": [12.74, 7.73],
            "The People's Republic of Bangladeshs": [12.74, 7.73],
            "Barbadoss": [12.74, 7.73],
            "Belizes": [12.74, 7.73],
            "The Republic of Benins": [12.74, 7.73],
            "Bermuda": [12.74, 7.73],
            "The Kingdom of Bhutan": [12, 74, 7.73],
            "The Republic of Bolivia": [12, 74, 7.73],
            "The Republic of Botswana": [12, 74, 7.73],
            "Brunei Darussalam": [12.74, 7.73],
            "Burkina Faso": [12.74, 7.73],
            "Republic of Burund": [12.74, 7.73],
            "The Republic of Cape Verde": [12.74, 7.73],
            "The Republic of Colombia": [12.74, 7.73],
            "The Republic of Costa Rica": [12.74, 7.73],
            "Côte d'Ivoire The Republic": [12.74, 7.73],
            "Djibouti": [12.74, 7.73],
            "Commonwealth of Dominica": [12.74, 7.73],
            "Dominican Republic": [12.74, 7.73],
            "The Republic of Ecuado": [12.74, 7.73],
            "Arab Republic of Egypt": [12.74, 7.73],
            "The Republic of Equatorial Guinea": [12.74, 7.73],
            "The Republic of El Salvador": [12.74, 7.73],
            "State of Eritrea": [12.74, 7.73],
            "Federal Democratic Republic of Ethiopia": [12.74, 7.73],
            "Falkland Islands and Dependencies": [12.74, 7.73],
            "Republic of Fiji": [12.74, 7.73],
            "Republic of the Philippines": [12.74, 7.73],
            "The Faroe Islands": [12.74, 7.73],
            "The Republic of Gabon": [12.74, 7.73],
            "The Republic of The Gambia": [12.74, 7.73],
            "The Republic of Ghana": [12.74, 7.73],
            "Grenada": [12.74, 7.73],
            "Greenland": [12.74, 7.73],
            "Guadeloupe": [12.74, 7.73],
            "The Republic of Guatemala": [12.74, 7.73],
            "The Republic of Guinea": [12.74, 7.73],
            "The Republic of Guinea-Bissau": [12.74, 7.73],
            "Cooperative Republic of Guyana": [12.74, 7.73],
            "The Republic of Haiti": [12.74, 7.73],
            "Netherlands Antilles (Curaçao, Sint Maarten, the Caribbean Netherlands)": [12.74, 7.73],
            "The Republic of Honduras": [12.74, 7.73],
            "Republic of Indonesia": [12.74, 7.73],
            "The Republic of Iraq": [12.74, 7.73],
            "The Islamic Republic of Iran": [12.74, 7.73],
            "Jamaica": [12.74, 7.73],
            "Republic of Yemen": [12.74, 7.73],
            "The Hashemite Kingdom of Jordan": [12.74, 7.73],
            "Cayman Islands": [12.74, 7.73],
            "Kingdom of Cambodia": [12.74, 7.73],
            "Republic of Cameroon": [12.74, 7.73],
            "Canary Islands": [12.74, 7.73],
            "State of Qatar": [12.74, 7.73],
            "Kenya The Republic": [12.74, 7.73],
            "The Central African Republic": [12.74, 7.73],
            "The Republic of Kiribati": [12.74, 7.73],
            "Union of Comoros": [12.74, 7.73],
            "Democratic Republic of Congo": [12.74, 7.73],
            "The Republic of Congo": [12.74, 7.73],
            "Korea, Democratic People's Republic of": [12.74, 7.73],
            "The Republic of Cuba": [12.74, 7.73],
            "State of Kuwait": [12.74, 7.73],
            "The Kyrgyz Republic (Kyrgyzstan)": [12.74, 7.73],
            "Lao People's Democratic Republic": [12.74, 7.73],
            "The Kingdom of Lesotho": [12.74, 7.73],
            "The Republic of Liberia": [12.74, 7.73],
            "The Republic of Lebanon": [12.74, 7.73],
            "Great Libyan Arab Jamahiriya": [12.74, 7.73],
            "The Republic of Madagascar": [12.74, 7.73],
            "Federation of Malaysia": [12.74, 7.73],
            "The Republic of Malawi": [12.74, 7.73],
            "The Republic of Maldives": [12.74, 7.73],
            "The Republic of Mali": [12.74, 7.73],
            "The Kingdom of Morocco": [12.74, 7.73],
            "department of Martinique": [12.74, 7.73],
            "The Islamic Republic of Mauritania": [12.74, 7.73],
            "The Republic of Mauritius": [12.74, 7.73],
            "The United Mexican States": [12.74, 7.73],
            "Mongolia": [12.74, 7.73],
            "Montserrat": [12.74, 7.73],
            "The Republic of Mozambique": [12.74, 7.73],
            "The Republic of the Union of Myanmar": [12.74, 7.73],
            "The Republic of Namibia": [12.74, 7.73],
            "The Republic of Nauru": [12.74, 7.73],
            "U.S. Virgin Islands": [12.74, 7.73],
            "Federal Democratic Republic of Nepal": [12.74, 7.73],
            "The Republic of Nicaragua": [12.74, 7.73],
            "The Federal Republic of Nigeria": [12.74, 7.73],
            "The Republic of Niger": [12.74, 7.73],
            "Sultanate of Oman": [12.74, 7.73],
            "Independent State of Papua New Guinea": [12.74, 7.73],
            "Islamic Republic of Pakistan": [12.74, 7.73],
            "The Republic of Paraguay": [12.74, 7.73],
            "Pitcairn Islands": [12.74, 7.73],
            "The Republic of Peru": [12.74, 7.73],
            "French Guiana": [12.74, 7.73],
            "French Polynesia": [12.74, 7.73],
            "Réunion department": [12.74, 7.73],
            "Republic of Rwanda": [12.74, 7.73],
            "Solomon Islands": [12.74, 7.73],
            "Saint Kitts and Nevis": [12.74, 7.73],
            "Saint Helena": [12.74, 7.73],
            "Saint Lucia": [12.74, 7.73],
            "Saint-Pierre and Miquelon regional authority": [12.74, 7.73],
            "Saint Vincent and the Grenadines": [12.74, 7.73],
            "Republic of Zambia": [12.74, 7.73],
            "Independent State of Samoa": [12.74, 7.73],
            "Democratic Republic of Sao Tome and Principe": [12.74, 7.73],
            "The Kingdom of Saudi Arabia": [12.74, 7.73],
            "The Republic of Seychelles": [12.74, 7.73],
            "The Republic of Senegal": [12.74, 7.73],
            "The Republic of Sierra Leone": [12.74, 7.73],
            "The Republic of Singapore": [12.74, 7.73],
            "Somalia Democratic Republic of the": [12.74, 7.73],
            "Democratic Socialist Republic of Sri Lanka": [12.74, 7.73],
            "Republic of the Sudan": [12.74, 7.73],
            "The Republic of Suriname": [12.74, 7.73],
            "The Kingdom of Swaziland": [12.74, 7.73],
            "The Syrian Arab Republic": [12.74, 7.73],
            "The Republic of Zimbabwe": [12.74, 7.73],
            "The Republic of Tajikistan": [12.74, 7.73],
            "The Kingdom of Thailand": [12.74, 7.73],
            "United Republic of Tanzania": [12.74, 7.73],
            "Democratic Republic of Timor-Leste": [12.74, 7.73],
            "Republic of Togo": [12.74, 7.73],
            "The Kingdom of Tonga": [12.74, 7.73],
            "The Republic of Trinidad and Tobago": [12.74, 7.73],
            "Tristan da Cunha": [12.74, 7.73],
            "The Republic of Chad": [12.74, 7.73],
            "The Republic of Chile": [12.74, 7.73],
            "The Republic of Tunisia": [12.74, 7.73],
            "Turks and Caicos Islands": [12.74, 7.73],
            "Turkmenista": [12.74, 7.73],
            "Tuvalu": [12.74, 7.73],
            "The Republic of Uganda": [12.74, 7.73],
            "Eastern Republic of Uruguays": [12.74, 7.73],
            "The Republic of Uzbekistans": [12.74, 7.73],
            "New Caledonias": [12.74, 7.73],
            "The Republic of Vanuatus": [12.74, 7.73],
            "Bolivarian Republic of Venezuelas": [12.74, 7.73],
            "The Socialist Republic of Vietnams": [12.74, 7.73],
            "Wallis and Futuna Islands areas": [12.74, 7.73]
        }
    ;


    //Sort Shoppingcart goods
    let cartgoods = [];
    for (let i = 0; i < shoppingcart.goods.length; i++) {
        const cartgood = await CartGood.findById(shoppingcart.goods[i]);
        cartgoods.push(cartgood);
    }
    cartgoods.sort(async function (cartgood1, cartgood2) {
        //Goods are sorted by volume. If volume is equal, then return the heaviest
        const good1 = await Good.findById(cartgood1.good);
        const good2 = await Good.findById(cartgood2.good);

        let volume = function (good) {
            return good.height_in * good.width_in * good.length_in;
        };
        const volume1 = volume(good1);
        const volume2 = volume(good2);

        if (volume1 === volume2) {
            return good2.weight_oz - good1.weight_oz
        }
        return volume2 - volume1;
    });

    //Group the goods into boxes

    let boxWeightKG = function (goods) {
        let weight = 0;
        for (let i = 0; i < goods.length_in; i++) {
            weight += goods[i].weight_oz;
        }
        return weight * 0.02834952;
    };

    const boxes = await boxify(cartgoods, "Address");
    if (ShippmentCountry === "Estonia") {
        for (let box in boxes) {
            const boxWeight = Math.ceil(boxWeightKG(boxes[box]));
            cost += baseFareEstonia_EUR + boxWeight * WeightFeeEstonia_EUR;
        }
        cost += DeliveryConformationEmailEstonia_EUR;
    } else {
        const fares = Fare_EUR[ShippmentCountry];
        const base = fares[0];
        const weight = fares[0];
        if (!base || !weight) {
            throw new Error("No country " + ShippmentCountry + " found. Probably grammar mistake")
        }
        for (let box in boxes) {
            const boxWeight = Math.ceil(boxWeightKG(boxes[box]));
            cost += base + boxWeight * weight;
        }
    }
    return cost;
}

async function ParcelDeliveryShippingCostEstimate(ParcelDeliveryLocationId, shoppingcart) {
    //Is it inital request?
    if (!ParcelDeliveryLocationId) {
        return -1;
    }

    const parcelLocation = await ParcelDeliveryLocation.findById(ParcelDeliveryLocationId);
    if (!parcelLocation) {
        console.error("Parcel delivery with id " + ParcelDeliveryLocationId + " was not found");
        return -1;
    }
    const Country = parcelLocation.country;

    const packageS = {height: 9, length: 64, width: 38};
    const packageM = {height: 19, length: 64, width: 38};
    const packageL = {height: 39, length: 64, width: 38};

    let cartgoods = [];
    for (let i = 0; i < shoppingcart.goods.length; i++) {
        const cartgood = await CartGood.findById(shoppingcart.goods[i]);
        cartgoods.push(cartgood);
    }
    cartgoods.sort(async function (cartgood1, cartgood2) {
        //Goods are sorted by volume. If volume is equal, then return the heaviest
        const good1 = await Good.findById(cartgood1.good);
        const good2 = await Good.findById(cartgood2.good);

        let volume = function (good) {
            return good.height_in * good.width_in * good.length_in;
        };
        const volume1 = volume(good1);
        const volume2 = volume(good2);

        if (volume1 === volume2) {
            return good2.weight_oz - good1.weight_oz
        }
        return volume2 - volume1;
    });

    //Group the goods into boxes

    const boxes = await boxify(cartgoods, "Parcel");


    let cost = 0;

    let isSPackage = false;
    let isMPackage = false;
    let isLPackage = false;

    switch (Country) {
        case "Estonia":
            for (const box in boxes) {
                cartgoods = boxes[box];
                for (let i = 0; i < cartgoods.length; i++) {
                    const good = cartgoods[i];

                    isSPackage = (good.height_in <= packageS.height);
                    isMPackage = (good.height_in <= packageM.height && !isSPackage);
                    isLPackage = (good.height_in <= packageL.height && !isMPackage);

                    if (isSPackage) {
                        cost += 2.95;
                    } else if (isMPackage) {
                        cost += 3.98;
                    } else if (isLPackage) {
                        cost += 4.95;
                    } else {
                        throw new Error("Good " + good._id + " is not suitable for Omniva Parcel delivery");
                    }
                }
            }
            break;
        case "Latvia":
            for (box in boxes) {
                cartgoods = boxes[box];
                for (let i = 0; i < cartgoods.length; i++) {
                    const good = await Good.findById(cartgoods[i].good);
                    isSPackage = (good.height_in <= packageS.height);
                    isMPackage = (good.height_in <= packageM.height && !isSPackage);
                    isLPackage = (good.height_in <= packageL.height && !isMPackage);

                    if (isSPackage) {
                        cost += 6.98;
                    } else if (isMPackage) {
                        cost += 7.99;
                    } else if (isLPackage) {
                        cost += 8.99;
                    } else {
                        throw new Error("Good " + good._id + " is not suitable for Omniva Parcel delivery");
                    }
                }
            }
            break;
        case "Lithuania":
            for (box in boxes) {
                cartgoods = boxes[box];
                for (let i = 0; i < cartgoods.length; i++) {
                    const good = await Good.findById(cartgoods[i].good);
                    isSPackage = (good.height_in <= packageS.height);
                    isMPackage = (good.height_in <= packageM.height && !isSPackage);
                    isLPackage = (good.height_in <= packageL.height && !isMPackage);

                    if (isSPackage) {
                        cost += 7.99;
                    } else if (isMPackage) {
                        cost += 8.99;
                    } else if (isLPackage) {
                        cost += 9.98;
                    } else {
                        throw new Error("Good " + good._id + " is not suitable for Omniva Parcel delivery");
                    }
                }
            }
            break;
        default:
            console.log("Omniva only supports parcel deliveries in Estonia, Latvia and Lithuanita not in " + Country);
            return -1;
    }
    return cost;
}

module.exports = {
    ParcelDeliveryLocations: async ({UserLatCoordinate, UserLonCoordinate}) => {
        let distance = function distanceInKmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
            //1. Find the correct Earth radius: https://rechneronline.de/earth-radius/
            const EarthRadiusAtPoleKM = 6356.752;
            const EarthRadiusAtEquatorKm = 6378.137;

            let part1 = [Math.pow(Math.pow(EarthRadiusAtEquatorKm, 2) * Math.cos(lat1), 2) + Math.pow(Math.pow(EarthRadiusAtPoleKM, 2) * Math.sin(lat1), 2)];
            let part2 = [Math.pow(EarthRadiusAtEquatorKm * Math.cos(lat1), 2) + Math.pow(EarthRadiusAtPoleKM * Math.sin(lat1), 2)];
            const EarthRadiusAtUserLocation = Math.sqrt(part1 / part2);
            part1 = [Math.pow(Math.pow(EarthRadiusAtEquatorKm, 2) * Math.cos(lat2), 2) + Math.pow(Math.pow(EarthRadiusAtPoleKM, 2) * Math.sin(lat2), 2)];
            part2 = [Math.pow(EarthRadiusAtEquatorKm * Math.cos(lat2), 2) + Math.pow(EarthRadiusAtPoleKM * Math.sin(lat2), 2)];
            const EarthRadiusArParcellLocation = Math.sqrt(part1 / part2);
            const earthRadiusKm = (EarthRadiusAtUserLocation + EarthRadiusArParcellLocation) / 2;


            const p = 0.017453292519943295;    // Math.PI / 180
            let degreesToRadians = function (degrees) {
                return degrees * p;
            };

            const dLat = degreesToRadians(lat2 - lat1);
            const dLon = degreesToRadians(lon2 - lon1);

            lat1 = degreesToRadians(lat1);
            lat2 = degreesToRadians(lat2);

            const a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
                Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0) * Math.cos(lat1) * Math.cos(lat2);
            const c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
            return earthRadiusKm * c;
        };
        //Only showing the locations in the user country
        const country = crg.get_country(UserLatCoordinate, UserLonCoordinate);
        let MergedLocations = undefined;

        if (country) {
            MergedLocations = await ParcelDeliveryLocation.find({country: country.name}).sort({provider: "asc"}).sort({country: "asc"}).sort({name: "asc"})
        } else {
            return await ParcelDeliveryLocation.find().sort({provider: "asc"}).sort({country: "asc"}).sort({name: "asc"});
        }
        //A single location can't be more than 10km away from the user
        const NearYourKm = 10;
        let locations = [];

        let lowest_distance_array = Array.apply(null, {length: 5}).map(function () {
            return NearYourKm;
        });
        for (let i = 0; i < MergedLocations.length; i++) {
            const REAL_location = MergedLocations[i];

            const distanceKM = distance(UserLatCoordinate, UserLonCoordinate, REAL_location.y_coordinate, REAL_location.x_coordinate);

            if (distanceKM < lowest_distance_array[4]) {
                if (distanceKM < lowest_distance_array[0]) {
                    lowest_distance_array[0] = distanceKM;
                    locations[0] = REAL_location;
                } else if (distanceKM < lowest_distance_array[1]) {
                    lowest_distance_array[1] = distanceKM;
                    locations[1] = REAL_location;
                } else if (distanceKM < lowest_distance_array[2]) {
                    lowest_distance_array[2] = distanceKM;
                    locations[2] = REAL_location;
                } else if (distanceKM < lowest_distance_array[3]) {
                    lowest_distance_array[3] = distanceKM;
                    locations[3] = REAL_location;
                } else {
                    lowest_distance_array[4] = distanceKM;
                    locations[4] = REAL_location;
                }
            }
        }
        locations.push(...MergedLocations);
        return Array.from([...new Set(locations)]);
    },
    DeliveryCost: async args => {
        //The cost, that this function calculates, is final. The user will not be charged more, if the cost turns out to be bigger

        const user = await findUser(args.deliverycostInput.jwt_token);
        let shoppingcart;
        if (user) {
            shoppingcart = await ShoppingCart.findOne({cart_identifier: user._id});
        } else {
            shoppingcart = await ShoppingCart.findOne({cart_identifier: args.deliverycostInput.jwt_token});
        }
        //User hasn't added any goods to their cart
        if (!shoppingcart) {
            return 0;
        }
        switch (args.deliverycostInput.ShippingMethod) {
            case "ParcelDelivery":
                return Math.ceil(100 * await ParcelDeliveryShippingCostEstimate(args.deliverycostInput.ParcelDeliveryLocation, shoppingcart)) / 100;
            case "AddressDelivery":
                return Math.ceil(100 * await AddressDeliveryShippingCostEstimate(args.deliverycostInput.ShippingCountry, shoppingcart)) / 100;
            default:
                return Error("Shipping method " + args.deliverycostInput.ShippingMethod + " is not supported.")
        }
    },
    addParcelDeliveryLocation: async ({provider, name, country, x_coordinate, y_coordinate}) => {
        const existingParcelDeliveryLocation = await ParcelDeliveryLocation.findOne({
            name: name,
            provider: provider
        });
        if (existingParcelDeliveryLocation) {
            throw new Error('This ParcelDeliveryLocation already exists .');
        }
        //Create new user
        const new_ParcelDeliveryLocation = new ParcelDeliveryLocation({
            provider: provider,
            name: name,
            country: country,
            x_coordinate: x_coordinate,
            y_coordinate: y_coordinate
        });
        //TOOD: remove
        const response = await test();
        const result = await new_ParcelDeliveryLocation.save();
        return {...result._doc};
    },
};