const express = require('express');
const { RegisterValidation } = require('../validations/auth.validation');
const { RegisterController, ActivationController } = require('../controllers/auth.controller');
const { validationResult } = require('express-validator');

const router = express.Router();

router.post('/auth/register', RegisterValidation, (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } else {
        next()
    }
}, RegisterController);

router.get('/auth/activation', ActivationController);

module.exports = router;