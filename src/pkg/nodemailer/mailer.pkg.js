const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const pug = require("pug");
const path = require("path");

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.SMTP_SERVICE || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure:
    process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendActivationEmail = async (email, token) => {
  const activationLink = `${process.env.BASE_URL}/api/v1/auth/activation?token=${token}`;

  const templatePath = path.join(
    __dirname,
    "../../html/message-activation.html.pug"
  );

  const html = pug.renderFile(templatePath, {
    email,
    token,
    activationLink,
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Aktivasi Akun Anda - GeoSandbox",
    html,
  };

  return transporter.sendMail(mailOptions);
};

const sendResetPasswordEmail = async (email, token) => {
  const resetLink = `${process.env.FRONTEND_URL || process.env.BASE_URL}/api/v1/auth/reset-password?token=${token}`;

  const templatePath = path.join(
    __dirname,
    "../../html/message-forget-password.html.pug"
  );

  const html = pug.renderFile(templatePath, {
    email,
    token,
    resetLink,
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: "Reset Password Akun Anda - GeoSandbox",
    html,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = {
  sendActivationEmail,
  sendResetPasswordEmail,
};
