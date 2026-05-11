import express from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { protectRoute } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);

// Protected route: requires valid JWT cookie
router.get("/me", protectRoute, getMe);

export default router;
