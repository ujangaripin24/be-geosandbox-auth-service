const { body } = require("express-validator");

const LoginValidator = [
    body('email').notEmpty().withMessage("Email tidak boleh kosong"),
    body('password').notEmpty().withMessage("Password tidak boleh kosong"),
]

const RefreshTokenValidator = [
    body('refreshToken').notEmpty().withMessage("Refresh token tidak boleh kosong"),
]

module.exports = {
    LoginValidator,
    RefreshTokenValidator
}