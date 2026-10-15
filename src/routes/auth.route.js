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

const router = express.Router();

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

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
