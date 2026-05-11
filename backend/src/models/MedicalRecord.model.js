/**
 * @file MedicalRecord.model.js
 * @description Medical records with Cloudinary cloud storage integration.
 *
 * ARCHITECTURE DECISION — Separate Collection (not embedded on Patient):
 * ───────────────────────────────────────────────────────────────────────
 * Medical records are REFERENCED (stored in their own collection) because:
 *
 * 1. UNBOUNDED GROWTH: A patient can accumulate hundreds of records over years.
 *    MongoDB documents have a 16MB size limit. Embedding records in the patient
 *    document would hit this limit and degrade performance long before reaching it.
 *    The "embed only bounded arrays" rule from NoSQL design applies here.
 *
 * 2. INDEPENDENT QUERYING: Records are queried independently —
 *    - "All records for patient X uploaded in the last 6 months"
 *    - "All lab reports uploaded by doctor Y for their patients"
 *    - "Find all MRI scans across the system" (admin audit)
 *    These queries are unnatural and slow on an embedded array.
 *
 * 3. WRITE ISOLATION: Uploading a new record updates only the MedicalRecord
 *    collection. If records were embedded, every upload would write-lock
 *    the entire patient document, causing contention under concurrent load.
 *
 * 4. MULTI-TENANCY OF UPLOADERS: Both patients and doctors can upload records.
 *    An embedded design on Patient would need to track uploaders in the
 *    patient's own document — an awkward and unsafe pattern.
 *
 * Cloudinary Integration Notes:
 * ─────────────────────────────
 * We store BOTH `fileUrl` and `publicId` from Cloudinary.
 * - `fileUrl` — the CDN delivery URL, used for rendering/downloading.
 * - `publicId` — the unique key on Cloudinary, required to DELETE or
 *   TRANSFORM the asset via the Cloudinary API. Without it, records
 *   would accumulate on Cloudinary even after DB deletion (orphan files).
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MedicalRecordSchema = new Schema(
  {
    /**
     * REFERENCED: patient — the subject of the medical record.
     * Always indexed because the primary access pattern is
     * "fetch all records for patient X".
     */
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },

    /**
     * REFERENCED: uploadedBy — the user who uploaded this record.
     * Can be the patient themselves OR a treating doctor.
     * Stored as a reference (not embedded) so doctor/patient profiles
     * can change independently without corrupting record history.
     */
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader reference is required"],
    },

    /**
     * OPTIONAL: appointment — links a record to the consultation that
     * prompted it (e.g., post-consultation lab results).
     * Sparse reference: many records won't be tied to an appointment
     * (e.g., old records a patient uploads from before using the platform).
     */
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    // ─── File Metadata ───────────────────────────────────────────────────────

    title: {
      type: String,
      required: [true, "Record title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
    },

    /**
     * fileType — broad categorization for UI display and filtering.
     * More granular MIME type is stored separately for download handling.
     */
    fileType: {
      type: String,
      enum: [
        "lab_report",      // Blood tests, urine analysis, etc.
        "imaging",         // X-Ray, MRI, CT Scan, Ultrasound
        "prescription",    // Scanned paper prescriptions
        "vaccination",     // Vaccination records
        "discharge_summary",
        "insurance",
        "other",
      ],
      required: [true, "File type is required"],
    },

    mimeType: {
      type: String,
      trim: true,
      // e.g., "application/pdf", "image/jpeg", "image/png"
    },

    // ─── Cloudinary Fields ────────────────────────────────────────────────────

    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
      // Example: "https://res.cloudinary.com/your-cloud/image/upload/v123/records/abc.pdf"
    },

    /**
     * publicId — the Cloudinary asset identifier.
     * CRITICAL: Must be stored for deletion. Without this, calling
     * cloudinary.uploader.destroy() is impossible.
     * Example: "hospital-platform/medical-records/patient_id/filename"
     */
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
      trim: true,
    },

    /**
     * thumbnailUrl — for image/PDF files, Cloudinary can generate a
     * thumbnail using transformation URLs. Store it to avoid recomputing
     * the transformation URL on every render.
     * Optional: can be derived from publicId + Cloudinary SDK if not stored.
     */
    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },

    fileSize: {
      type: Number, // Size in bytes
      min: 0,
    },

    // ─── Access Control ───────────────────────────────────────────────────────

    /**
     * isSharedWithDoctors — if true, any doctor treating this patient
     * can view this record during a consultation.
     * If false, it's private (patient-only, or shared only with specific doctors).
     */
    isSharedWithDoctors: {
      type: Boolean,
      default: true,
    },

    /**
     * sharedWith — explicit list of doctor IDs who can access this record.
     * Used when isSharedWithDoctors is false but selective sharing is needed.
     * Bounded array (a patient won't have 1000 doctors), safe to embed.
     */
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // ─── Categorization ───────────────────────────────────────────────────────

    /**
     * tags — free-form tags for search and filtering.
     * Examples: ["blood test", "CBC", "2024", "routine checkup"]
     * Stored as an array of lowercase strings for case-insensitive search.
     */
    tags: [{ type: String, lowercase: true, trim: true }],

    recordDate: {
      type: Date,
      // The date the medical event occurred (not the upload date — those are different)
      // e.g., a 2019 X-ray uploaded today has recordDate: 2019-01-15
    },

    isDeleted: {
      type: Boolean,
      default: false,
      // Soft delete: marking as deleted before actually removing from Cloudinary
      // Allows a grace period for recovery before the Cloudinary asset is purged
    },
    deletedAt: { type: Date },
  },
  {
    timestamps: true, // createdAt = upload date, updatedAt = last metadata edit
  }
);

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

MedicalRecordSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * INDEX 1 — Primary access pattern: all records for a patient, sorted by date.
 * Covers: patient dashboard, doctor reviewing patient history.
 * The compound with fileType enables efficient filtering:
 *   "Show all lab reports for patient X"
 */
MedicalRecordSchema.index(
  { patient: 1, recordDate: -1 },
  { name: "idx_patient_records_by_date" }
);

/**
 * INDEX 2 — Filter by file type for a patient.
 * Covers: "Show all MRI scans for patient X"
 */
MedicalRecordSchema.index(
  { patient: 1, fileType: 1, recordDate: -1 },
  { name: "idx_patient_records_by_type" }
);

/**
 * INDEX 3 — Soft-delete filtering.
 * Most queries include { isDeleted: false }. This index ensures
 * deleted records are skipped efficiently without scanning the full collection.
 */
MedicalRecordSchema.index(
  { patient: 1, isDeleted: 1 },
  { name: "idx_patient_active_records" }
);

/**
 * INDEX 4 — Records uploaded by a doctor (for doctor's uploaded history).
 */
MedicalRecordSchema.index(
  { uploadedBy: 1, createdAt: -1 },
  { name: "idx_uploader_records" }
);

/**
 * INDEX 5 — Appointment-linked records.
 * Covers: "Fetch all documents attached to appointment Y"
 * Sparse because most records won't have an appointment reference.
 */
MedicalRecordSchema.index(
  { appointment: 1 },
  { sparse: true, name: "idx_appointment_records" }
);

export const MedicalRecord = model("MedicalRecord", MedicalRecordSchema);
