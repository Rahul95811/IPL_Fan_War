const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const User = require("../models/User");

const createToken = (user) =>
  jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET || "fallback_secret_for_dev_only",
    {
      expiresIn: "7d",
    }
  );

const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    return res.status(201).json({
      token: createToken(user),
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    return res.json({
      token: createToken(user),
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
};

const guestLogin = async (req, res, next) => {
  try {
    const { username } = req.body;
    const safeName = (username || "").trim();
    if (!safeName) {
      return res.status(400).json({ message: "Username is required" });
    }

    // Find or create guest user
    let user = await User.findOne({ username: safeName });
    if (!user) {
      // Create with a dummy email and random password
      user = await User.create({
        username: safeName,
        email: `${safeName.toLowerCase()}_guest@iplfanwar.com`,
        password: await bcrypt.hash(Math.random().toString(36), 10),
      });
    }

    return res.json({
      token: createToken(user),
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { register, login, guestLogin };
