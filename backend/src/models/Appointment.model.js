/**
 * @file Appointment.model.js
 * @description Appointment schema with built-in double-booking prevention.
 *
 * ARCHITECTURE DECISION — Referencing vs. Embedding:
 * ──────────────────────────────────────────────────
 * Patient and Doctor are REFERENCED (not embedded) because:
 * 1. User documents are large and change independently (profile updates,
 *    password changes, etc.). Embedding would require updating every
 *    appointment document when a doctor changes their phone number.
 * 2. We need to query appointments FROM a user's perspective
 *    (e.g., "all appointments for patient X") — referencing supports this
 *    with a simple indexed query.
 * 3. User documents are MongoDB documents themselves — embedding them
 *    would duplicate data across potentially hundreds of appointment records.
 *
 * DOUBLE-BOOKING PREVENTION:
 * ──────────────────────────
 * A compound unique index on { doctor, appointmentDate, timeSlot.start }
 * makes it IMPOSSIBLE at the database level for two appointments to
 * occupy the same slot. This is enforced in the DB, not just the app layer —
 * race conditions between concurrent booking requests are handled correctly.
 * The application layer adds an extra check to show friendly error messages.
 *
 * The index uses `timeSlot.start` because:
 * - Slots are discrete (e.g., 30-minute blocks) with a known start time.
 * - Storing start time as "HH:MM" string and indexing it is efficient.
 * - The scheduling engine already validates end time via slot duration rules.
 */

import mongoose from "mongoose";

const { Schema, model } = mongoose;

// ─── Sub-Schemas ─────────────────────────────────────────────────────────────

/**
 * TimeSlot — EMBEDDED on Appointment.
 * Represents the booked window within a day.
 * Embedding is correct: the slot is meaningless without its appointment.
 * No independent lifecycle or querying needed.
 */
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

/**
 * VitalSigns — EMBEDDED on Appointment (recorded during the session).
 * Always accessed with its appointment. Bounded, never queried in isolation.
 */
const VitalSignsSchema = new Schema(
  {
    bloodPressure: { type: String, trim: true },   // e.g., "120/80 mmHg"
    heartRate: { type: Number },                    // bpm
    temperature: { type: Number },                  // Celsius
    oxygenSaturation: { type: Number },             // SpO2 %
    weight: { type: Number },                       // kg
    height: { type: Number },                       // cm
    notes: { type: String, maxlength: 300 },
  },
  { _id: false }
);

// ─── Main Appointment Schema ──────────────────────────────────────────────────

const AppointmentSchema = new Schema(
  {
    /**
     * REFERENCED: Patient and Doctor.
     * Populate only when needed (e.g., for notifications or detailed views).
     * Most booking queries only need the IDs to check availability.
     * Use .select() to pull only needed fields when populating.
     */
    patient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient reference is required"],
      index: true, // Patient views their own appointment history — frequently queried
    },
    doctor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Doctor reference is required"],
      index: true, // Doctor views their daily schedule — most frequent query pattern
    },

    /**
     * appointmentDate — stored as a Date (date portion only, UTC midnight).
     * The time is captured separately in timeSlot.
     * Rationale: Separating date from time makes range queries trivial:
     *   db.appointments.find({ doctor: X, appointmentDate: { $gte: startOfDay, $lte: endOfDay } })
     * Avoids complex time-zone math for slot collision checks.
     */
    appointmentDate: {
      type: Date,
      required: [true, "Appointment date is required"],
    },

    timeSlot: {
      type: BookedTimeSlotSchema,
      required: [true, "Time slot is required"],
    },

    /**
     * APPOINTMENT LIFECYCLE:
     * pending    → Patient booked, awaiting doctor approval
     * approved   → Doctor confirmed the slot
     * ongoing    → Telemedicine session is live
     * completed  → Session ended, doctor can now write prescription
     * cancelled  → Cancelled by either party (see cancelledBy)
     * no_show    → Patient did not join the session
     * rescheduled → Moved to a new slot (original appointment closed)
     */
    status: {
      type: String,
      enum: ["pending", "approved", "ongoing", "completed", "cancelled", "no_show", "rescheduled"],
      default: "pending",
      index: true, // Frequently filtered: "show only upcoming appointments"
    },

    /**
     * appointmentType — determines whether a physical or telemedicine
     * meeting link should be generated.
     */
    appointmentType: {
      type: String,
      enum: ["in_person", "telemedicine"],
      default: "telemedicine",
    },

    // Patient-provided information at the time of booking
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

    // Doctor's notes during/after the session
    doctorNotes: {
      type: String,
      trim: true,
      maxlength: [2000, "Doctor notes cannot exceed 2000 characters"],
    },

    // Diagnosis — added by doctor post-consultation
    diagnosis: {
      type: String,
      trim: true,
      maxlength: [500, "Diagnosis cannot exceed 500 characters"],
    },

    vitalSigns: VitalSignsSchema,

    /**
     * meetingLink — generated server-side (e.g., Daily.co, Jitsi, or Whereby API)
     * when the appointment is approved. Stored here so both parties can access
     * it from the appointment document without an extra lookup.
     */
    meetingLink: {
      type: String,
      trim: true,
    },

    // Follow-up tracking
    followUpRequired: { type: Boolean, default: false },
    followUpDate: { type: Date },

    // Cancellation metadata
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

    // Rescheduling — links to the new appointment if this one was rescheduled
    rescheduledTo: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
    },

    // Payment tracking (if consultation fee is collected via the platform)
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

// ─── Virtuals ─────────────────────────────────────────────────────────────────

// Computed field: is this appointment in the past?
AppointmentSchema.virtual("isPast").get(function () {
  const now = new Date();
  const apptDateTime = new Date(this.appointmentDate);
  if (this.timeSlot?.end) {
    const [hours, minutes] = this.timeSlot.end.split(":").map(Number);
    apptDateTime.setHours(hours, minutes, 0, 0);
  }
  return apptDateTime < now;
});

// ─── Pre-save Hook ────────────────────────────────────────────────────────────

AppointmentSchema.pre("save", function (next) {
  // Auto-set cancelledAt when status changes to "cancelled"
  if (this.isModified("status") && this.status === "cancelled" && !this.cancelledAt) {
    this.cancelledAt = new Date();
  }
  next();
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

/**
 * INDEX 1 — DOUBLE-BOOKING PREVENTION (Most Critical Index)
 *
 * Compound unique index on (doctor, appointmentDate, timeSlot.start).
 * This is the cornerstone of the scheduling engine.
 *
 * Effect: MongoDB REJECTS any insert/update that would create a second
 * appointment for the same doctor on the same date at the same start time.
 * This is enforced at the storage engine level, surviving race conditions.
 *
 * Why not include `status`? Because a "cancelled" appointment should still
 * block re-use of its slot (doctor may want the gap). The app layer can
 * relax this by checking status before rejecting, but the DB-level guarantee
 * is on the slot itself. Adjust to include status if rebooking cancelled
 * slots is a business requirement.
 */
AppointmentSchema.index(
  { doctor: 1, appointmentDate: 1, "timeSlot.start": 1 },
  {
    unique: true,
    name: "idx_no_double_booking",
    // Only enforce uniqueness for non-cancelled appointments
    // partialFilterExpression: { status: { $nin: ["cancelled", "rescheduled"] } }
    // ^ Uncomment if you want cancelled slots to be rebook-able
  }
);

/**
 * INDEX 2 — Patient appointment history
 * "Show me all my appointments, most recent first"
 * Supports pagination on the patient dashboard.
 */
AppointmentSchema.index(
  { patient: 1, appointmentDate: -1 },
  { name: "idx_patient_appointments" }
);

/**
 * INDEX 3 — Doctor daily schedule
 * "Show doctor's appointments for today, ordered by time slot"
 * Used heavily on the doctor's dashboard view.
 */
AppointmentSchema.index(
  { doctor: 1, appointmentDate: 1, status: 1 },
  { name: "idx_doctor_schedule" }
);

/**
 * INDEX 4 — Status-based filtering (admin dashboard)
 * "Show all pending approval requests" or "Show all active telemedicine sessions"
 */
AppointmentSchema.index(
  { status: 1, appointmentDate: 1 },
  { name: "idx_status_date" }
);

export const Appointment = model("Appointment", AppointmentSchema);
