const request = require("supertest");
const express = require("express");
const cookieParser = require("cookie-parser");
const { version } = require("../package.json");

jest.mock("../src/controllers/auth.controller", () => ({
  RegisterController: jest.fn((req, res) =>
    res.status(201).json({
      message: "Registrasi berhasil, silakan cek email untuk aktivasi.",
    }),
  ),
  ActivationController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Akun berhasil diaktivasi.",
    }),
  ),
  LoginController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Login berhasil.",
      accessToken: "mock-access-token",
    }),
  ),
  RefreshController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Token berhasil diperbarui.",
      accessToken: "mock-new-access-token",
    }),
  ),
  ProfileController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Profile user",
      data: req.user,
    }),
  ),
  LogoutController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Logout berhasil.",
    }),
  ),
  SendMsgForgetPasswordController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Link reset password telah dikirim ke email Anda. Silakan cek inbox Anda.",
      data: {
        message: "Email reset password berhasil dikirim",
        email: req.body.email,
      },
    }),
  ),
  UpdatePasswordUserController: jest.fn((req, res) =>
    res.status(200).json({
      message: "Password berhasil diperbarui. Silakan login kembali dengan password baru.",
      data: {
        message: "Password berhasil diperbarui",
        uuid: "mock-uuid",
      },
    }),
  ),
}));

// Mock JWT helper
jest.mock("../src/pkg/jwt/jwt.pkg", () => ({
  verifyLoginToken: jest.fn(),
  generateResetPasswordToken: jest.fn(),
  verifyResetPasswordToken: jest.fn(),
}));

// Mock Redis Client
jest.mock("../src/config/data-cache.config", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

// Mock Sequelize Database Models
jest.mock("../src/models/index", () => ({
  TblUsers: {
    findOne: jest.fn(),
    update: jest.fn(),
  },
}));

const { verifyLoginToken } = require("../src/pkg/jwt/jwt.pkg");
const RedisClient = require("../src/config/data-cache.config");
const { TblUsers } = require("../src/models/index");
const {
  RegisterController,
  ActivationController,
  LoginController,
  RefreshController,
  ProfileController,
  LogoutController,
  SendMsgForgetPasswordController,
  UpdatePasswordUserController,
} = require("../src/controllers/auth.controller");
const authRouter = require("../src/routes/auth.route");

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(authRouter);
app.use("/api/v1", authRouter);

describe("Auth Routes & Validations Unit Testing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /auth/health", () => {
    it("harus mengembalikan status 200 beserta versionApp", async () => {
      const res = await request(app).get("/auth/health");

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          status: 200,
          versionApp: version,
          message: "[SERVICE-AUTH] Server Berhasil Berjalan",
          date: expect.any(String),
        }),
      );
    });
  });

  describe("POST /auth/register (Validation & Controller)", () => {
    it("harus mengembalikan 400 jika field wajib kosong", async () => {
      const res = await request(app).post("/auth/register").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(RegisterController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 jika format email tidak valid", async () => {
      const res = await request(app).post("/auth/register").send({
        username: "testuser",
        email: "invalid-email-format",
        password: "password123",
        confPassword: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(RegisterController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 jika email sudah terdaftar di database", async () => {
      TblUsers.findOne.mockResolvedValue({
        id: 1,
        email: "existing@example.com",
      });

      const res = await request(app).post("/auth/register").send({
        username: "testuser",
        email: "existing@example.com",
        password: "password123",
        confPassword: "password123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(RegisterController).not.toHaveBeenCalled();
    });

    it("harus memanggil RegisterController dan mengembalikan 201 jika semua field valid dan email belum terdaftar", async () => {
      TblUsers.findOne.mockResolvedValue(null);

      const res = await request(app).post("/auth/register").send({
        username: "newuser",
        email: "newuser@example.com",
        password: "password123",
        confPassword: "password123",
      });

      expect(res.status).toBe(201);
      expect(RegisterController).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /auth/activation", () => {
    it("harus memanggil ActivationController dan mengembalikan 200", async () => {
      const res = await request(app).get(
        "/auth/activation?token=activation-token-123",
      );

      expect(res.status).toBe(200);
      expect(ActivationController).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /auth/login (Validation & Controller)", () => {
    it("harus mengembalikan 400 jika email atau password kosong", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "",
        password: "",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(LoginController).not.toHaveBeenCalled();
    });

    it("harus memanggil LoginController dan mengembalikan 200 jika email dan password terisi", async () => {
      const res = await request(app).post("/auth/login").send({
        email: "user@example.com",
        password: "password123",
      });

      expect(res.status).toBe(200);
      expect(LoginController).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /auth/refresh-token (Validation & Controller)", () => {
    it("harus mengembalikan 400 jika refreshToken tidak ditemukan di body maupun cookie", async () => {
      const res = await request(app).post("/auth/refresh-token").send({});

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(RefreshController).not.toHaveBeenCalled();
    });

    it("harus memanggil RefreshController jika refreshToken dikirimkan melalui body", async () => {
      const res = await request(app)
        .post("/auth/refresh-token")
        .send({ refreshToken: "valid-body-refresh-token" });

      expect(res.status).toBe(200);
      expect(RefreshController).toHaveBeenCalledTimes(1);
    });

    it("harus memanggil RefreshController jika refreshToken dikirimkan melalui cookie", async () => {
      const res = await request(app)
        .post("/auth/refresh-token")
        .set("Cookie", ["refreshToken=valid-cookie-refresh-token"]);

      expect(res.status).toBe(200);
      expect(RefreshController).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /auth/forget-password & /auth/forgot-password (Validation & Controller)", () => {
    it("harus mengembalikan 400 jika email kosong", async () => {
      const res = await request(app).post("/auth/forget-password").send({
        email: "",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(SendMsgForgetPasswordController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 jika format email tidak valid", async () => {
      const res = await request(app).post("/auth/forget-password").send({
        email: "bukan-email-valid",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(SendMsgForgetPasswordController).not.toHaveBeenCalled();
    });

    it("harus memanggil SendMsgForgetPasswordController dan mengembalikan 200 jika email valid", async () => {
      const res = await request(app).post("/auth/forget-password").send({
        email: "user@example.com",
      });

      expect(res.status).toBe(200);
      expect(SendMsgForgetPasswordController).toHaveBeenCalledTimes(1);
    });

    it("harus memanggil SendMsgForgetPasswordController jika mengakses route alias /auth/forgot-password", async () => {
      const res = await request(app).post("/auth/forgot-password").send({
        email: "user@example.com",
      });

      expect(res.status).toBe(200);
      expect(SendMsgForgetPasswordController).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /auth/update-password & /auth/reset-password (Validation & Controller)", () => {
    it("harus mengembalikan 400 jika password kosong", async () => {
      const res = await request(app).post("/auth/update-password").send({
        password: "",
        confPassword: "",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(UpdatePasswordUserController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 jika password kurang dari 8 karakter", async () => {
      const res = await request(app).post("/auth/update-password").send({
        password: "short",
        confPassword: "short",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(UpdatePasswordUserController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 jika confPassword tidak cocok dengan password", async () => {
      const res = await request(app).post("/auth/update-password").send({
        password: "newPassword123",
        confPassword: "differentPassword123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(UpdatePasswordUserController).not.toHaveBeenCalled();
    });

    it("harus memanggil UpdatePasswordUserController dan mengembalikan 200 jika password dan confPassword valid", async () => {
      const res = await request(app).post("/auth/update-password?token=mock-token").send({
        password: "newPassword123",
        confPassword: "newPassword123",
      });

      expect(res.status).toBe(200);
      expect(UpdatePasswordUserController).toHaveBeenCalledTimes(1);
    });

    it("harus memanggil UpdatePasswordUserController jika mengakses route alias /auth/reset-password", async () => {
      const res = await request(app).post("/auth/reset-password?token=mock-token").send({
        password: "newPassword123",
        confPassword: "newPassword123",
      });

      expect(res.status).toBe(200);
      expect(UpdatePasswordUserController).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /auth/profile", () => {
    it("harus mengembalikan 400 jika Authorization header tidak ada", async () => {
      const res = await request(app).get("/auth/profile");

      expect(res.status).toBe(400);
      expect(ProfileController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 403 jika token JWT tidak valid atau kadaluarsa", async () => {
      verifyLoginToken.mockImplementation(() => {
        throw new Error("Token expired");
      });

      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", "Bearer invalid-token");

      expect(res.status).toBe(403);
      expect(ProfileController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 401 jika session token tidak ditemukan di Redis", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "user-uuid-1",
        role: "user",
      });
      RedisClient.get.mockResolvedValue(null);

      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(401);
      expect(ProfileController).not.toHaveBeenCalled();
    });

    it("harus memanggil ProfileController dan mengembalikan 200 jika token dan session Redis valid", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "user-uuid-1",
        role: "user",
      });
      RedisClient.get.mockResolvedValue("active-session-token");

      const res = await request(app)
        .get("/auth/profile")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(ProfileController).toHaveBeenCalledTimes(1);
    });
  });

  describe("POST /auth/logout", () => {
    it("harus mengembalikan 400 jika Authorization header tidak ada", async () => {
      const res = await request(app).post("/auth/logout");

      expect(res.status).toBe(400);
      expect(LogoutController).not.toHaveBeenCalled();
    });

    it("harus memanggil LogoutController dan mengembalikan 200 jika token dan session valid", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "user-uuid-1",
        role: "user",
      });
      RedisClient.get.mockResolvedValue("active-session-token");

      const res = await request(app)
        .post("/auth/logout")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(LogoutController).toHaveBeenCalledTimes(1);
    });
  });

  describe("GET /auth/profile/admin & GET /auth/profile/user (Role Access)", () => {
    it("harus mengembalikan 403 jika role pengguna bukan admin saat akses /auth/profile/admin", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "user-uuid-1",
        role: "user",
      });
      RedisClient.get.mockResolvedValue("active-session-token");

      const res = await request(app)
        .get("/auth/profile/admin")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(403);
    });

    it("harus mengembalikan 200 jika role pengguna adalah admin saat akses /auth/profile/admin", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "admin-uuid-1",
        role: "admin",
      });
      RedisClient.get.mockResolvedValue("active-session-token");

      const res = await request(app)
        .get("/auth/profile/admin")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Admin role access",
      });
    });

    it("harus mengembalikan 403 jika role pengguna bukan user saat akses /auth/profile/user", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "guest-uuid-1",
        role: "guest",
      });
      RedisClient.get.mockResolvedValue("active-session-token");

      const res = await request(app)
        .get("/auth/profile/user")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(403);
    });

    it("harus mengembalikan 200 jika role pengguna adalah user saat akses /auth/profile/user", async () => {
      verifyLoginToken.mockReturnValue({
        uuid: "user-uuid-1",
        role: "user",
      });
      RedisClient.get.mockResolvedValue("active-session-token");

      const res = await request(app)
        .get("/auth/profile/user")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "User role access",
      });
    });
  });
});
