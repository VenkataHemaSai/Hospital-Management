/**
 * @file bookingEngine.service.js
 * @description Demonstrates the booking engine logic using the Appointment schema.
 * Shows how the double-booking index and doctor availability work in practice.
 */

import { Appointment, Doctor } from "../models/index.js";
import mongoose from "mongoose";

/**
 * Get available time slots for a doctor on a specific date.
 * Combines their weekly availability template with already-booked slots.
 *
 * @param {string} doctorId
 * @param {Date} date
 * @returns {Promise<{ available: string[], booked: string[] }>}
 */
export const getAvailableSlots = async (doctorId, date) => {
  // 1. Fetch doctor's weekly availability template
  const doctor = await Doctor.findById(doctorId)
    .select("availability acceptingNewPatients")
    .lean();

  if (!doctor || !doctor.acceptingNewPatients) {
    throw new Error("Doctor is not available for new appointments.");
  }

  // 2. Get the day of the week for the requested date
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const dayName = dayNames[date.getDay()];

  const daySchedule = doctor.availability.find((d) => d.day === dayName);
  if (!daySchedule || !daySchedule.isAvailable || daySchedule.slots.length === 0) {
    return { available: [], booked: [] };
  }

  // 3. Query booked appointments for this doctor on this date
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await Appointment.find({
    doctor: doctorId,
    appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    status: { $nin: ["cancelled", "rescheduled", "no_show"] },
  })
    .select("timeSlot.start")
    .lean();

  const bookedStartTimes = new Set(bookedAppointments.map((a) => a.timeSlot.start));

  // 4. Return the split: available vs. booked
  const available = daySchedule.slots
    .map((slot) => slot.start)
    .filter((start) => !bookedStartTimes.has(start));

  return {
    available,
    booked: [...bookedStartTimes],
    daySchedule: daySchedule.slots, // Full slot info including end times
  };
};

/**
 * Book an appointment — handles race conditions via the unique DB index.
 *
 * @param {Object} bookingData
 * @returns {Promise<Appointment>}
 */
export const bookAppointment = async ({
  patientId,
  doctorId,
  date,
  timeSlotStart,
  timeSlotEnd,
  symptoms,
  patientNotes,
  appointmentType = "telemedicine",
}) => {
  // Normalize the date to midnight UTC for consistent storage
  const appointmentDate = new Date(date);
  appointmentDate.setHours(0, 0, 0, 0);

  try {
    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      appointmentDate,
      timeSlot: { start: timeSlotStart, end: timeSlotEnd },
      symptoms,
      patientNotes,
      appointmentType,
      status: "pending",
    });

    return appointment;
  } catch (error) {
    // MongoDB duplicate key error (E11000) = double-booking attempt
    if (error.code === 11000 && error.keyPattern?.["timeSlot.start"]) {
      throw new Error(
        `The ${timeSlotStart} slot on ${appointmentDate.toDateString()} is already booked. Please choose another time.`
      );
    }
    throw error;
  }
};

/**
 * Example query: Doctor's schedule for today — optimized query.
 * Uses the compound index { doctor, appointmentDate, status }.
 *
 * @param {string} doctorId
 * @returns {Promise<Appointment[]>}
 */
export const getDoctorTodaySchedule = async (doctorId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  return Appointment.find({
    doctor: doctorId,
    appointmentDate: { $gte: today, $lte: endOfDay },
    status: { $in: ["approved", "ongoing", "pending"] },
  })
    .sort({ "timeSlot.start": 1 }) // Sort chronologically by slot
    .populate("patient", "firstName lastName profilePicture phone") // Only needed fields
    .lean(); // .lean() returns plain JS objects — faster for read-only operations
};

/**
 * Example query: Cursor-based pagination for patient appointment history.
 * More efficient than skip/limit for large datasets.
 *
 * @param {string} patientId
 * @param {string|null} lastAppointmentId - ID of the last seen appointment (cursor)
 * @param {number} limit
 * @returns {Promise<Appointment[]>}
 */
export const getPatientAppointmentHistory = async (patientId, lastAppointmentId = null, limit = 10) => {
  const query = {
    patient: patientId,
    status: { $in: ["completed", "cancelled", "no_show"] },
  };

  // If a cursor is provided, only fetch appointments older than the cursor
  if (lastAppointmentId) {
    query._id = { $lt: new mongoose.Types.ObjectId(lastAppointmentId) };
  }

  return Appointment.find(query)
    .sort({ appointmentDate: -1, _id: -1 })
    .limit(limit)
    .populate("doctor", "firstName lastName specialty profilePicture")
    .lean();
};
