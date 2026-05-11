import crypto from "crypto";
import { DoctorApplication, Doctor, User } from "../models/index.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";
import { uploadToCloudinary } from "../config/cloudinary.js";

/**
 * POST /api/applications
 * Public — submit a doctor registration application with optional file uploads.
 * Files handled by multer (multipart/form-data):
 *   - certificates[] (multiple)
 *   - licenseDoc
 *   - idProof
 *   - profilePhoto
 */
export const submitApplication = async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, dateOfBirth, gender, address,
      specialty, subSpecialty, experienceYears, licenseNumber, licenseExpiry,
      qualifications, hospital, consultationFee, bio, languages,
    } = req.body;

    // --- Validation ---
    if (!firstName || !lastName || !email || !specialty || !experienceYears || !licenseNumber || !qualifications || !consultationFee) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "This email is already registered. Please login instead." });
    }

    const existingApp = await DoctorApplication.findOne({ email, status: { $in: ["pending", "approved"] } });
    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: existingApp.status === "pending"
          ? "You already have a pending application. Please wait for review."
          : "Your application was already approved. Check your email for the registration link.",
      });
    }

    // --- Handle File Uploads ---
    const files = req.files || {};

    let certificates = [];
    if (files.certificates) {
      for (const cert of files.certificates) {
        const uploaded = await uploadToCloudinary(cert.buffer, "medicare/applications/certificates", "auto");
        certificates.push({ name: cert.originalname, url: uploaded.fileUrl, publicId: uploaded.publicId });
      }
    }

    let licenseDoc = { url: "", publicId: "" };
    if (files.licenseDoc?.[0]) {
      const r = await uploadToCloudinary(files.licenseDoc[0].buffer, "medicare/applications/licenses", "auto");
      licenseDoc = { url: r.fileUrl, publicId: r.publicId };
    }

    let idProof = { url: "", publicId: "" };
    if (files.idProof?.[0]) {
      const r = await uploadToCloudinary(files.idProof[0].buffer, "medicare/applications/id-proofs", "auto");
      idProof = { url: r.fileUrl, publicId: r.publicId };
    }

    let profilePhoto = { url: "", publicId: "" };
    if (files.profilePhoto?.[0]) {
      const r = await uploadToCloudinary(files.profilePhoto[0].buffer, "medicare/applications/photos", "image");
      profilePhoto = { url: r.fileUrl, publicId: r.publicId };
    }

    // --- Create Application ---
    const application = await DoctorApplication.create({
      firstName, lastName, email, phone,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || "prefer_not_to_say",
      address,
      specialty,
      subSpecialty,
      experienceYears: Number(experienceYears),
      licenseNumber,
      licenseExpiry: licenseExpiry || undefined,
      qualifications,
      hospital,
      consultationFee: Number(consultationFee),
      bio,
      languages: languages ? (Array.isArray(languages) ? languages : languages.split(",").map(l => l.trim())) : [],
      certificates,
      licenseDoc,
      idProof,
      profilePhoto,
    });

    res.status(201).json({
      success: true,
      message: "Application submitted successfully. You will be notified once reviewed.",
      data: { id: application._id, status: application.status },
    });
  } catch (error) {
    console.error("Error in submitApplication:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/applications
 * Protected — SDoc/Admin only. Get all applications with optional status filter.
 */
export const getApplications = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const applications = await DoctorApplication.find(filter)
      .populate("reviewedBy", "firstName lastName")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    console.error("Error in getApplications:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/applications/:id/approve
 * Protected — SDoc/Admin only. Approve and generate a one-time registration link.
 */
export const approveApplication = async (req, res) => {
  try {
    const application = await DoctorApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    if (application.status !== "pending") return res.status(400).json({ success: false, message: `Application already ${application.status}` });

    const rawToken = application.generateRegistrationToken();
    application.status = "approved";
    application.reviewedBy = req.user._id;
    application.reviewNote = req.body.note || "";
    application.reviewedAt = new Date();
    await application.save();

    const registrationLink = `${process.env.CLIENT_URL}/register-doctor?token=${rawToken}`;
    res.status(200).json({
      success: true,
      message: "Application approved.",
      registrationLink,
      applicantEmail: application.email,
    });
  } catch (error) {
    console.error("Error in approveApplication:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/applications/:id/reject
 * Protected — SDoc/Admin only.
 */
export const rejectApplication = async (req, res) => {
  try {
    const application = await DoctorApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    if (application.status !== "pending") return res.status(400).json({ success: false, message: `Application already ${application.status}` });

    application.status = "rejected";
    application.reviewedBy = req.user._id;
    application.reviewNote = req.body.reason || "No reason provided";
    application.reviewedAt = new Date();
    await application.save();
    res.status(200).json({ success: true, message: "Application rejected." });
  } catch (error) {
    console.error("Error in rejectApplication:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * POST /api/applications/register
 * Public — Doctor sets password using their one-time approval token.
 */
export const registerWithToken = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: "Token and password are required" });
    if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const application = await DoctorApplication.findOne({
      registrationToken: hashedToken,
      registrationTokenExpiry: { $gt: new Date() },
      tokenUsed: false,
      status: "approved",
    });

    if (!application) return res.status(400).json({ success: false, message: "Invalid or expired registration token" });

    const existingUser = await User.findOne({ email: application.email });
    if (existingUser) return res.status(400).json({ success: false, message: "An account with this email already exists" });

    const doctor = new Doctor({
      firstName: application.firstName,
      lastName: application.lastName,
      email: application.email,
      password,                           // plain — pre-save hook hashes it
      phone: application.phone,
      role: "doctor",
      specialty: application.specialty,
      subSpecialty: application.subSpecialty,
      experienceYears: application.experienceYears,
      licenseNumber: application.licenseNumber,
      hospital: application.hospital,
      consultationFee: { amount: application.consultationFee, currency: "INR" },
      bio: application.bio,
      languages: application.languages,
      isVerified: true,
      profilePicture: application.profilePhoto?.url
        ? { url: application.profilePhoto.url, publicId: application.profilePhoto.publicId }
        : undefined,
    });

    await doctor.save();
    application.tokenUsed = true;
    await application.save();

    generateTokenAndSetCookie(doctor._id, res);
    res.status(201).json({ success: true, message: "Doctor account created successfully!", user: doctor.toSafeObject() });
  } catch (error) {
    console.error("Error in registerWithToken:", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
