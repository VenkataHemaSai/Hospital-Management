/**
 * @file Prescription.model.js
 * @description Digital prescription schema linking Doctor → Patient → Appointment.
 *
 * ARCHITECTURE DECISION — The Medications Array:
 * ───────────────────────────────────────────────
 * Medications are EMBEDDED (not referenced from a separate Drug collection) because:
 *
 * 1. BOUNDED SIZE: A typical prescription has 1–15 medications.
 *    This is inherently bounded — embedding is safe and efficient.
 *
 * 2. SNAPSHOT SEMANTICS (Critical): Drug names, dosages, and instructions
 *    must be preserved AS-OF the time of prescribing. If medications were
 *    referenced from a master Drug collection, updates to drug information
 *    would retroactively alter historical prescriptions — a medical safety issue.
 *    Embedding creates an immutable snapshot. This is a domain requirement, not
 *    just a performance choice.
 *
 * 3. ALWAYS CO-ACCESSED: A prescription is meaningless without its medications.
 *    There is no use case where you'd fetch a prescription but not need its drugs.
 *
 * The Appointment Reference:
 * ──────────────────────────
 * Prescription REFERENCES Appointment (not embedded) because:
 * - Appointments and prescriptions have independent lifecycles.
 * - An appointment may exist without a prescription (no-show, cancelled).
 * - A prescription is a legal document that may outlive the appointment record.
 * - Querying "all prescriptions for a patient" must not require appointment data.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ─── Medication Sub-Schema ────────────────────────────────────────────────────

/**
 * Embedded medication entry — snapshot semantics, immutable after creation.
 * Each field mirrors a real prescription's required information.
 */
const MedicationSchema = new Schema(
  {
    drugName: {
      type: String,
      required: [true, "Drug name is required"],
      trim: true,
      maxlength: [200, "Drug name cannot exceed 200 characters"],
      // Store the full pharmaceutical name, e.g., "Amoxicillin 500mg Capsules"
    },
    genericName: {
      type: String,
      trim: true,
      maxlength: [200, "Generic name cannot exceed 200 characters"],
      // Optional: generic equivalent for patient awareness
    },
    dosage: {
      amount: {
        type: String,
        required: [true, "Dosage amount is required"],
        trim: true,
        // e.g., "500", "10", "0.5"
      },
      unit: {
        type: String,
        required: [true, "Dosage unit is required"],
        enum: ["mg", "mcg", "g", "ml", "IU", "drops", "puffs", "tablets", "capsules", "units"],
      },
    },
    frequency: {
      type: String,
      required: [true, "Frequency is required"],
      enum: [
        "once_daily",
        "twice_daily",
        "three_times_daily",
        "four_times_daily",
        "every_4_hours",
        "every_6_hours",
        "every_8_hours",
        "every_12_hours",
        "weekly",
        "fortnightly",
        "as_needed",         // PRN medications
        "before_meals",
        "after_meals",
        "at_bedtime",
      ],
    },
    duration: {
      value: {
        type: Number,
        required: [true, "Duration value is required"],
        min: 1,
      },
      unit: {
        type: String,
        enum: ["days", "weeks", "months"],
        required: [true, "Duration unit is required"],
      },
    },
    route: {
      type: String,
      enum: ["oral", "intravenous", "intramuscular", "subcutaneous", "topical", "inhalation", "sublingual", "rectal", "ophthalmic", "otic", "nasal"],
      default: "oral",
    },
    instructions: {
      type: String,
      trim: true,
      maxlength: [500, "Instructions cannot exceed 500 characters"],
      // e.g., "Take with food", "Avoid dairy products", "Do not crush tablet"
    },
    quantity: {
      type: Number,
      min: 1,
      // Total quantity to dispense — helps pharmacist
    },
    refills: {
      type: Number,
      default: 0,
      min: 0,
      max: 12,
    },
  },
  { _id: true } // Keep _id here — useful for addressing individual medications in updates
);

// ─── Main Prescription Schema ─────────────────────────────────────────────────

const PrescriptionSchema = new Schema(
  {
    /**
     * REFERENCED: doctor — the prescribing physician.
     * Indexed for "all prescriptions written by doctor X" queries.
     */
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor reference is required"],
      index: true,
    },

    /**
     * REFERENCED: patient — the recipient.
     * Indexed for "all prescriptions for patient X" queries.
     * Most frequent access pattern: patient views their prescription history.
     */
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },

    /**
     * REFERENCED: appointment — the consultation this was issued in.
     * One appointment → at most one prescription (enforced by unique index below).
     * Optional: prescriptions can theoretically be issued without a formal appointment
     * (e.g., emergency refills), hence not strictly required.
     */
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    // ─── Prescription Details ─────────────────────────────────────────────────

    prescriptionNumber: {
      type: String,
      unique: true,
      trim: true,
      // Auto-generated: "RX-YYYYMMDD-XXXXX" (generated in pre-save hook)
    },

    /**
     * medications — EMBEDDED ARRAY (snapshot semantics, see header comments).
     * Validates: at least one medication must be prescribed.
     */
    medications: {
      type: [MedicationSchema],
      validate: {
        validator: (meds) => meds && meds.length > 0,
        message: "At least one medication is required",
      },
    },

    // Doctor's clinical notes accompanying the prescription
    clinicalNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Clinical notes cannot exceed 2000 characters"],
      default: "",
    },

    // Diagnosis for which this prescription is issued
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [500, "Diagnosis cannot exceed 500 characters"],
    },

    // Patient allergies confirmed by doctor at time of prescribing
    allergiesConfirmed: {
      type: Boolean,
      default: false,
      // Doctor confirms they've reviewed the patient's allergy list
    },

    // ─── Validity & Status ────────────────────────────────────────────────────

    issuedAt: {
      type: Date,
      default: Date.now,
    },

    /**
     * validUntil — prescription expiry date.
     * Default: 30 days from issuance for standard prescriptions.
     * Controlled substances may have shorter validity.
     */
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },

    status: {
      type: String,
      enum: ["active", "dispensed", "expired", "cancelled"],
      default: "active",
    },

    // ─── Digital Signature / Audit ────────────────────────────────────────────

    /**
     * doctorSignature — in production, this would be a URL to a digitally
     * signed image or a cryptographic signature hash.
     * Stored for legal/regulatory compliance.
     */
    doctorSignature: {
      type: String,
      trim: true,
    },

    /**
     * dispensedBy — pharmacy/pharmacist who fulfilled this prescription.
     * Optional field for future pharmacy integration.
     */
    dispensedBy: {
      pharmacyName: { type: String, trim: true },
      dispensedAt: { type: Date },
    },

    // Cloudinary PDF of the prescription (generated after creation)
    pdfUrl: {
      type: String,
      trim: true,
    },
    pdfPublicId: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

PrescriptionSchema.virtual("isExpired").get(function () {
  return this.validUntil && this.validUntil < new Date();
});

PrescriptionSchema.virtual("medicationCount").get(function () {
  return this.medications ? this.medications.length : 0;
});

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

PrescriptionSchema.pre("save", function (next) {
  // Auto-generate prescription number on first save
  if (!this.prescriptionNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.prescriptionNumber = `RX-${dateStr}-${random}`;
  }

  // Auto-expire: if validUntil is past and status is still "active", mark expired
  if (this.isModified("validUntil") || this.isNew) {
    if (this.validUntil < new Date() && this.status === "active") {
      this.status = "expired";
    }
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * INDEX 1 — Patient prescription history (most common query).
 * "Show all prescriptions for patient X, newest first"
 * Supports the patient's prescription history page with pagination.
 */
PrescriptionSchema.index(
  { patient: 1, issuedAt: -1 },
  { name: "idx_patient_prescriptions" }
);

/**
 * INDEX 2 — Doctor's prescription history.
 * "Show all prescriptions written by doctor Y this month"
 */
PrescriptionSchema.index(
  { doctor: 1, issuedAt: -1 },
  { name: "idx_doctor_prescriptions" }
);

/**
 * INDEX 3 — One prescription per appointment (unique).
 * Prevents a doctor from issuing duplicate prescriptions for the same consultation.
 * Sparse: allows prescriptions without an appointment reference.
 */
PrescriptionSchema.index(
  { appointment: 1 },
  {
    unique: true,
    sparse: true,
    name: "idx_unique_prescription_per_appointment",
  }
);

/**
 * INDEX 4 — Expiry-based queries.
 * "Find all active prescriptions expiring in the next 7 days" (for reminders)
 */
PrescriptionSchema.index(
  { status: 1, validUntil: 1 },
  { name: "idx_prescription_expiry" }
);

export const Prescription = model("Prescription", PrescriptionSchema);
