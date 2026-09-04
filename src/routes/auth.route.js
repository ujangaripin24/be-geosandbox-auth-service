const express = require('express');
const { RegisterValidation } = require('../validations/auth.validation');
const { RegisterController, ActivationController, LoginController, RefreshController, ProfileController, LogoutController } = require('../controllers/auth.controller');
const { validationResult } = require('express-validator');
const { LoginValidator, RefreshTokenValidator } = require('../validations/login.validation');
const { authenticateTokenGuard } = require('../middlewares/auth.middleware');

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

router.post('/auth/login', LoginValidator, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } else {
        next()
    }
}, LoginController);

router.post('/auth/refresh-token', RefreshTokenValidator, (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    } else {
        next()
    }
}, RefreshController);

router.get('/auth/profile', authenticateTokenGuard, ProfileController);
router.post('/auth/logout', authenticateTokenGuard, LogoutController);

module.exports = router;