/**
 * @file Chat.model.js
 * @description Two-model chat architecture: Conversation + Message.
 *
 * ARCHITECTURE DECISION — Two Collections vs. One:
 * ────────────────────────────────────────────────
 *
 * Option A (Rejected): Single collection, embed all messages on Conversation.
 *   ✗ Messages are UNBOUNDED — a long-running patient-doctor relationship
 *     could produce thousands of messages. Embedding violates the 16MB doc limit.
 *   ✗ Fetching a conversation to display the sidebar (just needing the last message
 *     and unread count) loads the ENTIRE message history — catastrophic for performance.
 *   ✗ Pagination ("load older messages") is impossible with an embedded array;
 *     you'd have to use $slice which is not compatible with indexes.
 *
 * Option B (Chosen): Conversation + Message — two collections.
 *   ✓ Conversation stores ONLY metadata: participants, lastMessage snippet,
 *     unread counts. Loading the chat list sidebar is a single lightweight query.
 *   ✓ Messages are in their own collection, enabling:
 *     - Skip/limit pagination ("load 20 messages before message X")
 *     - Cursor-based pagination (more efficient: find messages where _id < lastSeenId)
 *     - Range queries: messages in the last 24 hours for the telemedicine session.
 *   ✓ Read receipts are updated only on the Message document — no contention
 *     on the Conversation document for every read event.
 *   ✓ Message search (full-text index on content) works efficiently.
 *
 * Socket.io Integration Notes:
 * ─────────────────────────────
 * Socket.io delivers messages in real-time. MongoDB stores them for persistence.
 * Pattern used:
 *   1. Client sends message → Socket.io broadcasts to recipient.
 *   2. Server saves to MongoDB (async, non-blocking — don't await before broadcast).
 *   3. Client receives message ID from DB save → marks it as "delivered".
 * This "fire-and-persist" pattern keeps latency low while ensuring durability.
 *
 * UNREAD COUNT STRATEGY:
 * ─────────────────────
 * Unread counts are maintained as a Map on the Conversation document.
 * Alternative: query `Message.countDocuments({ conversation, readBy: { $ne: userId } })`
 * on every sidebar load. This is a full collection scan per conversation — terrible.
 * Instead, we maintain a denormalized `unreadCounts` map and update it:
 *   - +1 when a message is sent (for the recipient)
 *   - Reset to 0 when the recipient opens the conversation
 * This trades a slightly more complex write for an O(1) read — correct trade-off
 * for a system where reads vastly outnumber writes.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 1: Conversation
// ═══════════════════════════════════════════════════════════════════════════════

const ConversationSchema = new Schema(
  {
    /**
     * participants — exactly 2 users (patient and doctor in this context).
     * Indexed as an array for bidirectional lookup:
     *   "Find the conversation between user A and user B"
     * MongoDB's multikey index on arrays makes this efficient.
     *
     * We enforce exactly 2 participants via validation because:
     * - This platform uses 1:1 patient-doctor chats, not group chats.
     * - If group chat is needed in the future, a separate GroupConversation
     *   collection is cleaner than compromising this schema.
     */
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      validate: {
        validator: (arr) => arr.length === 2,
        message: "A conversation must have exactly 2 participants",
      },
    },

    /**
     * lastMessage — EMBEDDED SNAPSHOT (denormalized for sidebar performance).
     * This is NOT a reference to the Message collection. Instead, it's a small
     * snapshot of the most recent message, updated atomically on every new message.
     *
     * Rationale: Rendering the chat list sidebar needs: sender, content preview,
     * and timestamp for EVERY conversation. If this were a $ref, loading a sidebar
     * with 10 conversations would require 10 additional $lookups into the Message
     * collection — the N+1 query problem.
     *
     * The snapshot is intentionally small (content capped at 100 chars) because
     * it's preview-only. The full message is in the Message collection.
     */
    lastMessage: {
      messageId: { type: Schema.Types.ObjectId, ref: "Message" },
      content: { type: String, maxlength: 100 }, // Truncated preview
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      messageType: { type: String, enum: ["text", "image", "file", "system"] },
      sentAt: { type: Date },
    },

    /**
     * unreadCounts — a Map from userId (as string) → unread message count.
     * e.g., { "64abc123...": 3, "64def456...": 0 }
     *
     * Map is used (not a nested object with fixed keys) because:
     * - Keys are dynamic ObjectIds, not known at schema design time.
     * - Mongoose Maps support dot-notation updates: { $inc: { `unreadCounts.${userId}`: 1 } }
     * - Querying "conversations where my unread count > 0" is efficient with a Map.
     */
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    /**
     * OPTIONAL: appointment — links a conversation to a specific consultation.
     * During a telemedicine session, the chat is tied to an appointment.
     * Between sessions, patients and doctors may have an ongoing channel.
     */
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    isActive: { type: Boolean, default: true },

    // For telemedicine: track whether the session is currently live
    isSessionActive: { type: Boolean, default: false },
  },
  {
    timestamps: true, // createdAt = when conversation started, updatedAt = last activity
  }
);

// ─── Indexes (Conversation) ───────────────────────────────────────────────────

/**
 * INDEX 1 — Find conversation between two specific users (CRITICAL).
 * Pattern: "Open chat with doctor X" → find existing conversation first.
 * Multikey index on participants array — MongoDB indexes each element.
 * Combined with the unique index below, this prevents duplicate conversations.
 */
ConversationSchema.index(
  { participants: 1 },
  { name: "idx_conversation_participants" }
);

/**
 * INDEX 2 — Unique conversation per participant pair.
 * Prevents duplicate conversations between the same two users.
 * MongoDB compares sorted arrays, so { [A, B] } and { [B, A] } are treated
 * as different by default — sort participants in the app layer before inserting.
 */
ConversationSchema.index(
  { participants: 1 },
  {
    unique: true,
    name: "idx_unique_conversation_pair",
    // Note: Ensure participants array is always sorted (by ObjectId.toString())
    // before inserting to guarantee uniqueness regardless of order.
  }
);

/**
 * INDEX 3 — Sidebar sorted by most recent activity.
 * "Load my conversations, most recent first" — the default chat sidebar view.
 */
ConversationSchema.index(
  { participants: 1, updatedAt: -1 },
  { name: "idx_participant_recent_conversations" }
);

export const Conversation = model("Conversation", ConversationSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// MODEL 2: Message
// ═══════════════════════════════════════════════════════════════════════════════

const MessageSchema = new Schema(
  {
    /**
     * REFERENCED: conversation — the thread this message belongs to.
     * Indexed: the primary query is always "messages for conversation X".
     */
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation reference is required"],
      index: true,
    },

    /**
     * REFERENCED: sender — the user who sent this message.
     * Stored as a reference (not embedded name/avatar) because:
     * - Profile pictures and display names change over time.
     * - A reference lets us always show the current profile picture.
     * - We only need sender.firstName, sender.profilePicture.url on the
     *   frontend — .populate("sender", "firstName profilePicture") is efficient.
     */
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender reference is required"],
    },

    /**
     * receiver — stored for efficient "messages sent TO user X" queries.
     * Without this, querying unread messages would require knowing the
     * conversation ID first (two queries). With this, a single query suffices:
     *   Message.find({ receiver: myId, readBy: { $ne: myId } })
     */
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver reference is required"],
      index: true,
    },

    // ─── Content ──────────────────────────────────────────────────────────────

    content: {
      type: String,
      trim: true,
      maxlength: [5000, "Message content cannot exceed 5000 characters"],
      default: "",
      // Empty string is valid for image/file messages where content is a caption
    },

    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "system"],
      default: "text",
    },

    /**
     * attachment — for image/file messages.
     * Stored inline (not as a separate MedicalRecord) because:
     * - Chat attachments are ephemeral context, not formal medical records.
     * - They shouldn't appear in the patient's medical record history
     *   unless the doctor explicitly adds them there.
     * - A doctor can choose to "save to medical records" — that creates
     *   a MedicalRecord document separately.
     */
    attachment: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true }, // Cloudinary public ID
      fileName: { type: String, trim: true },
      fileSize: { type: Number },
      mimeType: { type: String, trim: true },
      thumbnailUrl: { type: String, trim: true },
    },

    // ─── Delivery & Read Status ───────────────────────────────────────────────

    /**
     * readBy — array of user IDs who have read this message.
     * Array (not boolean) to support potential future group chat.
     * For 1:1 chat, checking `readBy.includes(receiverId)` is O(1) in practice.
     *
     * PATTERN: When a user opens a conversation:
     *   Message.updateMany(
     *     { conversation: convId, receiver: myId, readBy: { $ne: myId } },
     *     { $addToSet: { readBy: myId } }
     *   )
     * Then reset the unread count: Conversation.updateOne(...)
     */
    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /**
     * deliveredTo — users who have received the message (Socket.io ACK).
     * Separate from readBy: "delivered" means the device received it;
     * "read" means the user opened and viewed the conversation.
     */
    deliveredTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ─── Message Threading ────────────────────────────────────────────────────

    /**
     * replyTo — reference to the message being replied to.
     * Used to render threaded/quoted replies in the chat UI.
     * Sparse: most messages are not replies.
     */
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },

    // ─── Edit/Delete ──────────────────────────────────────────────────────────

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editHistory: [
      {
        content: String,
        editedAt: Date,
      },
    ],

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deleteType: {
      type: String,
      enum: ["for_me", "for_everyone"],
    },
  },
  {
    timestamps: true,
    // createdAt = message send time (use this for display, not a separate `sentAt`)
  }
);

// ─── Pre-save Hook (Message) ──────────────────────────────────────────────────

MessageSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
    // Clear content for "delete for everyone"
    if (this.deleteType === "for_everyone") {
      this.content = "";
      delete this.attachment;
    }
  }

  if (this.isModified("content") && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// ─── Indexes (Message) ────────────────────────────────────────────────────────

/**
 * INDEX 1 — PRIMARY: Load messages for a conversation (paginated).
 * "Load the last 20 messages in conversation X"
 * _id DESC = newest first; natural sort order of ObjectIds is chronological.
 * Using _id for cursor-based pagination is more efficient than skip/limit:
 *   Message.find({ conversation: convId, _id: { $lt: lastMessageId } }).limit(20)
 */
MessageSchema.index(
  { conversation: 1, _id: -1 },
  { name: "idx_conversation_messages_paginated" }
);

/**
 * INDEX 2 — Unread messages for a user.
 * "How many unread messages do I have?" — used to populate notification badges.
 * Note: readBy is an array; MongoDB's multikey index handles it.
 */
MessageSchema.index(
  { receiver: 1, readBy: 1 },
  { name: "idx_unread_messages" }
);

/**
 * INDEX 3 — Compound for real-time delivery tracking.
 * "Mark all undelivered messages in this conversation as delivered"
 * Triggered when a user comes online.
 */
MessageSchema.index(
  { conversation: 1, receiver: 1, deliveredTo: 1 },
  { name: "idx_delivery_tracking" }
);

/**
 * INDEX 4 — TTL Index for auto-purging very old messages (optional).
 * If regulatory/storage requirements demand it, auto-delete messages
 * older than X years. Comment out if full history retention is required.
 *
 * MessageSchema.index(
 *   { createdAt: 1 },
 *   { expireAfterSeconds: 63072000, name: "idx_message_ttl" } // 2 years
 * );
 */

/**
 * INDEX 5 — Full-text search on message content.
 * "Search for 'blood pressure' in my chat with Dr. Sharma"
 * Weighted toward content. Combine with { conversation: 1 } filter in query.
 */
MessageSchema.index(
  { content: "text" },
  { name: "idx_message_text_search" }
);

export const Message = model("Message", MessageSchema);
