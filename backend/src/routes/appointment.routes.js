import express from "express";
import { protectRoute, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAvailableSlots,
} from "../controllers/appointment.controller.js";

const router = express.Router();

// Public: check available slots for a doctor on a given date
router.get("/doctor/:doctorId/available-slots", getAvailableSlots);

// Protected
router.post("/", protectRoute, authorizeRoles("patient"), createAppointment);
router.get("/", protectRoute, getAppointments);
router.get("/:id", protectRoute, getAppointmentById);
router.put("/:id/status", protectRoute, updateAppointmentStatus);

export default router;
