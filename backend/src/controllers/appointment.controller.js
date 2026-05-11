import { Appointment } from "../models/index.js";

/**
 * POST /api/appointments
 * Protected (patient): Book a new appointment.
 */
export const createAppointment = async (req, res) => {
  try {
    const { doctor, appointmentDate, timeSlot, appointmentType, symptoms, patientNotes } = req.body;

    if (!doctor || !appointmentDate || !timeSlot) {
      return res.status(400).json({ success: false, message: "Doctor, date, and timeSlot are required" });
    }

    const appointment = new Appointment({
      patient: req.user._id,
      doctor,
      appointmentDate,
      timeSlot,
      appointmentType,
      symptoms,
      patientNotes,
    });

    await appointment.save();
    await appointment.populate("doctor", "firstName lastName specialty profilePicture");
    await appointment.populate("patient", "firstName lastName profilePicture");

    res.status(201).json({ success: true, message: "Appointment booked successfully", data: appointment });
  } catch (error) {
    // Handle double-booking unique index violation
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "This time slot is already booked. Please choose another slot." });
    }
    console.error("Error in createAppointment: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/appointments
 * Protected: Get appointments for the logged-in user.
 * - Patients see their own appointments.
 * - Doctors see appointments assigned to them.
 * - Admins see all.
 */
export const getAppointments = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (req.user.role === "patient") query.patient = req.user._id;
    else if (req.user.role === "doctor") query.doctor = req.user._id;
    // admin: no filter — sees all

    if (status) query.status = status;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate("patient", "firstName lastName profilePicture phone")
        .populate("doctor", "firstName lastName specialty profilePicture")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ appointmentDate: -1 }),
      Appointment.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: appointments,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error("Error in getAppointments: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/appointments/:id
 * Protected: Get a single appointment by ID.
 */
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate("patient", "firstName lastName profilePicture phone bloodGroup allergies")
      .populate("doctor", "firstName lastName specialty profilePicture consultationFee")
      .populate("cancelledBy", "firstName lastName role");

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    // Only the involved patient, doctor, or admin can view this appointment
    const isOwner =
      appointment.patient._id.toString() === req.user._id.toString() ||
      appointment.doctor._id.toString() === req.user._id.toString();

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: appointment });
  } catch (error) {
    console.error("Error in getAppointmentById: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/appointments/:id/status
 * Protected: Update appointment status.
 * - Doctors can approve, start (ongoing), complete, mark no_show.
 * - Patients can cancel their own pending appointments.
 * - Admins can do anything.
 */
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, cancellationReason, doctorNotes, diagnosis, meetingLink } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "Appointment not found" });
    }

    const validTransitions = {
      patient: ["cancelled"],
      doctor: ["approved", "ongoing", "completed", "no_show", "cancelled"],
      admin: ["pending", "approved", "ongoing", "completed", "cancelled", "no_show", "rescheduled"],
    };

    if (!validTransitions[req.user.role]?.includes(status)) {
      return res.status(403).json({ success: false, message: `Your role cannot set status to '${status}'` });
    }

    appointment.status = status;
    if (status === "cancelled") {
      appointment.cancelledBy = req.user._id;
      appointment.cancellationReason = cancellationReason || "";
    }
    if (doctorNotes) appointment.doctorNotes = doctorNotes;
    if (diagnosis) appointment.diagnosis = diagnosis;
    if (meetingLink) appointment.meetingLink = meetingLink;

    await appointment.save();
    res.status(200).json({ success: true, message: "Appointment updated", data: appointment });
  } catch (error) {
    console.error("Error in updateAppointmentStatus: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/appointments/doctor/:doctorId/available-slots
 * Public: Get available time slots for a doctor on a given date.
 */
export const getAvailableSlots = async (req, res) => {
  try {
    const { date } = req.query;
    const { doctorId } = req.params;

    if (!date) {
      return res.status(400).json({ success: false, message: "Date query parameter is required" });
    }

    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctor: doctorId,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ["cancelled", "rescheduled"] },
    }).select("timeSlot");

    const bookedSlots = bookedAppointments.map((a) => a.timeSlot.start);

    res.status(200).json({ success: true, data: { bookedSlots } });
  } catch (error) {
    console.error("Error in getAvailableSlots: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
