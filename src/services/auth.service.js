const { hashPassword, verifyPassword } = require("../pkg/bcrypt/password.pkg");
const { TblUsers } = require("../models");
const {
  generateResetPasswordToken,
  verifyResetPasswordToken,
} = require("../pkg/jwt/jwt.pkg");
const { sendResetPasswordEmail } = require("../pkg/nodemailer/mailer.pkg");
const RedisClient = require("../config/data-cache.config");

const RegsiterService = async (data) => {
  let { username, email, password, role, isActive } = data;
  let hashedPassword = await hashPassword(password);
  let userData = await TblUsers.create({
    username,
    email,
    password: hashedPassword,
    role,
    isActive,
  });
  console.log("Data service: ", data);

  return userData;
};

const LoginService = async (email, password) => {
  let user = await TblUsers.findOne({ where: { email } });
  if (!user) {
    throw new Error("Email atau password salah");
  }
  let match = await verifyPassword(password, user.password);
  if (!match) {
    throw new Error("Email atau password salah");
  }
  if (!user.isActive) {
    throw new Error("Akun belum diaktifkan");
  }
  return user;
};

const ProfileService = async (uuid) => {
  let user = await TblUsers.findOne({
    where: { uuid },
    attributes: [
      "uuid",
      "username",
      "email",
      "role",
      "isActive",
      "createdAt",
      "updatedAt",
    ],
  });
  if (!user) {
    throw new Error("User tidak ditemukan");
  }
  return user;
};

const RefreshTokenService = async (uuid) => {
  let user = await TblUsers.findOne({
    attributes: ["uuid", "username", "email", "role"],
    where: { uuid },
  });
  if (!user) {
    throw new Error("User tidak ditemukan");
  }
  return user;
};

const SendMsgForgetPasswordService = async (email) => {
  const user = await TblUsers.findOne({ where: { email } });
  if (!user) {
    throw new Error("Email tidak terdaftar");
  }
  if (!user.isActive) {
    throw new Error("Akun belum diaktifkan");
  }

  const token = generateResetPasswordToken({
    uuid: user.uuid,
    email: user.email,
  });

  const redisKey = `reset_password:${token}`;
  await RedisClient.set(redisKey, user.uuid, { EX: 900 });

  await sendResetPasswordEmail(user.email, token);

  return {
    message: "Email reset password berhasil dikirim",
    email: user.email,
  };
};

const UpdatePasswordUserService = async ({ token, password }) => {
  if (!token) {
    throw new Error("Token reset password diperlukan");
  }

  let decoded;
  try {
    decoded = verifyResetPasswordToken(token);
  } catch (error) {
    throw new Error("Token reset password tidak valid atau kedaluwarsa");
  }

  if (!decoded || !decoded.uuid) {
    throw new Error("Token tidak valid");
  }

  const redisKey = `reset_password:${token}`;
  const savedUuid = await RedisClient.get(redisKey);

  if (!savedUuid) {
    throw new Error(
      "Token reset password tidak valid, kedaluwarsa, atau sudah pernah digunakan",
    );
  }

  if (savedUuid !== decoded.uuid) {
    throw new Error("Token tidak cocok dengan data pengguna");
  }

  const user = await TblUsers.findOne({ where: { uuid: decoded.uuid } });
  if (!user) {
    throw new Error("User tidak ditemukan");
  }

  const hashedPassword = await hashPassword(password);

  await TblUsers.update(
    { password: hashedPassword },
    { where: { uuid: decoded.uuid } },
  );

  // Hapus token reset dari Redis agar tidak bisa digunakan kembali (one-time use)
  await RedisClient.del(redisKey);

  // Invalidate refresh token session pengguna jika ada
  await RedisClient.del(`refresh_token:${decoded.uuid}`);

  return {
    message: "Password berhasil diperbarui",
    uuid: decoded.uuid,
  };
};

module.exports = {
  RegsiterService,
  LoginService,
  ProfileService,
  RefreshTokenService,
  SendMsgForgetPasswordService,
  UpdatePasswordUserService,
};
