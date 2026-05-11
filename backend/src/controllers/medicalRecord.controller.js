import { MedicalRecord } from "../models/index.js";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary.js";

/**
 * POST /api/records
 * Protected (patient, doctor): Upload a new medical record.
 * Requires multipart/form-data with a file field named "file".
 */
export const uploadRecord = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided" });
    }

    const { title, fileType, description, recordDate, patientId } = req.body;

    if (!title || !fileType) {
      return res.status(400).json({ success: false, message: "Title and fileType are required" });
    }

    // Doctors upload on behalf of a patient; patients upload for themselves
    const targetPatient = req.user.role === "doctor" ? patientId : req.user._id;
    if (!targetPatient) {
      return res.status(400).json({ success: false, message: "patientId is required when a doctor uploads" });
    }

    const folder = `hospital-platform/medical-records/${targetPatient}`;
    const uploadResult = await uploadToCloudinary(req.file.buffer, folder);

    const record = new MedicalRecord({
      patient: targetPatient,
      uploadedBy: req.user._id,
      appointment: req.body.appointment || null,
      title,
      fileType,
      description: description || "",
      recordDate: recordDate ? new Date(recordDate) : undefined,
      ...uploadResult,
    });

    await record.save();

    res.status(201).json({ success: true, message: "Medical record uploaded", data: record });
  } catch (error) {
    console.error("Error in uploadRecord: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/records
 * Protected: Fetch records for the logged-in patient or a specific patient (doctor/admin).
 */
export const getRecords = async (req, res) => {
  try {
    const { patientId, fileType, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    let query = { isDeleted: false };

    if (req.user.role === "patient") {
      query.patient = req.user._id;
    } else if (req.user.role === "doctor") {
      // Doctor can view records for a specific patient they are treating
      if (!patientId) return res.status(400).json({ success: false, message: "patientId query is required for doctors" });
      query.patient = patientId;
      query.$or = [{ isSharedWithDoctors: true }, { sharedWith: req.user._id }];
    } else {
      // admin
      if (patientId) query.patient = patientId;
    }

    if (fileType) query.fileType = fileType;

    const [records, total] = await Promise.all([
      MedicalRecord.find(query)
        .populate("uploadedBy", "firstName lastName role")
        .populate("appointment", "appointmentDate")
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ recordDate: -1, createdAt: -1 }),
      MedicalRecord.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: records,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (error) {
    console.error("Error in getRecords: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * GET /api/records/:id
 * Protected: Get a single record.
 */
export const getRecordById = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate("uploadedBy", "firstName lastName role")
      .populate("patient", "firstName lastName");

    if (!record || record.isDeleted) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const isPatient = record.patient._id.toString() === req.user._id.toString();
    const isDoctorWithAccess =
      req.user.role === "doctor" &&
      (record.isSharedWithDoctors || record.sharedWith.map(String).includes(req.user._id.toString()));

    if (!isPatient && !isDoctorWithAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Error in getRecordById: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * DELETE /api/records/:id
 * Protected (patient, admin): Soft-delete a record. Does NOT immediately purge from Cloudinary.
 */
export const deleteRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);

    if (!record || record.isDeleted) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const isOwner = record.patient.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the patient or admin can delete this record" });
    }

    record.isDeleted = true;
    await record.save();

    // Permanent deletion from Cloudinary (fire and forget — purge after grace period)
    deleteFromCloudinary(record.publicId).catch((err) =>
      console.error("Cloudinary purge failed for publicId:", record.publicId, err.message)
    );

    res.status(200).json({ success: true, message: "Medical record deleted" });
  } catch (error) {
    console.error("Error in deleteRecord: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
