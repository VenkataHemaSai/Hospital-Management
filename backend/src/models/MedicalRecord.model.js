import mongoose from "mongoose";

const { Schema, model } = mongoose;

const MedicalRecordSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },

    // Can be the patient themselves or a treating doctor
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Uploader reference is required"],
    },

    // Optional link to the consultation that prompted this record
    appointment: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

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

    fileType: {
      type: String,
      enum: [
        "lab_report",
        "imaging",
        "prescription",
        "vaccination",
        "discharge_summary",
        "insurance",
        "other",
      ],
      required: [true, "File type is required"],
    },

    mimeType: {
      type: String,
      trim: true,
    },

    // Cloudinary CDN delivery URL
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
      trim: true,
    },

    // Cloudinary public ID — required for asset deletion via the API
    publicId: {
      type: String,
      required: [true, "Cloudinary public ID is required"],
      trim: true,
    },

    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },

    fileSize: {
      type: Number, // bytes
      min: 0,
    },

    // If true, any treating doctor can view this record
    isSharedWithDoctors: {
      type: Boolean,
      default: true,
    },

    // Explicit list of doctor IDs for selective sharing
    sharedWith: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    tags: [{ type: String, lowercase: true, trim: true }],

    // Date the medical event occurred, not necessarily the upload date
    recordDate: {
      type: Date,
    },

    // Soft delete to allow recovery before purging from Cloudinary
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// --- Pre-save Hook ---

MedicalRecordSchema.pre("save", function (next) {
  if (this.isModified("isDeleted") && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  next();
});

// --- Indexes ---

MedicalRecordSchema.index(
  { patient: 1, recordDate: -1 },
  { name: "idx_patient_records_by_date" }
);

MedicalRecordSchema.index(
  { patient: 1, fileType: 1, recordDate: -1 },
  { name: "idx_patient_records_by_type" }
);

MedicalRecordSchema.index(
  { patient: 1, isDeleted: 1 },
  { name: "idx_patient_active_records" }
);

MedicalRecordSchema.index(
  { uploadedBy: 1, createdAt: -1 },
  { name: "idx_uploader_records" }
);

MedicalRecordSchema.index(
  { appointment: 1 },
  { sparse: true, name: "idx_appointment_records" }
);

export const MedicalRecord = model("MedicalRecord", MedicalRecordSchema);
