/**
 * @file chat.service.js
 * @description Demonstrates the chat persistence layer and query patterns.
 * Shows how Socket.io events map to MongoDB operations.
 */

import { Conversation, Message } from "../models/index.js";
import mongoose from "mongoose";

/**
 * Get or create a conversation between two users.
 * "Open chat with doctor X" — the most common entry point.
 *
 * Uses MongoDB's findOneAndUpdate with upsert:
 * - Atomic: no race condition if two users simultaneously open a chat.
 * - Idempotent: calling this 100 times produces exactly 1 conversation.
 *
 * IMPORTANT: Always sort participant IDs before querying to ensure the
 * unique index works correctly regardless of who initiates the conversation.
 *
 * @param {string} userIdA
 * @param {string} userIdB
 * @returns {Promise<Conversation>}
 */
export const getOrCreateConversation = async (userIdA, userIdB) => {
  // Sort IDs so [A, B] and [B, A] always resolve to the same document
  const sortedParticipants = [userIdA, userIdB]
    .map((id) => new mongoose.Types.ObjectId(id))
    .sort((a, b) => a.toString().localeCompare(b.toString()));

  const conversation = await Conversation.findOneAndUpdate(
    { participants: { $all: sortedParticipants, $size: 2 } },
    {
      $setOnInsert: {
        participants: sortedParticipants,
        unreadCounts: {
          [userIdA]: 0,
          [userIdB]: 0,
        },
      },
    },
    {
      upsert: true,      // Create if it doesn't exist
      new: true,         // Return the updated document
      runValidators: true,
    }
  );

  return conversation;
};

/**
 * Persist a new message and update the conversation's last-message snapshot.
 * Both operations in the same async context — no transaction needed because:
 * - If the message saves but conversation update fails: the message exists
 *   and will be found via Message.find({ conversation }). The lastMessage
 *   snapshot is stale but a re-read on next open corrects it.
 * - If conversation update fails consistently: a background job can repair it.
 * - MongoDB multi-document transactions exist but add latency — avoid for
 *   high-frequency operations like chat messages.
 *
 * @param {Object} messageData
 * @returns {Promise<Message>}
 */
export const persistMessage = async ({
  conversationId,
  senderId,
  receiverId,
  content,
  messageType = "text",
  attachment = null,
  replyToId = null,
}) => {
  // 1. Save the message (primary write)
  const message = await Message.create({
    conversation: conversationId,
    sender: senderId,
    receiver: receiverId,
    content,
    messageType,
    attachment,
    replyTo: replyToId,
    readBy: [senderId], // Sender has already "read" their own message
    deliveredTo: [senderId],
  });

  // 2. Update conversation: last message snapshot + unread count (secondary write)
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: {
      "lastMessage.messageId": message._id,
      "lastMessage.content": content.substring(0, 100), // Truncate to snapshot size
      "lastMessage.sender": senderId,
      "lastMessage.messageType": messageType,
      "lastMessage.sentAt": message.createdAt,
      updatedAt: new Date(), // Force updatedAt update (for sidebar sort)
    },
    $inc: {
      [`unreadCounts.${receiverId}`]: 1, // Increment unread count for receiver only
    },
  });

  return message;
};

/**
 * Load messages for a conversation — cursor-based pagination.
 *
 * Why cursor over skip/limit?
 * - skip(200) scans and discards 200 documents — O(n) performance.
 * - Cursor (find where _id < lastSeenId) uses the index directly — O(log n).
 * - For a chat with 10,000 messages, the difference is ~50ms vs ~5ms.
 *
 * @param {string} conversationId
 * @param {string|null} beforeMessageId - Load messages older than this ID
 * @param {number} limit
 * @returns {Promise<Message[]>}
 */
export const getMessages = async (conversationId, beforeMessageId = null, limit = 20) => {
  const query = { conversation: conversationId, isDeleted: false };

  if (beforeMessageId) {
    query._id = { $lt: new mongoose.Types.ObjectId(beforeMessageId) };
  }

  const messages = await Message.find(query)
    .sort({ _id: -1 })          // Newest first (reverse for display in UI)
    .limit(limit)
    .populate("sender", "firstName lastName profilePicture")
    .populate("replyTo", "content sender messageType") // Nested reply preview
    .lean();

  return messages.reverse(); // Reverse back to chronological for UI rendering
};

/**
 * Mark all unread messages in a conversation as read.
 * Called when a user opens a conversation.
 * Uses $addToSet to prevent duplicate IDs in readBy array.
 *
 * @param {string} conversationId
 * @param {string} userId - The user who is reading the messages
 */
export const markMessagesAsRead = async (conversationId, userId) => {
  // Bulk update all unread messages in one query (hits idx_unread_messages index)
  await Message.updateMany(
    {
      conversation: conversationId,
      receiver: userId,
      readBy: { $ne: new mongoose.Types.ObjectId(userId) },
    },
    {
      $addToSet: { readBy: new mongoose.Types.ObjectId(userId) },
    }
  );

  // Reset the unread count to 0 for this user in the conversation
  await Conversation.findByIdAndUpdate(conversationId, {
    $set: { [`unreadCounts.${userId}`]: 0 },
  });
};

/**
 * Get all conversations for a user (the sidebar list).
 * Sorted by most recent activity (updatedAt).
 * Each conversation includes the lastMessage snapshot and unread count —
 * no additional queries needed for rendering the sidebar.
 *
 * @param {string} userId
 * @returns {Promise<Conversation[]>}
 */
export const getUserConversations = async (userId) => {
  return Conversation.find({
    participants: new mongoose.Types.ObjectId(userId),
    isActive: true,
  })
    .sort({ updatedAt: -1 }) // Most recently active conversations first
    .populate("participants", "firstName lastName profilePicture role isActive")
    .lean();
};

/**
 * Socket.io event handler integration example.
 * Attach this to your Socket.io server setup.
 *
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
export const registerChatHandlers = (io, socket) => {
  const userId = socket.data.userId; // Set during socket authentication middleware

  // Join all conversation rooms for this user on connection
  socket.on("join_conversations", async () => {
    const conversations = await getUserConversations(userId);
    const roomIds = conversations.map((c) => c._id.toString());
    socket.join(roomIds);
  });

  // Send a message
  socket.on("send_message", async ({ conversationId, receiverId, content, messageType, attachment, replyToId }) => {
    try {
      // 1. Persist to MongoDB (async — don't block broadcast)
      const messagePromise = persistMessage({
        conversationId,
        senderId: userId,
        receiverId,
        content,
        messageType,
        attachment,
        replyToId,
      });

      // 2. Broadcast immediately to the room (fire-and-persist pattern)
      //    The message has no _id yet, so send a temp client-generated ID.
      //    Once saved, emit the real _id for reconciliation.
      io.to(conversationId).emit("new_message", {
        conversationId,
        sender: userId,
        content,
        messageType,
        sentAt: new Date(),
        isOptimistic: true, // Client uses this to match with the real save
      });

      // 3. Wait for save and emit the confirmed message with real _id
      const savedMessage = await messagePromise;
      io.to(conversationId).emit("message_confirmed", {
        conversationId,
        message: savedMessage,
      });
    } catch (error) {
      socket.emit("message_error", { error: error.message });
    }
  });

  // Mark messages as read
  socket.on("mark_read", async ({ conversationId }) => {
    await markMessagesAsRead(conversationId, userId);
    // Notify the sender that their messages have been read
    io.to(conversationId).emit("messages_read", { conversationId, readBy: userId });
  });

  // Typing indicator (no DB write needed — ephemeral)
  socket.on("typing_start", ({ conversationId }) => {
    socket.to(conversationId).emit("user_typing", { conversationId, userId });
  });

  socket.on("typing_stop", ({ conversationId }) => {
    socket.to(conversationId).emit("user_stopped_typing", { conversationId, userId });
  });
};
