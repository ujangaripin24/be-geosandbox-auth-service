const { body } = require("express-validator");

const LoginValidator = [
    body('email').notEmpty().withMessage("Email tidak boleh kosong"),
    body('password').notEmpty().withMessage("Password tidak boleh kosong"),
]

const RefreshTokenValidator = [
    (req, res, next) => {
        const token = req.cookies?.refreshToken || req.body?.refreshToken;
        if (!token) {
            return res.status(400).json({
                errors: [
                    {
                        type: "field",
                        value: "",
                        msg: "Refresh token tidak boleh kosong",
                        path: "refreshToken",
                        location: "body/cookie"
                    }
                ]
            });
        }
        next();
    }
];

module.exports = {
    LoginValidator,
    RefreshTokenValidator
}