require('dotenv').config();

const user_schemas = require('../models/user');
const RegularUser = user_schemas.RegularUser;

exports.socialRegisterUser = async function socialRegisterUser(fullName,email,imageUrl,signUpMethod) {
   const user = new RegularUser({
        fullname: fullName,
        email: email,
        image_URL: imageUrl,
        signupMethod: signUpMethod,
        lastLoginTimestamp_UNIX: new Date().getTime(),
        isVerified: true,
        isActive: true,
    });
    user.save();
    return user;
};

exports.regularRegisterUser = async function regularRegisterUser(fullName,email,password,verificationCode) {
    const user = new RegularUser({
        fullname: fullName,
        email: email,
        password:await bcrypt.hash(password, 12),
        verificationCode:verificationCode,
        lastLoginTimestamp_UNIX: new Date().getTime()
    });

    user.save();
    return user;
};

