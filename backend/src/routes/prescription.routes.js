import express from "express";
import { protectRoute, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createPrescription,
  getPrescriptions,
  getPrescriptionById,
  updatePrescriptionStatus,
} from "../controllers/prescription.controller.js";

const router = express.Router();

router.post("/", protectRoute, authorizeRoles("doctor"), createPrescription);
router.get("/", protectRoute, getPrescriptions);
router.get("/:id", protectRoute, getPrescriptionById);
router.put("/:id/status", protectRoute, authorizeRoles("doctor", "admin"), updatePrescriptionStatus);

export default router;
