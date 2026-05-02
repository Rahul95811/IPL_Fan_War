const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema(
  {
    matchId: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    team: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

voteSchema.index({ matchId: 1, user: 1 }, { unique: true });

module.exports = mongoose.model("Vote", voteSchema);
