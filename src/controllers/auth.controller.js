const { validationResult } = require("express-validator");
const { formatError } = require("../pkg/error-formatter.pkg");
const {
  RegsiterService,
  LoginService,
  ProfileService,
  RefreshTokenService,
  SendMsgForgetPasswordService,
  UpdatePasswordUserService,
  ResendActivationService,
} = require("../services/auth.service");
const {
  generateRegisterToken,
  verifyRegisterToken,
  generateLoginToken,
  verifyRefreshToken,
  generateRefreshToken,
} = require("../pkg/jwt/jwt.pkg");
const { sendActivationEmail } = require("../pkg/nodemailer/mailer.pkg");
const { TblUsers } = require("../models");
const RedisClient = require("../config/data-cache.config");
const {
  deliverMessageData,
} = require("../pkg/message-broker/message-broker.pkg");

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
      const token = generateRegisterToken({
        uuid: userData.uuid,
        email: userData.email,
      });

      const redisKey = `activation_account:${token}`;
      await RedisClient.set(redisKey, "unused", { EX: 300 });

      await sendActivationEmail(userData.email, token);
    } catch (emailError) {
      await TblUsers.destroy({ where: { uuid: userData.uuid } });
      throw new Error(`Gagal mengirim email verifikasi: ${emailError.message}`);
    }

    return res.status(201).json({
      message:
        "Registrasi berhasil. Silakan cek email Anda untuk mengaktifkan akun.",
    });
  } catch (error) {
    console.error("Error in RegisterController:", error);
    res.status(500).json(formatError(error.message, "server"));
  }
};

const ActivationController = async (req, res, next) => {
  const { token } = req.query;
  if (!token) {
    return res
      .status(400)
      .json(formatError("Token aktivasi diperlukan", "token"));
  }

  try {
    const decoded = verifyRegisterToken(token);

    const redisKey = `activation_account:${token}`;
    const tokenStatus = await RedisClient.get(redisKey);

    if (!tokenStatus) {
      return res
        .status(400)
        .json(
          formatError(
            "Link aktivasi tidak valid, kedaluwarsa, atau sudah pernah digunakan",
            "token",
          ),
        );
    }

    const user = await TblUsers.findOne({ where: { uuid: decoded.uuid } });

    const [updatedCount] = await TblUsers.update(
      { isActive: true },
      {
        where: { uuid: decoded.uuid },
      },
    );

    if (updatedCount === 0) {
      return res
        .status(400)
        .json(formatError("Akun sudah pernah diaktifkan sebelumnya", "token"));
    }

    console.log("Data berhasil diupdate: ", updatedCount);

    await RedisClient.del(redisKey);

    await deliverMessageData(["user_activated", "gis_user_activated"], {
      uuid: decoded.uuid,
      username: user ? user.username : "",
      email: user ? user.email : "",
    });

    return res
      .status(200)
      .json({ message: "Akun berhasil diaktifkan! Silakan login." });
  } catch (error) {
    console.error("Activation failed:", error);
    return res
      .status(400)
      .json(formatError("Link aktivasi tidak valid atau kedaluwarsa", "token"));
  }
};

const LoginController = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  let body = req.body;
  const clientType = (req.headers["x-client-type"] || "web").toLowerCase();
  console.log(`Login Controller [Client: ${clientType}]:`, body.email);

  try {
    let user = await LoginService(body.email, body.password);
    let token = generateLoginToken(user);
    let refreshToken = generateRefreshToken(user);

    await RedisClient.set(`refresh_token:${user.uuid}`, refreshToken);

    if (clientType === "web") {
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
      });

      return res.status(200).json({
        message: "Login Sukses",
        data: { token },
      });
    }

    return res.status(200).json({
      message: "Login Sukses",
      data: { token, refreshToken },
    });
  } catch (error) {
    if (
      error.message === "Email atau password salah" ||
      error.message === "Akun belum diaktifkan"
    ) {
      return res.status(401).json(formatError(error.message, "message"));
    }
    res.status(500).json(formatError(error.message, "server"));
  }
};

const ProfileController = async (req, res, next) => {
  let uuid = req.user.uuid;
  console.log("Profile Controller: ", uuid);

  try {
    let user = await ProfileService(uuid);
    return res.status(200).json({ message: "Profile user", data: user });
  } catch (error) {
    res.status(500).json(formatError(error.message, "server"));
  }
};

const RefreshController = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  if (!refreshToken) {
    return res
      .status(400)
      .json(formatError("Refresh token tidak ditemukan", "refreshToken"));
  }

  try {
    let decoded = verifyRefreshToken(refreshToken);
    let savedToken = await RedisClient.get(`refresh_token:${decoded.uuid}`);

    if (!savedToken || savedToken !== refreshToken) {
      return res
        .status(403)
        .json(
          formatError(
            "Refresh token tidak valid atau sudah kadaluarsa",
            "refreshToken",
          ),
        );
    }

    let user = await RefreshTokenService(decoded.uuid);
    let newToken = generateLoginToken(user);

    return res
      .status(200)
      .json({ message: "Token refresh success", data: { token: newToken } });
  } catch (error) {
    res
      .status(401)
      .json(
        formatError("Refresh token tidak valid atau expired", "refreshToken"),
      );
  }
};

const LogoutController = async (req, res, next) => {
  let uuid = req.user.uuid;
  try {
    await RedisClient.del(`refresh_token:${uuid}`);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({ message: "Logout success" });
  } catch (error) {
    res.status(500).json(formatError(error.message, "server"));
  }
};

const SendMsgForgetPasswordController = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const result = await SendMsgForgetPasswordService(email);
    return res.status(200).json({
      message:
        "Link reset password telah dikirim ke email Anda. Silakan cek inbox Anda.",
      data: result,
    });
  } catch (error) {
    console.error("Error in SendMsgForgetPasswordController:", error.message);
    if (
      error.message === "Email tidak terdaftar" ||
      error.message === "Akun belum diaktifkan"
    ) {
      return res.status(404).json(formatError(error.message, "email"));
    }
    return res.status(500).json(formatError(error.message, "server"));
  }
};

const UpdatePasswordUserController = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const token =
    req.query.token ||
    req.body.token ||
    req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res
      .status(400)
      .json(formatError("Token reset password diperlukan", "token"));
  }

  const { password } = req.body;

  try {
    const result = await UpdatePasswordUserService({ token, password });
    return res.status(200).json({
      message:
        "Password berhasil diperbarui. Silakan login kembali dengan password baru.",
      data: result,
    });
  } catch (error) {
    console.error("Error in UpdatePasswordUserController:", error.message);
    if (
      error.message.includes("tidak valid") ||
      error.message.includes("kedaluwarsa") ||
      error.message.includes("sudah pernah digunakan") ||
      error.message.includes("tidak cocok") ||
      error.message.includes("diperlukan")
    ) {
      return res.status(400).json(formatError(error.message, "token"));
    }
    if (error.message === "User tidak ditemukan") {
      return res.status(404).json(formatError(error.message, "user"));
    }
    return res.status(500).json(formatError(error.message, "server"));
  }
};

const ResendActivationController = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    const result = await ResendActivationService(email);
    return res.status(200).json({
      message:
        "Link aktivasi baru telah dikirim ke email Anda. Silakan cek inbox Anda.",
      data: result,
    });
  } catch (error) {
    console.error("Error in ResendActivationController:", error.message);
    if (error.message === "Email tidak terdaftar") {
      return res.status(404).json(formatError(error.message, "email"));
    }
    if (error.message === "Akun sudah diaktifkan, silakan login") {
      return res.status(400).json(formatError(error.message, "email"));
    }
    return res.status(500).json(formatError(error.message, "server"));
  }
};

module.exports = {
  RegisterController,
  ActivationController,
  LoginController,
  ProfileController,
  RefreshController,
  LogoutController,
  SendMsgForgetPasswordController,
  UpdatePasswordUserController,
  ResendActivationController,
};
