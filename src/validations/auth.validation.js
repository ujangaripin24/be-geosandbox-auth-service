const { body, validationResult } = require('express-validator');
const db = require('../models/index')
const TblUsers = db.TblUsers

const RegisterValidation = [
    body('username').notEmpty().withMessage("Username tidak boleh kosong"),
    body('email')
        .notEmpty().withMessage("Email tidak boleh kosong")
        .isEmail().withMessage("Email tidak valid")
        .custom(async (a) => {
            try {
                const existingUser = await TblUsers.findOne({ where: { email: a } });
                if (existingUser) {
                    throw new Error("email sudah terdaftar");
                }
                return true;
            } catch (error) {
                if (error.message === "email sudah terdaftar") {
                    throw error;
                }
                console.error("Database error during email validation:", error.message);
                throw new Error("Gagal memverifikasi email pada database");
            }
        }),
    body('password').notEmpty().withMessage("Password tidak boleh kosong").isLength({ min: 8 }).withMessage("Password minimal 8 karakter"),
    body('confPassword').notEmpty().withMessage("Confirm password tidak boleh kosong").custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error("Password dan confirm password tidak sama");
        }
        return true;
    }),
]

module.exports = {
    RegisterValidation
}