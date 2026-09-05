const RedisClient = require("../config/data-cache.config");
const { formatError } = require("../pkg/error-formatter.pkg");
const { verifyLoginToken } = require("../pkg/jwt.pkg");

const authenticateTokenGuard = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json(formatError("Token tidak ditemukan", "token"));
  }

  try {
    const decoded = verifyLoginToken(token);
    const session = await RedisClient.get(`refresh_token:${decoded.uuid}`);

    if (!session) {
      return res.status(401).json({ message: "Unauthorized: Token tidak valid atau kadaluarsa" });
    }

    req.user = decoded
    next();
  } catch (error) {
    return res.status(403).json(formatError("Token tidak valid atau kadaluarsa", "token"));
  }
};

const authenticateTokenRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json(formatError("Anda tidak memiliki akses untuk melakukan tindakan ini", "role"));
    }
    next();
  };
};

module.exports = {
  authenticateTokenGuard,
  authenticateTokenRole
};
