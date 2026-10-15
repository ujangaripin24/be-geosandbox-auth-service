const nodemailer = require("nodemailer");
const pug = require("pug");
const path = require("path");

// Mock nodemailer
const mockSendMail = jest.fn().mockResolvedValue({ messageId: "test-id" });
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}));

const {
  sendActivationEmail,
  sendResetPasswordEmail,
} = require("../src/pkg/nodemailer/mailer.pkg");

describe("Mailer Package with Pug Templates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("sendActivationEmail", () => {
    it("harus merender template Pug message-activation dan mengirimkan email", async () => {
      const email = "user@example.com";
      const token = "mock-activation-token";

      const result = await sendActivationEmail(email, token);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];

      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toContain("Aktivasi Akun");
      expect(mailOptions.html).toContain("<!DOCTYPE html>");
      expect(mailOptions.html).toContain("GeoSandbox");
      expect(mailOptions.html).toContain("mock-activation-token");
      expect(mailOptions.html).toContain("Aktifkan Akun Saya");
      expect(result).toEqual({ messageId: "test-id" });
    });
  });

  describe("sendResetPasswordEmail", () => {
    it("harus merender template Pug message-forget-password dan mengirimkan email", async () => {
      const email = "user@example.com";
      const token = "mock-reset-token-xyz";

      const result = await sendResetPasswordEmail(email, token);

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOptions = mockSendMail.mock.calls[0][0];

      expect(mailOptions.to).toBe(email);
      expect(mailOptions.subject).toContain("Reset Password");
      expect(mailOptions.html).toContain("<!DOCTYPE html>");
      expect(mailOptions.html).toContain("GeoSandbox");
      expect(mailOptions.html).toContain("mock-reset-token-xyz");
      expect(mailOptions.html).toContain("Reset Password Sekarang");
      expect(result).toEqual({ messageId: "test-id" });
    });
  });
});
