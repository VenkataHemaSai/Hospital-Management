import { Conversation, Message } from "../models/index.js";

/**
 * GET /api/chat/conversations
 * Protected: Get all conversations for the logged-in user.
 */
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true,
    })
      .populate("participants", "firstName lastName profilePicture role isActive")
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error("Error in getConversations: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/chat/conversations
 * Protected: Create or retrieve a 1:1 conversation.
 */
export const createOrGetConversation = async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ success: false, message: "participantId is required" });
    }

    if (participantId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: "Cannot create a conversation with yourself" });
    }

    // Participants array must be sorted to match the unique compound index
    const sortedParticipants = [req.user._id.toString(), participantId].sort();

    let conversation = await Conversation.findOne({
      participants: { $all: sortedParticipants },
    }).populate("participants", "firstName lastName profilePicture role");

    if (!conversation) {
      conversation = await Conversation.create({ participants: sortedParticipants });
      conversation = await conversation.populate("participants", "firstName lastName profilePicture role");
    }

    res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    console.error("Error in createOrGetConversation: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/chat/conversations/:id/messages
 * Protected: Fetch paginated messages for a conversation.
 * Uses cursor-based pagination via 'before' messageId for efficiency.
 */
export const getMessages = async (req, res) => {
  try {
    const { before, limit = 30 } = req.query;
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.map(String).includes(req.user._id.toString());
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const query = { conversation: conversationId };
    if (before) query._id = { $lt: before }; // Cursor-based pagination

    const messages = await Message.find(query)
      .populate("sender", "firstName lastName profilePicture")
      .limit(parseInt(limit))
      .sort({ _id: -1 }); // Newest first, reverse on frontend

    // Mark messages as read
    await Message.updateMany(
      { conversation: conversationId, receiver: req.user._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Reset unread count
    await Conversation.updateOne(
      { _id: conversationId },
      { $set: { [`unreadCounts.${req.user._id}`]: 0 } }
    );

    res.status(200).json({ success: true, data: messages.reverse() }); // Chronological order
  } catch (error) {
    console.error("Error in getMessages: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/chat/conversations/:id/messages
 * Protected: Persist a message to the database.
 * Socket.io handles real-time delivery; this handles persistence.
 */
export const sendMessage = async (req, res) => {
  try {
    const { content, messageType = "text", replyTo } = req.body;
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.map(String).includes(req.user._id.toString());
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const receiverId = conversation.participants
      .map(String)
      .find((id) => id !== req.user._id.toString());

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      receiver: receiverId,
      content,
      messageType,
      replyTo: replyTo || null,
    });

    // Update conversation's lastMessage snapshot and increment receiver's unread count atomically
    await Conversation.findByIdAndUpdate(conversationId, {
      $set: {
        lastMessage: {
          messageId: message._id,
          content: content.substring(0, 100),
          sender: req.user._id,
          messageType,
          sentAt: message.createdAt,
        },
      },
      $inc: { [`unreadCounts.${receiverId}`]: 1 },
    });

    await message.populate("sender", "firstName lastName profilePicture");

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    console.error("Error in sendMessage: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
