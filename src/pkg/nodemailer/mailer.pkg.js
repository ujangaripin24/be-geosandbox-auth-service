const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || process.env.SMTP_SERVICE || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_SECURE === true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const sendActivationEmail = async (email, token) => {
    const activationLink = `${process.env.BASE_URL}/api/v1/auth/activation?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Aktivasi Akun Anda',
        html: `
            <h3>Aktivasi Akun</h3>
            <p>Silakan klik link di bawah ini untuk mengaktifkan akun Anda:</p>
            <p><a href="${activationLink}">${activationLink}</a></p>
            <p>Link ini hanya berlaku selama 5 menit.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (email, token) => {
    const resetLink = `${process.env.FRONTEND_URL || process.env.BASE_URL}/api/v1/auth/update-password?token=${token}`;

    const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'Reset Password Akun Anda',
        html: `
            <h3>Reset Password Akun</h3>
            <p>Halo,</p>
            <p>Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.</p>
            <p>Silakan klik link di bawah ini untuk mengatur ulang kata sandi Anda:</p>
            <p><a href="${resetLink}" target="_blank">${resetLink}</a></p>
            <p>Atau gunakan token berikut:</p>
            <p style="background-color: #f4f4f4; padding: 10px; border-radius: 4px; font-family: monospace;">${token}</p>
            <p>Link dan token ini hanya berlaku selama 15 menit dan hanya dapat digunakan 1 kali.</p>
            <p>Jika Anda tidak merasa meminta reset password, silakan abaikan email ini.</p>
        `
    };

    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendActivationEmail,
    sendResetPasswordEmail
};
