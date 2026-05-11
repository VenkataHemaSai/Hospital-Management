/**
 * @file index.js
 * @description Central export for all Mongoose models.
 * Import from here throughout the application:
 *   import { Patient, Doctor, Appointment, Prescription, MedicalRecord, Conversation, Message } from "../models/index.js";
 */

export { User, Patient, Doctor } from "./User.model.js";
export { Appointment } from "./Appointment.model.js";
export { MedicalRecord } from "./MedicalRecord.model.js";
export { Prescription } from "./Prescription.model.js";
export { Conversation, Message } from "./Chat.model.js";
