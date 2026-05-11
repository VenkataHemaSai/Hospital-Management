import { Prescription } from "../models/index.js";

/**
 * POST /api/prescriptions
 * Protected (doctor): Create a new prescription.
 */
export const createPrescription = async (req, res) => {
  try {
    const { patient, appointment, medications, clinicalNotes, diagnosis, allergiesConfirmed, validUntil } = req.body;

    if (!patient || !medications || medications.length === 0) {
      return res.status(400).json({ success: false, message: "Patient and at least one medication are required" });
    }

    const prescription = new Prescription({
      doctor: req.user._id,
      patient,
      appointment: appointment || null,
      medications,
      clinicalNotes,
      diagnosis,
      allergiesConfirmed,
      validUntil,
    });

    await prescription.save();
    await prescription.populate("doctor", "firstName lastName specialty");
    await prescription.populate("patient", "firstName lastName");

    res.status(201).json({ success: true, message: "Prescription created", data: prescription });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A prescription for this appointment already exists" });
    }
    console.error("Error in createPrescription: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/prescriptions
 * Protected: Fetch prescriptions for the logged-in user.
 * - Patients see their own.
 * - Doctors see prescriptions they wrote.
 * - Admins see all.
 */
export const getPrescriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = {};
    if (req.user.role === "patient") query.patient = req.user._id;
    else if (req.user.role === "doctor") query.doctor = req.user._id;
    if (status) query.status = status;

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate("doctor", "firstName lastName specialty")
        .populate("patient", "firstName lastName")
        .populate("appointment", "appointmentDate timeSlot")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ issuedAt: -1 }),
      Prescription.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: prescriptions,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error("Error in getPrescriptions: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/prescriptions/:id
 * Protected: Get a single prescription.
 */
export const getPrescriptionById = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate("doctor", "firstName lastName specialty licenseNumber")
      .populate("patient", "firstName lastName bloodGroup allergies")
      .populate("appointment", "appointmentDate timeSlot diagnosis");

    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    const isOwner =
      prescription.patient._id.toString() === req.user._id.toString() ||
      prescription.doctor._id.toString() === req.user._id.toString();

    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: prescription });
  } catch (error) {
    console.error("Error in getPrescriptionById: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/prescriptions/:id/status
 * Protected (doctor, admin): Update prescription status.
 */
export const updatePrescriptionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["active", "dispensed", "expired", "cancelled"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    if (prescription.doctor.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the prescribing doctor or an admin can update this" });
    }

    prescription.status = status;
    await prescription.save();

    res.status(200).json({ success: true, message: "Prescription status updated", data: prescription });
  } catch (error) {
    console.error("Error in updatePrescriptionStatus: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
