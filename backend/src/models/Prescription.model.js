import mongoose from "mongoose";

const { Schema, model } = mongoose;

// --- Medication Sub-Schema ---
// Medications are embedded as snapshots. Drug details are captured at time of
// prescribing so historical prescriptions remain unchanged if drug info is updated.

const MedicationSchema = new Schema(
  {
    drugName: {
      type: String,
      required: [true, "Drug name is required"],
      trim: true,
      maxlength: [200, "Drug name cannot exceed 200 characters"],
    },
    genericName: { type: String, trim: true, maxlength: [200, "Generic name cannot exceed 200 characters"] },
    dosage: {
      amount: { type: String, required: [true, "Dosage amount is required"], trim: true },
      unit: {
        type: String,
        required: [true, "Dosage unit is required"],
        enum: ["mg", "mcg", "g", "ml", "IU", "drops", "puffs", "tablets", "capsules", "units"],
      },
    },
    frequency: {
      type: String,
      required: [true, "Frequency is required"],
      enum: ["once_daily", "twice_daily", "three_times_daily", "four_times_daily", "every_4_hours", "every_6_hours", "every_8_hours", "every_12_hours", "weekly", "fortnightly", "as_needed", "before_meals", "after_meals", "at_bedtime"],
    },
    duration: {
      value: { type: Number, required: [true, "Duration value is required"], min: 1 },
      unit: { type: String, enum: ["days", "weeks", "months"], required: [true, "Duration unit is required"] },
    },
    route: {
      type: String,
      enum: ["oral", "intravenous", "intramuscular", "subcutaneous", "topical", "inhalation", "sublingual", "rectal", "ophthalmic", "otic", "nasal"],
      default: "oral",
    },
    instructions: { type: String, trim: true, maxlength: [500, "Instructions cannot exceed 500 characters"] },
    quantity: { type: Number, min: 1 },
    refills: { type: Number, default: 0, min: 0, max: 12 },
  },
  { _id: true }
);

// --- Main Prescription Schema ---

const PrescriptionSchema = new Schema(
  {
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor reference is required"],
      index: true,
    },
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },
    // Optional: prescriptions can be issued outside of a formal appointment
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment", default: null },
    // Auto-generated in pre-save hook: "RX-YYYYMMDD-XXXXX"
    prescriptionNumber: { type: String, unique: true, trim: true },
    medications: {
      type: [MedicationSchema],
      validate: {
        validator: (meds) => meds && meds.length > 0,
        message: "At least one medication is required",
      },
    },
    clinicalNotes: { type: String, trim: true, maxlength: [2000, "Clinical notes cannot exceed 2000 characters"], default: "" },
    diagnosis: { type: String, trim: true, maxlength: [500, "Diagnosis cannot exceed 500 characters"] },
    // Confirms the doctor reviewed the patient's allergy list before prescribing
    allergiesConfirmed: { type: Boolean, default: false },
    issuedAt: { type: Date, default: Date.now },
    // Default validity: 30 days from issuance
    validUntil: { type: Date, default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    status: { type: String, enum: ["active", "dispensed", "expired", "cancelled"], default: "active" },
    doctorSignature: { type: String, trim: true },
    // For future pharmacy integration
    dispensedBy: {
      pharmacyName: { type: String, trim: true },
      dispensedAt: { type: Date },
    },
    pdfUrl: { type: String, trim: true },
    pdfPublicId: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Virtuals ---

PrescriptionSchema.virtual("isExpired").get(function () {
  return this.validUntil && this.validUntil < new Date();
});

PrescriptionSchema.virtual("medicationCount").get(function () {
  return this.medications ? this.medications.length : 0;
});

// --- Pre-save Hook ---

PrescriptionSchema.pre("save", function (next) {
  if (!this.prescriptionNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.prescriptionNumber = `RX-${dateStr}-${random}`;
  }
  if (this.isModified("validUntil") || this.isNew) {
    if (this.validUntil < new Date() && this.status === "active") {
      this.status = "expired";
    }
  }
  next();
});

// --- Indexes ---

PrescriptionSchema.index({ patient: 1, issuedAt: -1 }, { name: "idx_patient_prescriptions" });
PrescriptionSchema.index({ doctor: 1, issuedAt: -1 }, { name: "idx_doctor_prescriptions" });
// Enforces one prescription per appointment
PrescriptionSchema.index({ appointment: 1 }, { unique: true, sparse: true, name: "idx_unique_prescription_per_appointment" });
PrescriptionSchema.index({ status: 1, validUntil: 1 }, { name: "idx_prescription_expiry" });

export const Prescription = model("Prescription", PrescriptionSchema);
