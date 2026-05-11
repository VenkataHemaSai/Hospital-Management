import express from "express";
import { protectRoute, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  getDoctors,
  getDoctorById,
  getMyProfile,
  updateMyProfile,
  getPatients,
  getPatientById,
  promoteDoctorToSenior,
  deactivateDoctor,
} from "../controllers/user.controller.js";

const router = express.Router();

// Public
router.get("/doctors", getDoctors);
router.get("/doctors/:id", getDoctorById);

// Protected — any logged-in user
router.get("/profile", protectRoute, getMyProfile);
router.put("/profile", protectRoute, updateMyProfile);

// Protected — doctor and admin only
router.get("/patients", protectRoute, authorizeRoles("doctor", "admin"), getPatients);
router.get("/patients/:id", protectRoute, authorizeRoles("doctor", "admin"), getPatientById);

// Admin only
router.put("/doctors/:id/promote",     protectRoute, authorizeRoles("admin"), promoteDoctorToSenior);
router.delete("/doctors/:id",           protectRoute, authorizeRoles("admin"), deactivateDoctor);

export default router;
