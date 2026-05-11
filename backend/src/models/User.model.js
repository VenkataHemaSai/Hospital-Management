/**
 * @file User.model.js
 * @description Polymorphic User schema using Mongoose Discriminators.
 *
 * ARCHITECTURE DECISION — Why Discriminators over Separate Collections?
 * ─────────────────────────────────────────────────────────────────────
 * Option A (Rejected): Three separate collections — users, doctors, patients.
 *   ✗ Auth middleware must query 3 collections to validate a JWT.
 *   ✗ Email uniqueness must be enforced across 3 collections (complex).
 *   ✗ Every role-agnostic query (e.g., "find user by ID") needs multiple roundtrips.
 *
 * Option B (Rejected): Single "fat" User doc with nullable role-specific fields.
 *   ✗ Wastes storage — Patient documents carry empty doctor-only fields.
 *   ✗ No schema-level validation per role; bugs surface at runtime.
 *
 * Option C (Chosen): Single `users` collection with Mongoose Discriminators.
 *   ✓ One auth query — JWT validation hits ONE indexed collection.
 *   ✓ Email uniqueness enforced by a single sparse unique index.
 *   ✓ Role-specific fields are fully validated by their own sub-schema.
 *   ✓ Mongoose attaches a `__t` discriminator key automatically; queries
 *     like `Doctor.find()` automatically filter by role — zero extra code.
 *   ✓ All users can be queried polymorphically via the base `User` model.
 */

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model } = mongoose;

// ─── Reusable Sub-Schemas ────────────────────────────────────────────────────

/**
 * Embedded emergency contact — kept inline on Patient because:
 * - It is always accessed WITH the patient document (no independent queries).
 * - It is never shared across documents.
 * - Avoids an extra JOIN-equivalent $lookup on every patient read.
 */
const EmergencyContactSchema = new Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false } // No need for an ID on an embedded sub-document
);

/**
 * Doctor Availability — One entry per weekday.
 * Embedded as an array on the Doctor document because:
 * - Always fetched with the doctor for scheduling UI.
 * - Max 7 entries — bounded size, safe to embed.
 * - Updating a time slot is an atomic $set on the parent document.
 */
const TimeSlotSchema = new Schema(
  {
    start: { type: String, required: true }, // "09:00" (24h format)
    end: { type: String, required: true },   // "09:30"
  },
  { _id: false }
);

const AvailabilitySchema = new Schema(
  {
    day: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true,
    },
    isAvailable: { type: Boolean, default: true },
    slots: [TimeSlotSchema], // e.g. [{ start: "09:00", end: "09:30" }, ...]
  },
  { _id: false }
);

/**
 * Qualification sub-document — embedded on Doctor.
 * Bounded, always co-read with the doctor profile, never queried in isolation.
 */
const QualificationSchema = new Schema(
  {
    degree: { type: String, required: true, trim: true },   // "MBBS", "MD"
    institution: { type: String, required: true, trim: true },
    year: { type: Number, min: 1950, max: new Date().getFullYear() },
  },
  { _id: false }
);

// ─── Base User Schema ────────────────────────────────────────────────────────

const UserSchema = new Schema(
  {
    // Core identity fields shared across ALL roles
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,           // Creates a unique index on the `users` collection
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,          // NEVER returned in queries by default — must be explicit
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-()]{7,15}$/, "Please provide a valid phone number"],
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      required: true,
    },
    profilePicture: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }, // Cloudinary public ID for deletion
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    lastLogin: { type: Date },
  },
  {
    timestamps: true,         // Adds createdAt and updatedAt automatically
    discriminatorKey: "role", // Mongoose uses the `role` field as the discriminator key
    collection: "users",      // All roles stored in one collection
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ────────────────────────────────────────────────────────────────

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// ─── Pre-save Middleware ─────────────────────────────────────────────────────

// Hash password before saving — only when the password field is modified
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Methods ────────────────────────────────────────────────────────

UserSchema.methods.comparePassword = async function (candidatePassword) {
  // `this.password` is excluded by default; caller must explicitly select it
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.passwordResetExpires;
  return obj;
};

// ─── Base Model ──────────────────────────────────────────────────────────────

export const User = model("User", UserSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// DISCRIMINATOR: Patient
// Extends the base User schema with patient-specific fields.
// ═══════════════════════════════════════════════════════════════════════════════

const PatientSchema = new Schema({
  dateOfBirth: {
    type: Date,
    required: [true, "Date of birth is required"],
  },
  gender: {
    type: String,
    enum: ["male", "female", "other", "prefer_not_to_say"],
    required: true,
  },
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
    default: "unknown",
  },
  /**
   * medicalHistorySummary — EMBEDDED (not referenced).
   * This is a lightweight narrative summary, not full records.
   * Full records with files live in the MedicalRecord collection.
   * Rationale: This summary is ALWAYS needed when a doctor views a patient
   * before an appointment — a reference would require an extra query.
   */
  medicalHistorySummary: {
    type: String,
    maxlength: [1000, "Medical history summary cannot exceed 1000 characters"],
    default: "",
  },
  /**
   * Allergies — EMBEDDED as a simple string array.
   * Bounded, always co-read, never queried independently.
   * Max ~20 entries in practice. Embedding is correct here.
   */
  allergies: [{ type: String, trim: true }],
  emergencyContact: EmergencyContactSchema,
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    country: { type: String, trim: true },
    zipCode: { type: String, trim: true },
  },
});

// Virtual: Calculate patient age on-the-fly (never store mutable derived data)
PatientSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
});

export const Patient = User.discriminator("patient", PatientSchema);

// ═══════════════════════════════════════════════════════════════════════════════
// DISCRIMINATOR: Doctor
// Extends the base User schema with professional and scheduling fields.
// ═══════════════════════════════════════════════════════════════════════════════

const DoctorSchema = new Schema({
  specialty: {
    type: String,
    required: [true, "Specialty is required"],
    trim: true,
    // e.g., "Cardiology", "Dermatology", "General Practice"
  },
  /**
   * qualifications — EMBEDDED array.
   * Always displayed with the doctor profile. Bounded (< 20 in practice).
   * No independent querying needed. Embedding is the right call.
   */
  qualifications: [QualificationSchema],
  experienceYears: {
    type: Number,
    required: true,
    min: [0, "Experience cannot be negative"],
    max: [60, "Experience cannot exceed 60 years"],
  },
  consultationFee: {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR", uppercase: true, trim: true },
  },
  /**
   * availability — EMBEDDED array (max 7 entries, one per weekday).
   * This drives the appointment booking UI and is ALWAYS fetched with
   * the doctor's profile. Embedding eliminates a $lookup on every
   * "view doctor's available slots" page load.
   * Updates (e.g., blocking a day) are an atomic $set — no extra collections.
   */
  availability: [AvailabilitySchema],
  /**
   * Appointments booked for a specific date override weekly availability.
   * The actual booked slots are tracked in the Appointment collection.
   * The booking engine queries both: weekly availability + booked appointments.
   */
  licenseNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true, // Sparse: allows multiple docs without this field (e.g., pre-verification)
  },
  hospital: { type: String, trim: true },
  department: { type: String, trim: true },
  isVerified: { type: Boolean, default: false }, // Admin verifies doctor credentials
  bio: {
    type: String,
    maxlength: [500, "Bio cannot exceed 500 characters"],
    default: "",
  },
  languages: [{ type: String, trim: true }], // Languages doctor can consult in
  /**
   * Rating stats — EMBEDDED as a running aggregate.
   * Rationale: Avoid a $lookup + $avg pipeline on every doctor card render.
   * Updated atomically via $inc when a new review is submitted:
   *   { $inc: { "rating.totalScore": 5, "rating.count": 1 } }
   *   average = totalScore / count  (computed in app layer or virtual)
   */
  rating: {
    totalScore: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  acceptingNewPatients: { type: Boolean, default: true },
});

// Virtual: Compute average rating without storing redundant data
DoctorSchema.virtual("averageRating").get(function () {
  if (this.rating.count === 0) return 0;
  return parseFloat((this.rating.totalScore / this.rating.count).toFixed(1));
});

export const Doctor = User.discriminator("doctor", DoctorSchema);

// ─── Indexes ─────────────────────────────────────────────────────────────────
/**
 * INDEX STRATEGY for `users` collection:
 *
 * 1. email — unique index (defined inline via `unique: true` above).
 *    Handles login and email verification lookups.
 *
 * 2. role — used by admin dashboards to filter by role type.
 *    Compound with isActive for "active doctors" / "active patients" queries.
 *
 * 3. specialty (doctors only) — patients search for doctors by specialty.
 *    Partial index: only indexes documents where role == "doctor",
 *    drastically reducing index size.
 *
 * 4. licenseNumber — sparse unique (defined inline above).
 */

// Compound index: role + isActive — e.g., find all active doctors
UserSchema.index({ role: 1, isActive: 1 });

// Partial index on specialty — only for doctor documents
UserSchema.index(
  { specialty: 1 },
  { partialFilterExpression: { role: "doctor" }, name: "idx_doctor_specialty" }
);

// Text index for doctor search by name or specialty
UserSchema.index(
  { firstName: "text", lastName: "text", specialty: "text" },
  { name: "idx_user_text_search", weights: { specialty: 5, firstName: 3, lastName: 3 } }
);
