import express from "express";
import multer from "multer";
import { protectRoute, authorizeSeniorOrAdmin } from "../middlewares/auth.middleware.js";
import {
  submitApplication,
  getApplications,
  approveApplication,
  rejectApplication,
  registerWithToken,
} from "../controllers/application.controller.js";

const router = express.Router();

// Multer — store files in memory so we can stream to Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WebP images and PDFs are allowed"));
  },
});

const applicationUpload = upload.fields([
  { name: "profilePhoto", maxCount: 1 },
  { name: "licenseDoc",   maxCount: 1 },
  { name: "idProof",      maxCount: 1 },
  { name: "certificates", maxCount: 5 },
]);

// Public
router.post("/", applicationUpload, submitApplication);
router.post("/register", registerWithToken);

// Protected — SDoc and Admin only
router.get("/",          protectRoute, authorizeSeniorOrAdmin, getApplications);
router.put("/:id/approve", protectRoute, authorizeSeniorOrAdmin, approveApplication);
router.put("/:id/reject",  protectRoute, authorizeSeniorOrAdmin, rejectApplication);

export default router;
