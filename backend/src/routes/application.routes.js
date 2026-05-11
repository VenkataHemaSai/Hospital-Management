import express from "express";
import { protectRoute, authorizeSeniorOrAdmin } from "../middlewares/auth.middleware.js";
import {
  submitApplication,
  getApplications,
  approveApplication,
  rejectApplication,
  registerWithToken,
} from "../controllers/application.controller.js";

const router = express.Router();

// Public
router.post("/", submitApplication);
router.post("/register", registerWithToken);

// Protected — SDoc and Admin only
router.get("/", protectRoute, authorizeSeniorOrAdmin, getApplications);
router.put("/:id/approve", protectRoute, authorizeSeniorOrAdmin, approveApplication);
router.put("/:id/reject", protectRoute, authorizeSeniorOrAdmin, rejectApplication);

export default router;
