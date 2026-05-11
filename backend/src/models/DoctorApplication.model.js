import mongoose from "mongoose";
import crypto from "crypto";

const { Schema, model } = mongoose;

const DoctorApplicationSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    phone: { type: String, trim: true },
    specialty: { type: String, required: true, trim: true },
    experienceYears: { type: Number, required: true, min: 0 },
    licenseNumber: { type: String, required: true, trim: true },
    qualifications: { type: String, required: true, trim: true },
    hospital: { type: String, trim: true },
    consultationFee: { type: Number, required: true, min: 0 },
    bio: { type: String, maxlength: 500, default: "" },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, default: "" },
    reviewedAt: { type: Date },
    registrationToken: { type: String, select: false },
    registrationTokenExpiry: { type: Date, select: false },
    tokenUsed: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "doctor_applications",
  }
);

DoctorApplicationSchema.methods.generateRegistrationToken = function () {
  const token = crypto.randomBytes(32).toString("hex");
  this.registrationToken = crypto.createHash("sha256").update(token).digest("hex");
  this.registrationTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return token;
};

DoctorApplicationSchema.index({ status: 1, createdAt: -1 });
DoctorApplicationSchema.index({ email: 1 });

export const DoctorApplication = model("DoctorApplication", DoctorApplicationSchema);
