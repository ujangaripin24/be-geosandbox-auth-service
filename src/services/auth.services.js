const { hashPassword, verifyPassword } = require('../pkg/password.pkg')
const { TblUsers } = require('../models')

const RegsiterService = async (data) => {
    let { username, email, password, role, isActive } = data;
    let hashedPassword = await hashPassword(password)
    let userData = await TblUsers.create({
        username,
        email,
        password: hashedPassword,
        role,
        isActive
    })
    console.log("Data service: ", data);

    return userData
}

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
}

const ProfileService = async (uuid) => {
    let user = await TblUsers.findOne({
        where: { uuid },
        attributes: ["uuid", "username", "email", "role", "isActive", "createdAt", "updatedAt"],
    })
    if (!user) {
        throw new Error("User tidak ditemukan");
    }
    return user
}

const RefreshTokenService = async (uuid) => {
    let user = await TblUsers.findOne({
        attributes: ["uuid", "username", "email", "role"],
        where: { uuid }
    });
    if (!user) {
        throw new Error("User tidak ditemukan");
    }
    return user;
}

module.exports = {
    RegsiterService,
    LoginService,
    ProfileService,
    RefreshTokenService
}