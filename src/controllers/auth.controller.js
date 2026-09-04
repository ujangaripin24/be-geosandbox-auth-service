const { validationResult } = require("express-validator");
const { formatError } = require("../pkg/error-formatter.pkg");
const { RegsiterService, LoginService, ProfileService, RefreshTokenService } = require("../services/auth.services");
const { generateRegisterToken, verifyRegisterToken, generateLoginToken, verifyRefreshToken, generateRefreshToken } = require("../pkg/jwt.pkg");
const { sendActivationEmail } = require("../pkg/mailer.pkg");
const { TblUsers } = require("../models");
const RedisClient = require("../config/data-cache.config");

const RegisterController = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    let body = req.body;
    console.log("Data controller: ", body);

    try {
        const userData = await RegsiterService(body);

        try {
            const token = generateRegisterToken({ uuid: userData.uuid, email: userData.email });

            const redisKey = `activation_account:${token}`;
            await RedisClient.set(redisKey, 'unused', { EX: 300 });

            await sendActivationEmail(userData.email, token);
        } catch (emailError) {
            await TblUsers.destroy({ where: { uuid: userData.uuid } });
            throw new Error(`Gagal mengirim email verifikasi: ${emailError.message}`);
        }

        return res.status(201).json({
            message: "Registrasi berhasil. Silakan cek email Anda untuk mengaktifkan akun."
        });
    } catch (error) {
        console.error("Error in RegisterController:", error);
        res.status(500).json(formatError(error.message, "server"));
    }
}

const ActivationController = async (req, res, next) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).json(formatError("Token aktivasi diperlukan", "token"));
    }

    try {
        const decoded = verifyRegisterToken(token);

        const redisKey = `activation_account:${token}`;
        const tokenStatus = await RedisClient.get(redisKey);

        if (!tokenStatus) {
            return res.status(400).json(formatError("Link aktivasi tidak valid, kedaluwarsa, atau sudah pernah digunakan", "token"));
        }

        const [updatedCount] = await TblUsers.update({ isActive: true }, {
            where: { uuid: decoded.uuid }
        });

        if (updatedCount === 0) {
            return res.status(400).json(formatError("Akun sudah pernah diaktifkan sebelumnya", "token"));
        }

        console.log("Data berhasil diupdate: ", updatedCount)

        await RedisClient.del(redisKey);

        return res.status(200).json({ message: "Akun berhasil diaktifkan! Silakan login." });
    } catch (error) {
        console.error("Activation failed:", error);
        return res.status(400).json(formatError("Link aktivasi tidak valid atau kedaluwarsa", "token"));
    }
};

const LoginController = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    let body = req.body;
    console.log("Login Controller: ", body)
    try {
        let user = await LoginService(body.email, body.password);
        let token = generateLoginToken(user);
        let refreshToken = generateRefreshToken(user);
        await RedisClient.set(`refresh_token:${user.uuid}`, refreshToken)
        return res.status(200).json({ message: "Login Sukses", data: { token, refreshToken } });
    } catch (error) {
        if (error.message === "Email atau password salah" || error.message === "Akun belum diaktifkan") {
            return res.status(401).json(formatError(error.message, "message"));
        }
        res.status(500).json(formatError(error.message, "server"));
    }
}

const ProfileController = async (req, res, next) => {
    let uuid = req.user.uuid
    console.log("Profile Controller: ", uuid)

    try {
        let user = await ProfileService(uuid);
        return res.status(200).json({ message: "Profile user", data: user });
    } catch (error) {
        res.status(500).json(formatError(error.message, "server"));
    }
}

const RefreshController = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    let { refreshToken } = req.body;
    try {
        let decoded = verifyRefreshToken(refreshToken);
        let savedToken = await RedisClient.get(`refresh_token:${decoded.uuid}`);

        if (!savedToken || savedToken !== refreshToken) {
            return res.status(403).json(formatError("Refresh token tidak valid atau sudah kadaluarsa", "refreshToken"));
        }

        let user = await RefreshTokenService(decoded.uuid);
        let newToken = generateLoginToken(user);

        return res.status(200).json({ message: "Token refresh success", data: { token: newToken } });

    } catch (error) {
        res.status(401).json(formatError("Refresh token tidak valid atau expired", "refreshToken"));
    }
}

const LogoutController = async (req, res, next) => {
    let uuid = req.user.uuid;
    try {
        await RedisClient.del(`refresh_token:${uuid}`);
        return res.status(200).json({ message: "Logout success" });
    } catch (error) {
        res.status(500).json(formatError(error.message, "server"));
    }
}

module.exports = {
    RegisterController,
    ActivationController,
    LoginController,
    ProfileController,
    RefreshController,
    LogoutController
}