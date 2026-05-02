const express = require("express");
const { body, param } = require("express-validator");
const { submitVote, getVoteStats } = require("../controllers/voteController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/:matchId", [param("matchId").notEmpty()], getVoteStats);
router.post(
  "/",
  authMiddleware,
  [body("matchId").notEmpty(), body("team").isString().notEmpty()],
  submitVote
);

module.exports = router;
