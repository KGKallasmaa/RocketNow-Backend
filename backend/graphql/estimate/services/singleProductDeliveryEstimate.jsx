require('dotenv').config();


const good_schema = require('../../good/models/good');


function convertUTCDateToLocalDate(date, offset_M) {
    date.setMinutes(date.getMinutes()+offset_M);
    return date;
}

const weekEndDelay = function weekDayDelay(currentEstimate) {
    //Is it Friday
    if (currentEstimate.getDay() === 5) {
        currentEstimate.setFullYear(currentEstimate.getFullYear());
        currentEstimate.setMonth(currentEstimate.getMonth());
        currentEstimate.setDate(currentEstimate.getDate() + 3);
        currentEstimate.setHours(9);
        currentEstimate.setMinutes(30);
    }

    //Is it Saturday
    else if (currentEstimate.getDay() === 6) {
        currentEstimate.setFullYear(currentEstimate.getFullYear());
        currentEstimate.setMonth(currentEstimate.getMonth());
        currentEstimate.setDate(currentEstimate.getDate() + 2);
        currentEstimate.setHours(9);
        currentEstimate.setMinutes(30);
    }

    //Is it Sunday?
    else if (currentEstimate.getDay() === 0) {
        currentEstimate.setFullYear(currentEstimate.getFullYear());
        currentEstimate.setMonth(currentEstimate.getMonth());
        currentEstimate.setDate(currentEstimate.getDate() + 1);
        currentEstimate.setHours(9);
        currentEstimate.setMinutes(30);
    }
    return currentEstimate;
};

const workDayDelay = function workDayDelay(currentEstimate) {
    if (currentEstimate.getHours() > 16) { // 17 PM
        currentEstimate.setFullYear(currentEstimate.getFullYear());
        currentEstimate.setMonth(currentEstimate.getMonth());
        currentEstimate.setDate(currentEstimate.getDate() + 1);
        currentEstimate.setHours(9);
        currentEstimate.setMinutes(30);
    } else if (currentEstimate.getHours() < 8) { // 9.30 AM
        currentEstimate.setFullYear(currentEstimate.getFullYear());
        currentEstimate.setMonth(currentEstimate.getMonth());
        currentEstimate.setDate(currentEstimate.getDate());
        currentEstimate.setHours(9);
        currentEstimate.setMinutes(30);
    }
    return currentEstimate;
};

const availabilityDelay = function availabilityDelay(currentEstimate, good) {
    //TODO: implement better logic
    if (good.booked > good.quantity) {
        //Estimated 2 weeks for stocking
        currentEstimate.setFullYear(currentEstimate.getFullYear());
        currentEstimate.setMonth(currentEstimate.getMonth());
        currentEstimate.setDate(currentEstimate.getDate() + 14);
        currentEstimate.setHours(9);
        currentEstimate.setMinutes(30);
    }
    return currentEstimate;
};

const processingDelay = function processingDelay(currentEstimate, good) {
    //TODO: implement better logic
    currentEstimate.setHours(currentEstimate.getHours() + 2);
    return currentEstimate;
};

const toShippingProviderDelay = function processingDelay(currentEstimate, good) {
    //TODO: implement better logic
    if (currentEstimate.getMinutes() >= 30) {
        const minutesTillFullHours = 60 - currentEstimate.getMinutes();
        currentEstimate.setMinutes(minutesTillFullHours);
        currentEstimate.setHours(currentEstimate.getHours() + 1);
    } else {
        currentEstimate.setMinutes(currentEstimate.getMinutes() + 30);
    }

    return currentEstimate;
};

const singleProductParcelDeliveryEstimate = function singleProductParcelDeliveryEstimate(good, quantity, currentEstimate, country) {
    //TODO: We are assuming that the products are shipped from Estonia. The starting location should be the location of the good
    const dictionary = {
        1: ["Estonia"],
        2: ["Latvia", "Lithuania"],
    }; // number of work days, [countries]

    let deliveryDays = null;

    //Is it submitted on Sunday
    if (currentEstimate.getDay() === 0) {
        //The package will be picked up on Monday
        currentEstimate.setDate(currentEstimate.getDate() + 1);
    }
    //Is it submitted on Friday or Saturday
    else if (currentEstimate.getDay() === 5 || currentEstimate.getDay() === 6) {
        currentEstimate.setDate(currentEstimate.getDate() + 1);
        return singleProductParcelDeliveryEstimate(good, quantity, currentEstimate, country)
    }

    for (const [deliveryTime, suitableCountries] of Object.entries(dictionary)) {
        if (suitableCountries.includes(country)) {
            deliveryDays = parseInt(deliveryTime, 10);
            break;
        }
    }

    //Return address delivery estimate
    if (deliveryDays == null) {
        return singleProductAddressDeliveryEstimate(good, quantity, currentEstimate, country)
    }

    currentEstimate.setDate(currentEstimate.getDate() + deliveryDays);
    return currentEstimate;
};

const singleProductAddressDeliveryEstimate = function singleProductParcelDeliveryEstimate(good, quantity, currentEstimate, country) {
    //When did product arrive in the postal office?
    if (currentEstimate.getHours() > 16) {
        currentEstimate = weekEndDelay(currentEstimate);
        currentEstimate = workDayDelay(currentEstimate);
    }
    //TODO: We are assuming that the products are shipped from Estonia. The starting location should be the location of the good
    const dictionary = {
        1: ["Estonia"],
        2: ["Latvia", "Lithuania", "Finland"],
        3.: ["Sweden"],
        4: ["Belgium", "Italy", "Italy", "Poland", "France", "Germany", "Slovakia", "Hungary"],
        5: ["Austria", "Spain", "Netherlands", "Croatia", "Romanian", "Slovenia",
            "United Kingdom", "Denmark", "Czech"],
        6: ["Ireland", "Greece", "Luxembourg", "Portugal"],
        8: ["Malta"]
    }; // number of work days, [countries]

    let deliveryDays = 10; //Outside EU
    for (const [deliveryTime, suitableCountries] of Object.entries(dictionary)) {
        if (suitableCountries.includes(country)) {
            deliveryDays = parseInt(deliveryTime, 10);
            break;
        }
    }
    currentEstimate.setDate(currentEstimate.getDate() + deliveryDays);
    currentEstimate.setHours(12);
    currentEstimate.setMinutes(30);
    return currentEstimate;
};



const singleProductDeliveryEstimate = async function singleProductDeliveryEstimate(good_id, quantity, TimezoneOffset_M, country) {
    const good = await good_schema.Good.findById(good_id);
    //1. Convert UTC to local
    let deliveryEstimate = convertUTCDateToLocalDate(new Date(), TimezoneOffset_M);
    //2. Is it weekend?
    deliveryEstimate = weekEndDelay(deliveryEstimate);
    //3. Is it after 5PM
    deliveryEstimate = workDayDelay(deliveryEstimate);
    //4. Do we have that good?
    deliveryEstimate = availabilityDelay(deliveryEstimate, good);
    //5. Processing time is 2h
    deliveryEstimate = processingDelay(deliveryEstimate, good);
    //6. It takes 30m to get the product to post office
    deliveryEstimate = toShippingProviderDelay(deliveryEstimate, good);

    //7. Calculate the parcel and address delivery estimates separately
    //TODO:  Maybe shippo implementaion for addressDelivery?

    let parcelDeliveryEstimate = singleProductParcelDeliveryEstimate(good, quantity,new Date(deliveryEstimate.getTime()), country);
    let addressDeliveryEstimate = singleProductAddressDeliveryEstimate(good, quantity,new Date(deliveryEstimate.getTime()), country);

    //Finally: convert Local to UTC
    return [parcelDeliveryEstimate.toISOString(),addressDeliveryEstimate.toISOString()];
};

module.exports = {
    'singleProductDeliveryEstimate': singleProductDeliveryEstimate,
};
