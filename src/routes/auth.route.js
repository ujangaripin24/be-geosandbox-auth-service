const express = require("express");
const {
  RegisterValidation,
  ForgetPasswordValidation,
  UpdatePasswordValidation,
  ResendActivationValidation,
} = require("../validations/auth.validation");
const {
  RegisterController,
  ActivationController,
  LoginController,
  RefreshController,
  ProfileController,
  LogoutController,
  SendMsgForgetPasswordController,
  UpdatePasswordUserController,
  ResendActivationController,
} = require("../controllers/auth.controller");
const { validationResult } = require("express-validator");
const {
  LoginValidator,
  RefreshTokenValidator,
} = require("../validations/login.validation");
const {
  authenticateTokenGuard,
  authenticateTokenRole,
} = require("../middlewares/auth.middleware");
const { version } = require("../../package.json");
const { UAParser } = require("ua-parser-js");
const geoip = require("geoip-lite");

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.get("/auth/user-login", (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);

  const browser = parser.getBrowser().name || "Unknown Browser";
  const os = parser.getOS().name || "Unknown OS";
  const device = parser.getDevice().type || "desktop";

  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (ip === "::1" || ip === "127.0.0.1" || ip.includes("::ffff:127.0.0.1")) {
    ip = "103.247.206.1";
  }

  const geo = geoip.lookup(ip);

  const location = geo
    ? {
        country: geo.country,
        region: geo.region,
        city: geo.city,
        timezone: geo.timezone,
        latlng: geo.ll,
      }
    : {
        country: "Unknown",
        region: "Unknown",
        city: "Unknown",
        timezone: "Unknown",
        latlng: [0, 0],
      };

  return res.status(200).json({
    message: "User Login Info Complete",
    data: {
      ip,
      device: { browser, os, device },
      location: location,
    },
  });
});

router.get("/auth/health", (req, res) => {
  res.status(200).json({
    status: 200,
    versionApp: version,
    message: "[SERVICE-AUTH] Server Berhasil Berjalan",
    date: new Date().toISOString().replace("T", " ").substring(0, 19),
  });
});

router.post(
  "/auth/register",
  RegisterValidation,
  handleValidation,
  RegisterController,
);

router.get("/auth/activation", ActivationController);

router.post(
  "/auth/resend-activation",
  ResendActivationValidation,
  handleValidation,
  ResendActivationController,
);

router.post("/auth/login", LoginValidator, handleValidation, LoginController);

router.post(
  "/auth/refresh-token",
  RefreshTokenValidator,
  handleValidation,
  RefreshController,
);

router.post(
  "/auth/forgot-password",
  ForgetPasswordValidation,
  handleValidation,
  SendMsgForgetPasswordController,
);

router.post(
  "/auth/reset-password",
  UpdatePasswordValidation,
  handleValidation,
  UpdatePasswordUserController,
);

router.get("/auth/profile", authenticateTokenGuard, ProfileController);
router.post("/auth/logout", authenticateTokenGuard, LogoutController);

router.get(
  "/auth/profile/admin",
  authenticateTokenGuard,
  authenticateTokenRole(["admin"]),
  (req, res, next) => {
    return res.status(200).json({
      message: "Admin role access",
    });
  },
);

router.get(
  "/auth/profile/user",
  authenticateTokenGuard,
  authenticateTokenRole(["user"]),
  (req, res, next) => {
    return res.status(200).json({
      message: "User role access",
    });
  },
);

module.exports = router;
