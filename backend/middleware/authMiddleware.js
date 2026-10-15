const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || "";

  if (!header) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const token = header.startsWith("Bearer ") ? header.slice(7) : header;

  try {
    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET || "development-secret"
    );
    next();
  } catch {
    // If running in development without strict JWT
    if (process.env.NODE_ENV !== "production" && token === "demo-token") {
      req.user = { id: "dev-user", email: "admin@jalrakshak.demo" };
      return next();
    }
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
};

authenticate.authenticate = authenticate;
authenticate.authMiddleware = authenticate;

module.exports = authenticate;
