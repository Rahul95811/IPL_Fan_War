require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const connectDb = require("./config/db");
const { EventEmitter } = require("events");

// Increase max listeners to prevent memory leak warnings during high polling
EventEmitter.defaultMaxListeners = 25;
const authRoutes = require("./routes/authRoutes");
const matchRoutes = require("./routes/matchRoutes");
const voteRoutes = require("./routes/voteRoutes");
const errorMiddleware = require("./middleware/errorMiddleware");
const { hasAbusiveWord, sanitizeMessage } = require("./utils/chatModeration");
const { startScorePolling } = require("./scraper/scoreScraper");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
  ...(process.env.CLIENT_URL || "").split(",").filter(Boolean),
  "http://127.0.0.1:5173",
  "http://localhost:5173"
];

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(
  cors({
    origin: "*",
  })
);

app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "ipl-fan-war-backend" });
});

app.get("/", (req, res) => {
  res.send("API Running...");
});


app.use("/api/auth", authRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/vote", voteRoutes);

const Chat = require("./models/Chat");

const messageRateState = new Map();
const MESSAGE_LIMIT = 5;
const WINDOW_MS = 10 * 1000;

io.on("connection", (socket) => {
  socket.on("join_match", async ({ matchId, username }) => {
    if (!matchId || !username) {
      return;
    }
    socket.data.matchId = matchId;
    socket.data.username = username;
    socket.join(matchId);

    try {
      const history = await Chat.find({ matchId })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
      
      const historyWithReactions = history.map(h => ({
        ...h,
        _id: h._id.toString(),
        reactions: {
          thumbsUp: h.reactions.thumbsUp,
          fire: h.reactions.fire,
          userReactions: h.reactions.userReactions || []
        }
      }));
      socket.emit("chat_history", historyWithReactions.reverse());
    } catch (error) {
      console.error("Failed to fetch chat history:", error);
    }
  });

  socket.on("send_message", async ({ matchId, message }) => {
    if (!matchId || !message || socket.data.matchId != matchId) {
      console.log("Message dropped:", { incomingId: matchId, savedId: socket.data.matchId });
      return;
    }

    const now = Date.now();
    const key = socket.id;
    const previous = messageRateState.get(key) || [];
    const recent = previous.filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    messageRateState.set(key, recent);

    if (recent.length > MESSAGE_LIMIT) {
      socket.emit("chat_error", { message: "Slow down, you are sending too quickly." });
      return;
    }

    const cleanMessage = sanitizeMessage(message).slice(0, 280);
    if (!cleanMessage) {
      return;
    }
    if (hasAbusiveWord(cleanMessage)) {
      socket.emit("chat_error", { message: "Message blocked due to abusive language." });
      return;
    }

    try {
      const newChat = await Chat.create({
        matchId,
        username: socket.data.username,
        message: cleanMessage
      });

      io.to(matchId).emit("receive_message", {
        id: newChat._id.toString(),
        username: newChat.username,
        message: newChat.message,
        timestamp: newChat.timestamp,
        reactions: {
          thumbsUp: newChat.reactions.thumbsUp,
          fire: newChat.reactions.fire,
          userReactions: []
        }
      });
    } catch (error) {
      console.error("Failed to save chat:", error);
      socket.emit("chat_error", { message: `Failed to send message: ${error.message}` });
    }
  });

  socket.on("react_message", async ({ messageId, type }) => {
    if (!messageId || !["thumbsUp", "fire"].includes(type) || !socket.data.username) return;

    try {
      const chat = await Chat.findById(messageId);
      if (!chat) return;

      // Check if user already reacted to THIS message
      const alreadyReacted = chat.reactions.userReactions.some(r => r.username === socket.data.username);
      if (alreadyReacted) return;

      // Update count and track user
      chat.reactions[type] += 1;
      chat.reactions.userReactions.push({ username: socket.data.username, type });
      await chat.save();
      
      io.to(chat.matchId).emit("update_message_reactions", {
        messageId: chat._id.toString(),
        reactions: {
          thumbsUp: chat.reactions.thumbsUp,
          fire: chat.reactions.fire,
          userReactions: chat.reactions.userReactions
        }
      });
    } catch (error) {
      console.error("Failed to react to message:", error);
    }
  });

  socket.on("disconnect", () => {
    messageRateState.delete(socket.id);
  });
});

startScorePolling(io);

app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDb();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
