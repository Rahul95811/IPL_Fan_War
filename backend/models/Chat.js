const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  matchId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reactions: {
    thumbsUp: { type: Number, default: 0 },
    fire: { type: Number, default: 0 },
    userReactions: [{
      username: String,
      type: String
    }]
  }
});

// Auto-delete chats older than 24 hours to save space (86400 seconds)
chatSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Chat", chatSchema);
