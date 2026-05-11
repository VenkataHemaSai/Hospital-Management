import mongoose from "mongoose";
import crypto from "crypto";

const { Schema, model } = mongoose;

const CertificateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },   // e.g. "MBBS Certificate"
    url: { type: String, required: true },                 // Cloudinary URL
    publicId: { type: String, required: true },            // For deletion
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const DoctorApplicationSchema = new Schema(
  {
    // ── Personal Info ──────────────────────────────────────────────
    firstName:        { type: String, required: true, trim: true },
    lastName:         { type: String, required: true, trim: true },
    email:            { type: String, required: true, lowercase: true, trim: true,
                        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"] },
    phone:            { type: String, trim: true },
    dateOfBirth:      { type: Date },
    gender:           { type: String, enum: ["male", "female", "other", "prefer_not_to_say"], default: "prefer_not_to_say" },
    address:          { type: String, trim: true },

    // ── Professional Info ──────────────────────────────────────────
    specialty:        { type: String, required: true, trim: true },
    subSpecialty:     { type: String, trim: true },
    experienceYears:  { type: Number, required: true, min: 0 },
    licenseNumber:    { type: String, required: true, trim: true },
    licenseExpiry:    { type: Date },
    qualifications:   { type: String, required: true, trim: true },  // e.g. "MBBS - AIIMS, MD Cardiology - JIPMER"
    hospital:         { type: String, trim: true },
    consultationFee:  { type: Number, required: true, min: 0 },
    bio:              { type: String, maxlength: 600, default: "" },
    languages:        [{ type: String, trim: true }],

    // ── Uploaded Documents ─────────────────────────────────────────
    certificates:     [CertificateSchema],              // Degree certificates
    licenseDoc:       {                                  // Medical council license
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    idProof:          {                                  // Govt. ID (Aadhar/Passport)
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },
    profilePhoto:     {                                  // Headshot photo
      url: { type: String, default: "" },
      publicId: { type: String, default: "" },
    },

    // ── Review State ───────────────────────────────────────────────
    status:           { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    reviewedBy:       { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote:       { type: String, default: "" },
    reviewedAt:       { type: Date },
    registrationToken:       { type: String, select: false },
    registrationTokenExpiry: { type: Date, select: false },
    tokenUsed:        { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "doctor_applications",
  }
);

DoctorApplicationSchema.methods.generateRegistrationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.registrationToken = crypto.createHash("sha256").update(token).digest("hex");
  this.registrationTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  return token;
};

DoctorApplicationSchema.index({ status: 1, createdAt: -1 });
DoctorApplicationSchema.index({ email: 1 });

export const DoctorApplication = model("DoctorApplication", DoctorApplicationSchema);
