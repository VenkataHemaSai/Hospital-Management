import express from "express";
import { protectRoute, authorizeRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import {
  uploadRecord,
  getRecords,
  getRecordById,
  deleteRecord,
} from "../controllers/medicalRecord.controller.js";

const router = express.Router();

// All routes require login
router.use(protectRoute);

router.post("/", authorizeRoles("patient", "doctor"), upload.single("file"), uploadRecord);
router.get("/", getRecords);
router.get("/:id", getRecordById);
router.delete("/:id", authorizeRoles("patient", "admin"), deleteRecord);

export default router;
