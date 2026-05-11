import express from "express";
import { protectRoute } from "../middlewares/auth.middleware.js";
import {
  getConversations,
  createOrGetConversation,
  getMessages,
  sendMessage,
} from "../controllers/chat.controller.js";

const router = express.Router();

router.use(protectRoute);

router.get("/conversations", getConversations);
router.post("/conversations", createOrGetConversation);
router.get("/conversations/:id/messages", getMessages);
router.post("/conversations/:id/messages", sendMessage);

export default router;
