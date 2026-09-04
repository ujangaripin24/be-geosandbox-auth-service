const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')

dotenv.config();

const registerToken = process.env.REGISTER_TOKEN

const generateRegisterToken = (user) => {
    return jwt.sign(user, registerToken, { expiresIn: '5m' });
}

const verifyRegisterToken = (token) => {
    return jwt.verify(token, registerToken);
}

module.exports = {
    generateRegisterToken,
    verifyRegisterToken
}