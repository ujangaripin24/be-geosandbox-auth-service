const jwt = require('jsonwebtoken');
const dotenv = require('dotenv')

dotenv.config();

const registerToken = process.env.REGISTER_TOKEN;
const accessToken = process.env.ACCESS_TOKEN || process.env.REGISTER_TOKEN;
const refreshToken = process.env.REFRESH_TOKEN || process.env.REGISTER_TOKEN;

const generateRegisterToken = (user) => {
    return jwt.sign(user, registerToken, { expiresIn: '5m' });
}

const verifyRegisterToken = (token) => {
    return jwt.verify(token, registerToken);
}

const generateLoginToken = (user) => {
    let token = jwt.sign({
        uuid: user.uuid,
        email: user.email,
        role: user.role
    }, accessToken, {
        expiresIn: '15m'
    });
    return token;
}

const verifyLoginToken = (token) => {
    return jwt.verify(token, accessToken);
}

const generateRefreshToken = (user) => {
    let token = jwt.sign({
        uuid: user.uuid,
        email: user.email,
        role: user.role
    }, refreshToken, {
        expiresIn: '7d'
    });
    return token;
}

const verifyRefreshToken = (token) => {
    return jwt.verify(token, refreshToken);
}

module.exports = {
    generateRegisterToken,
    verifyRegisterToken,
    generateLoginToken,
    verifyLoginToken,
    generateRefreshToken,
    verifyRefreshToken
}