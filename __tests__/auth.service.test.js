const {
  SendMsgForgetPasswordService,
  UpdatePasswordUserService,
  ResendActivationService,
} = require("../src/services/auth.service");

jest.mock("../src/models", () => ({
  TblUsers: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock("../src/pkg/jwt/jwt.pkg", () => ({
  generateRegisterToken: jest.fn(),
  generateResetPasswordToken: jest.fn(),
  verifyResetPasswordToken: jest.fn(),
}));

jest.mock("../src/pkg/nodemailer/mailer.pkg", () => ({
  sendActivationEmail: jest.fn(),
  sendResetPasswordEmail: jest.fn(),
}));

jest.mock("../src/config/data-cache.config", () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}));

jest.mock("../src/pkg/bcrypt/password.pkg", () => ({
  hashPassword: jest.fn(),
  verifyPassword: jest.fn(),
}));

const { TblUsers } = require("../src/models");
const {
  generateRegisterToken,
  generateResetPasswordToken,
  verifyResetPasswordToken,
} = require("../src/pkg/jwt/jwt.pkg");
const {
  sendActivationEmail,
  sendResetPasswordEmail,
} = require("../src/pkg/nodemailer/mailer.pkg");
const RedisClient = require("../src/config/data-cache.config");
const { hashPassword } = require("../src/pkg/bcrypt/password.pkg");

describe("Auth Service - Forgot & Update Password Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  describe("ResendActivationService", () => {
    it("harus throw error jika email tidak terdaftar di database", async () => {
      TblUsers.findOne.mockResolvedValue(null);

      await expect(
        ResendActivationService("notfound@example.com")
      ).rejects.toThrow("Email tidak terdaftar");

      expect(TblUsers.findOne).toHaveBeenCalledWith({
        where: { email: "notfound@example.com" },
      });
      expect(RedisClient.set).not.toHaveBeenCalled();
      expect(sendActivationEmail).not.toHaveBeenCalled();
    });

    it("harus throw error jika akun sudah aktif (isActive: true)", async () => {
      TblUsers.findOne.mockResolvedValue({
        uuid: "active-uuid-1",
        email: "alreadyactive@example.com",
        isActive: true,
      });

      await expect(
        ResendActivationService("alreadyactive@example.com")
      ).rejects.toThrow("Akun sudah diaktifkan, silakan login");

      expect(RedisClient.set).not.toHaveBeenCalled();
      expect(sendActivationEmail).not.toHaveBeenCalled();
    });

    it("harus berhasil generate register token, simpan di Redis dengan TTL 5 menit, dan kirim ulang email aktivasi jika belum aktif", async () => {
      const mockUser = {
        uuid: "unactive-uuid-123",
        email: "pending@example.com",
        isActive: false,
      };
      TblUsers.findOne.mockResolvedValue(mockUser);
      generateRegisterToken.mockReturnValue("mock-register-token-abc");
      RedisClient.set.mockResolvedValue("OK");
      sendActivationEmail.mockResolvedValue({ messageId: "msg-id-123" });

      const result = await ResendActivationService("pending@example.com");

      expect(generateRegisterToken).toHaveBeenCalledWith({
        uuid: mockUser.uuid,
        email: mockUser.email,
      });
      expect(RedisClient.set).toHaveBeenCalledWith(
        "activation_account:mock-register-token-abc",
        "unused",
        { EX: 300 }
      );
      expect(sendActivationEmail).toHaveBeenCalledWith(
        mockUser.email,
        "mock-register-token-abc"
      );
      expect(result).toEqual({
        message: "Email aktivasi berhasil dikirim ulang",
        email: mockUser.email,
      });
    });
  });

  describe("SendMsgForgetPasswordService", () => {
    it("harus throw error jika email tidak terdaftar di database", async () => {
      TblUsers.findOne.mockResolvedValue(null);
      await expect(SendMsgForgetPasswordService("unknown@example.com")).rejects.toThrow("Email tidak terdaftar");
      expect(TblUsers.findOne).toHaveBeenCalledWith({ where: { email: "unknown@example.com" } });
      expect(RedisClient.set).not.toHaveBeenCalled();
      expect(sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it("harus throw error jika akun user belum diaktifkan (isActive: false)", async () => {
      TblUsers.findOne.mockResolvedValue({ uuid: "user-uuid-1", email: "inactive@example.com", isActive: false });
      await expect(SendMsgForgetPasswordService("inactive@example.com")).rejects.toThrow("Akun belum diaktifkan");
      expect(RedisClient.set).not.toHaveBeenCalled();
      expect(sendResetPasswordEmail).not.toHaveBeenCalled();
    });

    it("harus generate token, simpan di Redis dengan TTL 15 menit, dan kirim email reset", async () => {
      const mockUser = { uuid: "user-uuid-123", email: "active@example.com", isActive: true };
      TblUsers.findOne.mockResolvedValue(mockUser);
      generateResetPasswordToken.mockReturnValue("mock-reset-token-xyz");
      RedisClient.set.mockResolvedValue("OK");
      sendResetPasswordEmail.mockResolvedValue({ messageId: "email-id-123" });

      const result = await SendMsgForgetPasswordService("active@example.com");

      expect(generateResetPasswordToken).toHaveBeenCalledWith({ uuid: mockUser.uuid, email: mockUser.email });
      expect(RedisClient.set).toHaveBeenCalledWith("reset_password:mock-reset-token-xyz", mockUser.uuid, { EX: 900 });
      expect(sendResetPasswordEmail).toHaveBeenCalledWith(mockUser.email, "mock-reset-token-xyz");
      expect(result).toEqual({ message: "Email reset password berhasil dikirim", email: mockUser.email });
    });
  });

  describe("UpdatePasswordUserService", () => {
    it("harus throw error jika token reset tidak dikirimkan", async () => {
      await expect(UpdatePasswordUserService({ token: null, password: "newPassword123" })).rejects.toThrow("Token reset password diperlukan");
    });

    it("harus throw error jika token JWT tidak valid atau sudah kadaluarsa", async () => {
      verifyResetPasswordToken.mockImplementation(() => { throw new Error("jwt expired"); });
      await expect(UpdatePasswordUserService({ token: "invalid-token", password: "newPassword123" })).rejects.toThrow("Token reset password tidak valid atau kedaluwarsa");
    });

    it("harus throw error jika payload decoded token tidak memiliki uuid", async () => {
      verifyResetPasswordToken.mockReturnValue({});
      await expect(UpdatePasswordUserService({ token: "token-without-uuid", password: "newPassword123" })).rejects.toThrow("Token tidak valid");
    });

    it("harus throw error jika token sudah tidak ada di Redis (sudah digunakan atau expired)", async () => {
      verifyResetPasswordToken.mockReturnValue({ uuid: "user-uuid-123" });
      RedisClient.get.mockResolvedValue(null);
      await expect(UpdatePasswordUserService({ token: "expired-or-used-token", password: "newPassword123" })).rejects.toThrow("Token reset password tidak valid, kedaluwarsa, atau sudah pernah digunakan");
    });

    it("harus throw error jika token di Redis tidak cocok dengan uuid token JWT (mencegah impersonation)", async () => {
      verifyResetPasswordToken.mockReturnValue({ uuid: "user-uuid-1" });
      RedisClient.get.mockResolvedValue("user-uuid-2");
      await expect(UpdatePasswordUserService({ token: "tampered-token", password: "newPassword123" })).rejects.toThrow("Token tidak cocok dengan data pengguna");
    });

    it("harus throw error jika user dengan uuid tersebut tidak ditemukan di database", async () => {
      verifyResetPasswordToken.mockReturnValue({ uuid: "user-uuid-123" });
      RedisClient.get.mockResolvedValue("user-uuid-123");
      TblUsers.findOne.mockResolvedValue(null);
      await expect(UpdatePasswordUserService({ token: "valid-token", password: "newPassword123" })).rejects.toThrow("User tidak ditemukan");
    });

    it("harus berhasil mengupdate password di database, menghapus token reset dari Redis, dan menghapus session refresh token", async () => {
      const mockUuid = "user-uuid-123";
      const mockToken = "valid-reset-token";
      const newPassword = "superSecretPassword123";
      const hashedNewPassword = "hashedSuperSecretPassword123";

      verifyResetPasswordToken.mockReturnValue({ uuid: mockUuid });
      RedisClient.get.mockResolvedValue(mockUuid);
      TblUsers.findOne.mockResolvedValue({ uuid: mockUuid, email: "user@example.com" });
      hashPassword.mockResolvedValue(hashedNewPassword);
      TblUsers.update.mockResolvedValue([1]);
      RedisClient.del.mockResolvedValue(1);

      const result = await UpdatePasswordUserService({ token: mockToken, password: newPassword });

      expect(hashPassword).toHaveBeenCalledWith(newPassword);
      expect(TblUsers.update).toHaveBeenCalledWith({ password: hashedNewPassword }, { where: { uuid: mockUuid } });
      expect(RedisClient.del).toHaveBeenCalledWith("reset_password:" + mockToken);
      expect(RedisClient.del).toHaveBeenCalledWith("refresh_token:" + mockUuid);
      expect(result).toEqual({ message: "Password berhasil diperbarui", uuid: mockUuid });
    });
  });
});