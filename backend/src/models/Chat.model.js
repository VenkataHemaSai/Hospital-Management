import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ─── Conversation Schema ─────────────────────────────────────────────────────
// Stores only conversation metadata (participants, last message preview, unread
// counts). Full message history lives in the Message collection to support
// pagination and avoid unbounded document growth.

const ConversationSchema = new Schema(
  {
    // Exactly 2 participants enforced for 1:1 patient-doctor chat
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (arr) => arr.length === 2,
        message: "A conversation must have exactly 2 participants",
      },
    },

    // Denormalized snapshot of the latest message for sidebar rendering
    lastMessage: {
      messageId: { type: Schema.Types.ObjectId, ref: "Message" },
      content: { type: String, maxlength: 100 }, // Truncated preview
      sender: { type: Schema.Types.ObjectId, ref: "User" },
      messageType: { type: String, enum: ["text", "image", "file", "system"] },
      sentAt: { type: Date },
    },

    // Map of userId → unread count. Updated atomically on send and reset on open.
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    // Optional link to the appointment that initiated this conversation
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },

    isActive: { type: Boolean, default: true },
    isSessionActive: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// --- Indexes (Conversation) ---

ConversationSchema.index({ participants: 1 }, { name: "idx_conversation_participants" });

// Prevents duplicate conversations between the same two users.
// Ensure participants array is sorted by ObjectId.toString() before inserting.
ConversationSchema.index(
  { participants: 1 },
  { unique: true, name: "idx_unique_conversation_pair" }
);

ConversationSchema.index(
  { participants: 1, updatedAt: -1 },
  { name: "idx_participant_recent_conversations" }
);

export const Conversation = model("Conversation", ConversationSchema);

// ─── Message Schema ──────────────────────────────────────────────────────────

const MessageSchema = new Schema(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: [true, "Conversation reference is required"],
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sender reference is required"],
    },

    // Stored directly for efficient single-query unread lookups without needing the conversation ID
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver reference is required"],
      index: true,
    },

    content: {
      type: String,
      trim: true,
      maxlength: [5000, "Message content cannot exceed 5000 characters"],
      default: "",
    },

    messageType: {
      type: String,
      enum: ["text", "image", "file", "audio", "system"],
      default: "text",
    },

    // Chat attachments are stored separately from MedicalRecords.
    // A doctor can explicitly promote a chat attachment to a formal medical record.
    attachment: {
      url: { type: String, trim: true },
      publicId: { type: String, trim: true }, // Cloudinary public ID
      fileName: { type: String, trim: true },
      fileSize: { type: Number },
      mimeType: { type: String, trim: true },
      thumbnailUrl: { type: String, trim: true },
    },

    // Array supports future group chat. For 1:1 chat, a single entry suffices.
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    // "delivered" = device received via Socket.io; "read" = user opened the conversation
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: "User" }],

    replyTo: { type: Schema.Types.ObjectId, ref: "Message", default: null },

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    editHistory: [{ content: String, editedAt: Date }],

    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deleteType: { type: String, enum: ["for_me", "for_everyone"] },
  },
  {
    timestamps: true, // createdAt serves as the message send time
  }
);

// --- Pre-save Hook (Message) ---

MessageSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
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

// --- Indexes (Message) ---

// Primary index for cursor-based pagination: load last N messages in a conversation
MessageSchema.index({ conversation: 1, _id: -1 }, { name: "idx_conversation_messages_paginated" });
MessageSchema.index({ receiver: 1, readBy: 1 }, { name: "idx_unread_messages" });
MessageSchema.index({ conversation: 1, receiver: 1, deliveredTo: 1 }, { name: "idx_delivery_tracking" });
MessageSchema.index({ content: "text" }, { name: "idx_message_text_search" });

// Optional TTL index — uncomment to auto-purge messages older than 2 years
// MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000, name: "idx_message_ttl" });

export const Message = model("Message", MessageSchema);
