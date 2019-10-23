require('dotenv').config();

const nodemailer = require('nodemailer');
const myEmail = process.env.EMAIL_NAME;
const myPass = process.env.EMAIL_PW;


const emailService = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: myEmail,
        pass: myPass
    }
});


const receiveContactEmail = async function receiveContactEmail(clientName, clientEmail, subject, clientMessage) {
    const mailOptions = {
        from: myEmail,
        to: myEmail,
        subject: subject,
        html: `        <div>
                        ${clientMessage}
                        <br/>
                         <br/>
                       Sent by <br/>
                        ${clientName}<br/>
                        ${clientEmail}<br/>
                        </div>
            `
    };
    await emailService.sendMail(mailOptions, async function (error, info) {
        if (error) {
            console.log(error);
            console.error("Problem receiving contact email from " + clientEmail);
            return false;
        } else {
            console.info("Received a contact email from " + clientEmail);
        }
    });
    return true;
};


module.exports = {
    'receiveContactEmail': receiveContactEmail,
};
