const express = require("express");
const { body } = require("express-validator");
const { register, login, guestLogin } = require("../controllers/authController");

const router = express.Router();

router.post(
  "/register",
  [
    body("username").isLength({ min: 3, max: 24 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  register
);

router.post(
  "/login",
  [body("email").isEmail(), body("password").isLength({ min: 6 })],
  login
);

router.post("/guest", [body("username").notEmpty().trim()], guestLogin);

module.exports = router;
