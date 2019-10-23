require('dotenv').config();

const emailService = require('../services/sendEmail.jsx');


module.exports = {
    receiveContactFormMessage: async ({clientName, clientEmail, subject,clientMessage}) => {
        return await emailService.receiveContactEmail(clientName, clientEmail, subject,clientMessage);
    }
};