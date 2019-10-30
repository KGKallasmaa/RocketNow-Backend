


const weekDayDelay = async function weekDayDelay(currentEstimate) {

};

const workDayDelay = async function workDayDelay(currentEstimate) {
    if (currentEstimate.getHours() > 16){ // 17 PM
        let nextDay_9AM = new Date();
        nextDay_9AM.setFullYear(currentEstimate.getFullYear());
        nextDay_9AM.setMonth(currentEstimate.getMonth());
        nextDay_9AM.setDate(currentEstimate.getDay()+1);
        nextDay_9AM.setHours(9);
        nextDay_9AM.setMinutes(0);
        return nextDay_9AM;
    }
    else if (currentEstimate.getHours() < 8){ // 9 AM
        let today_9AM = new Date();
        today_9AM.setFullYear(currentEstimate.getFullYear());
        today_9AM.setMonth(currentEstimate.getMonth());
        today_9AM.setDate(currentEstimate.getDay());
        today_9AM.setHours(9);
        today_9AM.setMinutes(0);
        return today_9AM;
    }
    return currentEstimate;
};

module.exports = {
    'weekDayDelay': weekDayDelay,
    'workDayDelay': workDayDelay,
};