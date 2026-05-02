const express = require("express");
const { getLiveMatches, getMatchById } = require("../controllers/matchController");

const router = express.Router();

router.get("/live", getLiveMatches);
router.get("/:id", getMatchById);

module.exports = router;
