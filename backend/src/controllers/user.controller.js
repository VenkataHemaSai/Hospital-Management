import { User, Doctor, Patient } from "../models/index.js";

/**
 * GET /api/users/doctors
 * Public: Fetch all verified, active doctors.
 * Supports filtering by specialty and pagination.
 */
export const getDoctors = async (req, res) => {
  try {
    const { specialty, page = 1, limit = 10 } = req.query;
    const query = { role: "doctor", isActive: true, isVerified: true };

    if (specialty) {
      query.specialty = { $regex: specialty, $options: "i" };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [doctors, total] = await Promise.all([
      Doctor.find(query)
        .select("firstName lastName specialty consultationFee experienceYears rating profilePicture availability hospital bio acceptingNewPatients isSeniorDoctor createdAt")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ "rating.count": -1 }),
      Doctor.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: doctors,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error in getDoctors: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/users/doctors/:id
 * Public: Get a single doctor's full profile.
 */
export const getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ _id: req.params.id, role: "doctor", isActive: true }).select("-password");

    if (!doctor) {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    res.status(200).json({ success: true, data: doctor });
  } catch (error) {
    console.error("Error in getDoctorById: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/users/profile
 * Protected: Get the current user's own full profile.
 */
export const getMyProfile = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    console.error("Error in getMyProfile: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/users/profile
 * Protected: Update the current user's own profile.
 * Password changes are NOT handled here.
 */
export const updateMyProfile = async (req, res) => {
  try {
    const forbiddenFields = ["password", "role", "email", "isActive", "isEmailVerified"];
    forbiddenFields.forEach((field) => delete req.body[field]);

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error("Error in updateMyProfile: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/users/patients
 * Protected (doctor, admin): Get all patients.
 */
export const getPatients = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [patients, total] = await Promise.all([
      Patient.find({ isActive: true })
        .select("firstName lastName email phone profilePicture bloodGroup gender dateOfBirth")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ createdAt: -1 }),
      Patient.countDocuments({ isActive: true }),
    ]);

    res.status(200).json({
      success: true,
      data: patients,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error("Error in getPatients: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/users/patients/:id
 * Protected (doctor, admin): Get a single patient's profile.
 */
export const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findOne({ _id: req.params.id, role: "patient", isActive: true }).select("-password");

    if (!patient) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    res.status(200).json({ success: true, data: patient });
  } catch (error) {
    console.error("Error in getPatientById: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * PUT /api/users/doctors/:id/promote
 * Admin only: Toggle a doctor's Senior Doctor status.
 */
export const promoteDoctorToSenior = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    const { reason } = req.body;

    // Demotion requires a reason
    if (doctor.isSeniorDoctor && !reason?.trim()) {
      return res.status(400).json({ success: false, message: "A reason is required to demote a Senior Doctor" });
    }

    doctor.isSeniorDoctor = !doctor.isSeniorDoctor;
    await doctor.save({ validateBeforeSave: false });

    res.status(200).json({
      success: true,
      message: doctor.isSeniorDoctor
        ? `Dr. ${doctor.firstName} ${doctor.lastName} is now a Senior Doctor`
        : `Dr. ${doctor.firstName} ${doctor.lastName} has been demoted to Doctor`,
      data: { isSeniorDoctor: doctor.isSeniorDoctor },
    });
  } catch (error) {
    console.error("Error in promoteDoctorToSenior: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/users/doctors/:id
 * Admin only: Deactivate (soft-delete) a doctor with a mandatory reason.
 */
export const deactivateDoctor = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) {
      return res.status(400).json({ success: false, message: "A reason is required to remove a doctor" });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor || doctor.role !== "doctor") {
      return res.status(404).json({ success: false, message: "Doctor not found" });
    }

    if (!doctor.isActive) {
      return res.status(400).json({ success: false, message: "Doctor is already deactivated" });
    }

    doctor.isActive = false;
    // Store the deactivation reason in a note (add field if needed or log it)
    await doctor.save({ validateBeforeSave: false });

    console.log(`Admin deactivated Dr. ${doctor.firstName} ${doctor.lastName}. Reason: ${reason}`);

    res.status(200).json({
      success: true,
      message: `Dr. ${doctor.firstName} ${doctor.lastName} has been removed from the platform`,
    });
  } catch (error) {
    console.error("Error in deactivateDoctor: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

