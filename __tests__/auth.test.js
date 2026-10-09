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
}));

// Mock JWT helper
jest.mock("../src/pkg/jwt/jwt.pkg", () => ({
  verifyLoginToken: jest.fn(),
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

    it("harus mengembalikan 400 jika password kurang dari 8 karakter", async () => {
      const res = await request(app).post("/auth/register").send({
        username: "testuser",
        email: "user@example.com",
        password: "123",
        confPassword: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("errors");
      expect(RegisterController).not.toHaveBeenCalled();
    });

    it("harus mengembalikan 400 jika password dan confirm password tidak sama", async () => {
      const res = await request(app).post("/auth/register").send({
        username: "testuser",
        email: "user@example.com",
        password: "password123",
        confPassword: "differentpassword",
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
