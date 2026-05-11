import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema, model } = mongoose;

// --- Sub-Schemas ---

const EmergencyContactSchema = new Schema(
  {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const TimeSlotSchema = new Schema(
  {
    start: { type: String, required: true }, // 24h format: "09:00"
    end: { type: String, required: true },   // 24h format: "09:30"
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
    slots: [TimeSlotSchema],
  },
  { _id: false }
);

const QualificationSchema = new Schema(
  {
    degree: { type: String, required: true, trim: true },
    institution: { type: String, required: true, trim: true },
    year: { type: Number, min: 1950, max: new Date().getFullYear() },
  },
  { _id: false }
);

// --- Base User Schema ---
// Single `users` collection with Mongoose Discriminators for role-specific fields.
// The `role` field acts as the discriminator key.

const UserSchema = new Schema(
  {
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
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Excluded from query results by default
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
    timestamps: true,
    discriminatorKey: "role",
    collection: "users",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Virtuals ---

UserSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// --- Pre-save Middleware ---

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// --- Instance Methods ---

UserSchema.methods.comparePassword = async function (candidatePassword) {
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

// --- Base Model ---

export const User = model("User", UserSchema);

// --- Discriminator: Patient ---

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
  medicalHistorySummary: {
    type: String,
    maxlength: [1000, "Medical history summary cannot exceed 1000 characters"],
    default: "",
  },
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

// --- Discriminator: Doctor ---

const DoctorSchema = new Schema({
  specialty: {
    type: String,
    required: [true, "Specialty is required"],
    trim: true,
  },
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
  availability: [AvailabilitySchema],
  licenseNumber: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
  },
  hospital: { type: String, trim: true },
  department: { type: String, trim: true },
  isVerified: { type: Boolean, default: false },
  bio: {
    type: String,
    maxlength: [500, "Bio cannot exceed 500 characters"],
    default: "",
  },
  languages: [{ type: String, trim: true }],
  rating: {
    totalScore: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  acceptingNewPatients: { type: Boolean, default: true },
});

DoctorSchema.virtual("averageRating").get(function () {
  if (this.rating.count === 0) return 0;
  return parseFloat((this.rating.totalScore / this.rating.count).toFixed(1));
});

export const Doctor = User.discriminator("doctor", DoctorSchema);

// --- Indexes ---

UserSchema.index({ role: 1, isActive: 1 });

UserSchema.index(
  { specialty: 1 },
  { partialFilterExpression: { role: "doctor" }, name: "idx_doctor_specialty" }
);

UserSchema.index(
  { firstName: "text", lastName: "text", specialty: "text" },
  { name: "idx_user_text_search", weights: { specialty: 5, firstName: 3, lastName: 3 } }
);
