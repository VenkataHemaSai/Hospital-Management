import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

// Maps userId (string) → socket.id for targeted message delivery
const onlineUsers = new Map();

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // --- Auth Middleware for Socket.io ---
  // Validates JWT from handshake before allowing connection
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.cookie
        ?.split(";")
        .find((c) => c.trim().startsWith("jwt="))
        ?.split("=")[1];

      if (!token) return next(new Error("Unauthorized: No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("firstName lastName role profilePicture");

      if (!user) return next(new Error("Unauthorized: User not found"));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error("Unauthorized: Invalid token"));
    }
  });

  // --- Connection Handler ---
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, socket.id);

    // Broadcast updated online users list to everyone
    io.emit("online_users", Array.from(onlineUsers.keys()));

    console.log(`🔌 Socket connected: ${socket.user.firstName} (${userId})`);

    // --- Join a conversation room ---
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });

    // --- Send a message ---
    // The controller saves to DB; socket handles real-time delivery
    socket.on("send_message", (data) => {
      const { conversationId, message } = data;

      // Broadcast to everyone in the conversation room except sender
      socket.to(conversationId).emit("receive_message", message);

      // Mark as delivered if receiver is online
      const receiverSocketId = onlineUsers.get(message.receiver?.toString());
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("message_delivered", { messageId: message._id });
      }
    });

    // --- Typing indicators ---
    socket.on("typing_start", ({ conversationId }) => {
      socket.to(conversationId).emit("user_typing", {
        userId,
        name: socket.user.firstName,
      });
    });

    socket.on("typing_stop", ({ conversationId }) => {
      socket.to(conversationId).emit("user_stopped_typing", { userId });
    });

    // --- Read receipts ---
    socket.on("mark_read", ({ conversationId, messageIds }) => {
      socket.to(conversationId).emit("messages_read", { userId, messageIds });
    });

    // --- Telemedicine session events ---
    socket.on("session_start", ({ conversationId, meetingLink }) => {
      io.to(conversationId).emit("session_started", { meetingLink, startedBy: userId });
    });

    socket.on("session_end", ({ conversationId }) => {
      io.to(conversationId).emit("session_ended", { endedBy: userId });
    });

    // --- Disconnect ---
    socket.on("disconnect", () => {
      onlineUsers.delete(userId);
      io.emit("online_users", Array.from(onlineUsers.keys()));
      console.log(`🔌 Socket disconnected: ${socket.user.firstName} (${userId})`);
    });
  });

  return io;
};

// Utility: check if a user is currently online
export const isUserOnline = (userId) => onlineUsers.has(userId.toString());

export { onlineUsers };
