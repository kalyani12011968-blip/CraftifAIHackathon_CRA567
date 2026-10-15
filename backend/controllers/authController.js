const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const users = new Map();

const hashPassword = (password) => {
  return crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");
};

// Seed default demo user
users.set("admin@jalrakshak.demo", {
  userId: "USR-DEMO-01",
  email: "admin@jalrakshak.demo",
  name: "Admin User",
  role: "ADMIN",
  passwordHash: hashPassword("demo1234")
});

const register = (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
    });
  }

  if (users.has(email)) {
    return res.status(409).json({
      success: false,
      message: "User already exists"
    });
  }

  const userId = `USR-${Date.now()}`;
  const newUser = {
    userId,
    email,
    name: name || email.split("@")[0],
    role: "VIEWER",
    passwordHash: hashPassword(password)
  };

  users.set(email, newUser);

  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: {
      userId: newUser.userId,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role
    }
  });
};

const login = (req, res) => {
  const { email, password } = req.body;

  const user = users.get(email);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  const token = jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    },
    process.env.JWT_SECRET || "development-secret",
    {
      expiresIn: "24h"
    }
  );

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
};

const me = (req, res) => {
  res.json({
    success: true,
    message: "Authentication service active",
    user: req.user || null
  });
};

module.exports = {
  register,
  login,
  me
};
