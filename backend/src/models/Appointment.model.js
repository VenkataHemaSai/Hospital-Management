import mongoose from "mongoose";

const { Schema, model } = mongoose;

// --- Sub-Schemas ---

const BookedTimeSlotSchema = new Schema(
  {
    start: {
      type: String,
      required: [true, "Slot start time is required"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format (24h)"],
    },
    end: {
      type: String,
      required: [true, "Slot end time is required"],
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format (24h)"],
    },
  },
  { _id: false }
);

const VitalSignsSchema = new Schema(
  {
    bloodPressure: { type: String, trim: true },  // e.g. "120/80 mmHg"
    heartRate: { type: Number },                   // bpm
    temperature: { type: Number },                 // Celsius
    oxygenSaturation: { type: Number },            // SpO2 %
    weight: { type: Number },                      // kg
    height: { type: Number },                      // cm
    notes: { type: String, maxlength: 300 },
  },
  { _id: false }
);

// --- Main Appointment Schema ---

const AppointmentSchema = new Schema(
  {
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true,
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor reference is required"],
      index: true,
    },

    // Date portion stored separately from time slot to simplify range queries
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
    },

    timeSlot: {
      type: BookedTimeSlotSchema,
      required: [true, "Time slot is required"],
    },

    // Appointment lifecycle: pending → approved → ongoing → completed
    status: {
      type: String,
      enum: ["pending", "approved", "ongoing", "completed", "cancelled", "no_show", "rescheduled"],
      default: "pending",
      index: true,
    },

    appointmentType: {
      type: String,
      enum: ["in_person", "telemedicine"],
      default: "telemedicine",
    },

    symptoms: {
      type: String,
      trim: true,
      maxlength: [1000, "Symptoms description cannot exceed 1000 characters"],
    },
    patientNotes: {
      type: String,
      trim: true,
      maxlength: [500, "Patient notes cannot exceed 500 characters"],
    },
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Doctor notes cannot exceed 2000 characters"],
    },
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [500, "Diagnosis cannot exceed 500 characters"],
    },

    vitalSigns: VitalSignsSchema,

    meetingLink: {
      type: String,
      trim: true,
    },

    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },

    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: [300, "Cancellation reason cannot exceed 300 characters"],
    },
    cancelledAt: { type: Date },

    rescheduledTo: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },

    payment: {
      status: {
        type: String,
        enum: ["pending", "paid", "refunded", "waived"],
        default: "pending",
      },
      amount: { type: Number },
      currency: { type: String, default: "INR" },
      transactionId: { type: String, trim: true },
      paidAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// --- Virtuals ---

AppointmentSchema.virtual("isPast").get(function () {
  const now = new Date();
  const apptDateTime = new Date(this.appointmentDate);
  if (this.timeSlot?.end) {
    const [hours, minutes] = this.timeSlot.end.split(":").map(Number);
    apptDateTime.setHours(hours, minutes, 0, 0);
  }
  return apptDateTime < now;
});

// --- Pre-save Hook ---

AppointmentSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "cancelled" && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  next();
});

// --- Indexes ---

// Compound unique index prevents double-booking at the database level
AppointmentSchema.index(
  { doctor: 1, appointmentDate: 1, "timeSlot.start": 1 },
  {
    unique: true,
    name: "idx_no_double_booking",
    // Uncomment to allow cancelled slots to be rebooked:
    // partialFilterExpression: { status: { $nin: ["cancelled", "rescheduled"] } }
  }
);

AppointmentSchema.index(
  { patient: 1, appointmentDate: -1 },
  { name: "idx_patient_appointments" }
);

AppointmentSchema.index(
  { doctor: 1, appointmentDate: 1, status: 1 },
  { name: "idx_doctor_schedule" }
);

AppointmentSchema.index(
  { status: 1, appointmentDate: 1 },
  { name: "idx_status_date" }
);

export const Appointment = model("Appointment", AppointmentSchema);
