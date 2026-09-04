const { hashPassword } = require('../pkg/password.pkg')
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

module.exports = {
    RegsiterService
}