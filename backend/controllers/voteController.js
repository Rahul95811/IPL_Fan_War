const { validationResult } = require("express-validator");
const Vote = require("../models/Vote");

const submitVote = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { matchId, team } = req.body;
    const existingVote = await Vote.findOne({ matchId, user: req.user.id });
    if (existingVote) {
      return res.status(409).json({ message: "You have already voted for this match" });
    }

    await Vote.create({ matchId, team, user: req.user.id });

    const votes = await Vote.find({ matchId });
    const total = votes.length;
    const teamVotes = votes.reduce((acc, vote) => {
      acc[vote.team] = (acc[vote.team] || 0) + 1;
      return acc;
    }, {});

    const percentages = Object.entries(teamVotes).reduce((acc, [key, count]) => {
      acc[key] = Number(((count / total) * 100).toFixed(1));
      return acc;
    }, {});

    const io = req.app.get("io");
    if (io) {
      io.to(matchId).emit("vote_update", {
        matchId,
        totalVotes: total,
        percentages
      });
    }

    return res.status(201).json({
      message: "Vote submitted",
      totalVotes: total,
      percentages,
    });
  } catch (error) {
    return next(error);
  }
};

const getVoteStats = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const votes = await Vote.find({ matchId });
    const total = votes.length;

    const teamVotes = votes.reduce((acc, vote) => {
      acc[vote.team] = (acc[vote.team] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      totalVotes: total,
      percentages: Object.entries(teamVotes).reduce((acc, [key, count]) => {
        acc[key] = total ? Number(((count / total) * 100).toFixed(1)) : 0;
        return acc;
      }, {}),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { submitVote, getVoteStats };
