require('dotenv').config();


const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const user_schemas = require('../models/user');
const BusinessUser = user_schemas.BusinessUser;
const RegularUser = user_schemas.RegularUser;

const cart_schemas = require('../../shoppingcart/models/shoppingcart');

const nodemailer = require('nodemailer');
const userService = require('../services/findUser.jsx');
const shippingService = require('../../shipping/services/updateShippingLocationStatus.jsx');
const shoppingCartService = require('../../shoppingcart/services/shoppingCartService.jsx');

const emailVerificationService = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_NAME,
        pass: process.env.EMAIL_PW
    }
});


//Helper function
async function sendEmail(token, toEmail, userId, type) {
    if (type === "verifyEmail") {
        const emailVerificationURL = process.env.CLIENT_URL + "/verify/email/" + token;
        const mailOptions = {
            from: '"Karl-Gustav Kallasmaaa" <karl.gustav1789@gmail.com>',
            to: toEmail,
            subject: 'RocketNow 🚀 account verification',
            html: `
                        <div class="container-fluid">
                        <div class="row">
                            <div class="col-md-4">
                                <p></p>
                            </div>
                            <div class="col-md-4">
                                <br/>
                                <h2  style="color:#1F96FE" class="text-center">
                                    Thank you for joining RocketNow
                                </h2>
                            </div>
                            <div class="col-md-4">
                                <p></p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12">
                                <p>
                                  RocketNow is an E-commerce platform on a mission of providing our customers with every good available in the Galaxy.
                                </p> 
                                <br/>
                                <br/>        
                                <a href="${emailVerificationURL}"
                                class="button"
                                style="
                                background-color:#1f96fe;
                                moz-border-radius:18px;
                                webkit-border-radius:18px;
                                border-radius:16px;
                                display:inline-block;
                                color:#ffffff;
                                font-family:Verdana;
                                font-size:20px;
                                padding:17px 48px;
                                text-decoration:none;
                                text-shadow:0px 1px 0px #1f96fe;"
                                >
                                Verify you email
                                </a>
                           <br/>
                           <br/>
                           <br/>
                                Karl-Gustav Kallasmaa,
                                <br/>
                                Co-Founder and CEO
                                </small>
                             </div>
                         </div>
                        </div>
            `
        };
        emailVerificationService.sendMail(mailOptions, async function (error, info) {
            if (error) {
                console.error(error);
                await RegularUser.findByIdAndDelete(userId);
                console.error("Email verification is not working#" + userId);
                console.warn("Deleted a newly created regular user #" + userId);
                return false;
            } else {
                console.info("Sent a verification email for regular user #" + userId);
            }
        });
        return true;
    } else if (type === "resetPassword") {
        const passwordResetURL = process.env.CLIENT_URL + "/reset/password/" + token;
        const mailOptions = {
            from: '"Karl-Gustav Kallasmaaa" <karl.gustav1789@gmail.com>',
            to: toEmail,
            subject: 'RocketNow 🚀 reset password',
            html: `
                        <div class="container-fluid">
                        <div class="row">
                            <div class="col-md-4">
                                <p></p>
                            </div>
                            <div class="col-md-4">
                                <br/>
                                <h2  style="color:#1F96FE" class="text-center">
                                    Resetting your password is eazy
                                </h2>
                            </div>
                            <div class="col-md-4">
                                <p></p>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12">
                                <p>
                                  To reset your password you need to click the button below
                                </p> 
                                <br/>
                                <br/>        
                                <a href="${passwordResetURL}"
                                class="button"
                                style="
                                background-color:#1f96fe;
                                moz-border-radius:18px;
                                webkit-border-radius:18px;
                                border-radius:16px;
                                display:inline-block;
                                color:#ffffff;
                                font-family:Verdana;
                                font-size:20px;
                                padding:17px 48px;
                                text-decoration:none;
                                text-shadow:0px 1px 0px #1f96fe;"
                                >
                                Reset my password
                                </a>
                           <br/>
                           <br/>
                           <br/>
                                Karl-Gustav Kallasmaa,
                                <br/>
                                Co-Founder and CEO
                                </small>
                             </div>
                         </div>
                        </div>
            `
        };
        emailVerificationService.sendMail(mailOptions, async function (error, info) {
            if (error) {
                console.error("Password resetting is not working#" + userId);
                return false;
            } else {
                console.info("Sent a password reset email for regular user #" + userId);
            }
        });
        return true;
    }

    log.error("Email type " + type + " is not supported");
    return false
}


module.exports = {
    createUser: async args => {
        let existingUser = await RegularUser.findOne({email: args.userInput.email});
        const current_time = new Date().getTime();
        const expires_in = (args.userInput.signupMethod === "Facebook") ? 6042000 : 3600000; //expires in 100 minutes or 60 minutes
        const expiresIn_as_String = (current_time + expires_in).toString();

        let user;

        if ((args.userInput.signupMethod === 'Google') || (args.userInput.signupMethod === 'Facebook')) {
            if (existingUser) {
                return jwt.sign({userId: existingUser.id}, process.env.PERSONAL_JWT_KEY, {expiresIn: expiresIn_as_String});
            } else {
                user = new RegularUser({
                    fullname: args.userInput.fullname,
                    email: args.userInput.email,
                    image_URL: args.userInput.image_URL,
                    signupMethod: args.userInput.signupMethod,
                    lastLoginTimestamp_UNIX: current_time,
                    isVerified: true,
                    isActive: true,
                });
                const result = await user.save();
                console.info("New regular user #" + result._id + " signed up with " + args.userInput.signupMethod);
                return jwt.sign({userId: user.id}, process.env.PERSONAL_JWT_KEY, {expiresIn: expiresIn_as_String});
            }
        }

        existingUser = await RegularUser.findOne({email: args.userInput.email});

        if (existingUser) {
            if (existingUser.isVerified === true) {
                return Error('User with that email has already bee verified. Try logging in');
            }
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await RegularUser.update({_id: existingUser._id}, {
                $set: {
                    verificationCode: token,
                }
            }, {upsert: true}, function (err) {
            });
            await sendEmail(token, existingUser.email, existingUser._id, "verifyEmail");
            return Error('We sent you another verification email');
        }
        const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
        const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        user = new RegularUser({
            fullname: args.userInput.fullname,
            email: args.userInput.email,
            password: hashedPassword,
            verificationCode: token,
            lastLoginTimestamp_UNIX: current_time
        });
        const result = await user.save();
        console.info("Created a new regular user #" + result._id);

        let sendAnEmail = await sendEmail(token, result.email, result._id, "verifyEmail");

        if (sendAnEmail === true) {
            return "Please verify your account";
        } else {
            return Error('There was a problem sending the verification email.');
        }
    },
    individualUser: async ({jwt_token}) => {
        const user = await userService.findRegularUserByJWT(jwt_token);
        if (!user) {
            return Error('Regular user was not found');
        }
        return {...user._doc, password: null, _id: user.id};
    },
    individualBusinessUser: async ({nr, displayname}) => {
        const user = await userService.findBusinessUserByNrAndDisplayName(nr,displayname);
        if (!user) {
            return Error('Business user was not found');
        }
        return {...user._doc, password: null, _id: user.id};
    },

    login: async ({email, password, old_cart_id, image_URL, loginMethod, fullname}) => {
        let user = await userService.findRegularUserByEmail(email);

        if (!user) {
            if (loginMethod === "Regular") {
                return Error('Email or password is incorrect');
            }
            //Creating a new user, even thou user hasn't explicitly asked for it
            user = new RegularUser({
                fullname: fullname,
                email: email,
                image_URL: image_URL,
                signupMethod: loginMethod,
                lastLoginTimestamp_UNIX: new Date().getTime(),
                isVerified: true,
                isActive: true,
            });
            const result = await user.save();
            console.info("New regular user #" + result._id + " signed up with " + loginMethod + " while s/he attempted to log in");

            const current_time = new Date().getTime();
            const expires_in = (result.signupMethod === "Facebook") ? 6042000 : 3600000; //expires in 100 minutes or 60 minutes
            const expiresIn_as_String = (current_time + expires_in).toString();
            const token = jwt.sign({userId: result.id}, process.env.PERSONAL_JWT_KEY, {expiresIn: expiresIn_as_String});
            return {
                userFullName: result.fullname,
                userImage_URL: result.image_URL,
                token: token,
                tokenExpiration: (expiresIn_as_String)
            };
        }
        if (user.isVerified === false) {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await RegularUser.update({_id: user._id}, {
                $set: {
                    verificationCode: token,
                }
            }, {upsert: true}, function (err) {
            });
            await sendEmail(token, user.email, user._id, "verifyEmail");
            return Error("Your email is not verified. We sent another one.")
        }
        if (user.isResettingPassword === true) {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await RegularUser.update({_id: user._id}, {
                $set: {
                    passwordResetCode: token,
                }
            }, {upsert: true}, function (err) {
            });
            await sendEmail(token, user.email, user._id, "resetPassword");
            return Error("Please complete your password reset. We sent another reset email.")
        }
        if (user.signupMethod !== loginMethod) {
            const methodRenaiming = (user.signupMethod === "Regular") ? "email" : user.signupMethod;
            return Error("You signed up with " + user.signupMethod + ". Log in with " + methodRenaiming + ".")
        }
        if (user.signupMethod === "Regular") {
            const pw_is_correct = await bcrypt.compare(password, user.password);
            if (!pw_is_correct) {
                return Error('Email or password is incorrect');
            }
        }
        if ((user.signupMethod === "Google") || (user.signupMethod === "Facebook")) {
            const lastLoginTime_was_MoreThanOeDayAgo = new Date().getTime() - user.lastLoginTimestamp_UNIX > 86400000;
            if (lastLoginTime_was_MoreThanOeDayAgo) {
                await RegularUser.update({_id: user._id}, {
                    $set: {
                        image_URL: image_URL,
                    }
                }, {upsert: true}, function (err) {
                });
            }
        }

        await RegularUser.update({_id: user._id}, {
            $set: {
                lastLoginTimestamp_UNIX: new Date().getTime(),
            }
        }, {upsert: true}, function (err) {
        });


        if (old_cart_id) {
            const result = await shoppingCartService.mergePreLoginShoppingCartWithExcistingShoppingCart(user._id, old_cart_id);
            if (result == null) {
                console.error("Shopping cart was not properly created for user #", user._id);
                return new Error("Existing shopping cart could not be merged");
            }
            console.log("Merged two shopping carts while user #"+user.id+" attempted to log in.")
        }
        console.info("Regular user #" + user._id + " logged in");
        const current_time = new Date().getTime();
        const expires_in = (user.signupMethod === "Facebook") ? 6042000 : 3600000; //expires in 100 minutes or 60 minutes
        const expiresIn_as_String = (current_time + expires_in).toString();
        const token = jwt.sign({userId: user._id}, process.env.PERSONAL_JWT_KEY, {expiresIn: expiresIn_as_String});
        return {
            userFullName: user.fullname,
            userImage_URL: user.image_URL,
            token: token,
            tokenExpiration: (expiresIn_as_String)
        };
    },
    createBusinessUser: async args => {

        const existingUser = await BusinessUser.findOne({
            email: args.userInput.email
        });

        if (existingUser) return Error('User with that email already exsits. Try logging in');
        const nrOfBusinessUsers = await BusinessUser.find().count();

        const current_time = new Date().getTime();
        const expires_in = 3600000;
        const expiresIn_as_String = (current_time + expires_in).toString();


        const hashedPassword = await bcrypt.hash(args.userInput.password, 12);
        const user = new BusinessUser({
            nr: nrOfBusinessUsers + 1,
            legalname: args.userInput.legalname,
            displayname: args.userInput.displayname,
            logoURL: args.userInput.logoURL,
            description: args.userInput.description,
            IBAN: args.userInput.IBAN,
            email: args.userInput.email,
            password: hashedPassword
        });
        const result = await user.save();

        console.info("New business user #" + result._id + " was created.");
        //TODO: change key
        return jwt.sign({userId: user.id}, process.env.BUSINESS_JWT_KEY, {expiresIn: expiresIn_as_String});
    },
    businessLogin: async ({email, password}) => {
        //1. Validate the email and password are correct
        const user = await BusinessUser.findOne({
            email: email
        });

        if (!user) return Error('BusinessUser does not exist!');

        const pw_is_correct = await bcrypt.compare(password, user.password);
        if (!pw_is_correct) return Error('BusinessPassword is not correct.');
        //2. Return a token
        const current_time = new Date().getTime();
        const expires_in = 3600000; //expires in one hour

        const token = jwt.sign({
            userId: user.id,
            email: user.email
        }, process.env.BUSINESS_JWT_KEY, {
            expiresIn: expires_in + current_time
        });

        return {
            businessDisplayName: user.displayname,
            businessLegalName:user.legalname,
            logoURL:user.logoURL,
            token: token,
            tokenExpiration: expires_in + current_time
        };
    },
    verifyEmail: async ({token}) => {
        const user = await RegularUser.findOne({verificationCode: token});
        if (!user) {
            return Error("Wrong verification code. Try signing up");
        }

        if (user.isVerified === true) {
            return Error("This email is already verified");
        }

        if (Number(user.expiresIn) < new Date().getTime()) {
            token = Math.random().toString(36).substr(13, 17);
            await RegularUser.update({_id: user._id}, {
                $set: {verificationCode: token,}
            }, {upsert: true}, function (err) {
            });
            await sendEmail(token, user.email, user._id, "verifyEmail");
            return Error("Your verification code has expired. We sent a new email");
        }
        await RegularUser.update({email: user.email}, {
            $set: {isVerified: true, isActive: true,}, $unset: {verificationCode: user.verificationCode}
        }, {upsert: true}, function (err) {
        });
        console.info("Verified the email of a new regular user #" + user._id);

        const current_time = new Date().getTime();
        const expires_in = 3600000; //expires in one hour
        const expiresIn_as_String = (current_time + expires_in).toString();
        const jwt_token = jwt.sign({
            userId: user.id,
        }, process.env.PERSONAL_JWT_KEY, {expiresIn: expiresIn_as_String});

        return {
            userFullName: user.fullname,
            userImage_URL: user.image_URL,
            token: jwt_token,
            tokenExpiration: (expiresIn_as_String)
        };
    },
    resetPassword: async ({email, password, mode, token}) => {
        const currentTime = new Date().getTime();
        const emailMode = "resetPassword";

        switch (mode) {
            case "sendEmail": {
                const user = await RegularUser.findOne({email: email});
                //We tell the user that email was sent, but reality it wasn't. We can't tell the user that we didn't send the email. Why? Then they can verify is this email is a registered user
                if (!user || (user.signupMethod === "Google") || (user.signupMethod === "Facebook")) {
                    return true;
                }
                const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                await RegularUser.update({_id: user._id}, {
                    $set: {
                        isResettingPassword: true,
                        passwordResetCode: token,
                        lastLoginTimestamp_UNIX: currentTime
                    }
                }, {upsert: true}, function (err) {
                });
                await sendEmail(token, user.email, user._id, emailMode);
                return true;
            }
            case "resetPassword": {
                const user = await RegularUser.findOne({passwordResetCode: token});
                if (!user) {
                    return Error("Password wasn't reset. Please request another reset")
                }
                if (currentTime - Number(user.lastLoginTimestamp_UNIX) > 3600000) {
                    const newToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                    await RegularUser.update({_id: user._id}, {
                        $set: {
                            isResettingPassword: true,
                            passwordResetCode: newToken,
                            lastLoginTimestamp_UNIX: currentTime
                        }
                    }, {upsert: true}, function (err) {
                    });
                    await sendEmail(token, user.email, user._id, emailMode);
                    return Error("Your resetcode was expired. We sent you another one")
                }
                const hashedPassword = await bcrypt.hash(password, 12);
                await RegularUser.update({_id: user._id}, {
                    $set: {
                        password: hashedPassword,
                    },
                    $unset: {
                        isResettingPassword: user.isResettingPassword,
                        passwordResetCode: user.passwordResetCode
                    }
                }, {upsert: true}, function (err) {
                });
                console.info("User #" + user._id + " successfully reset their password.");
                return true;
            }
            default:
                console.error("Reset method " + mode + " is not supported");
                return Error("We have troble reseting your password");
        }
    },
    makeAddressDefault:async ({jwt_token, location_id}) => {
        const user = await userService.findRegularUserByJWT(jwt_token);
        return await shippingService.makeShippingAddressDefault(user._id, location_id);
    },
    makeAddressNotActive:async ({jwt_token, location_id}) => {
        const user = await userService.findRegularUserByJWT(jwt_token);
        return await shippingService.makeShippingLocationNotActive(user._id, location_id);
    },
};
