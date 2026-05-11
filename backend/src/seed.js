/**
 * Database Seed Script
 * Creates the initial Admin and first Senior Doctor.
 * Run ONCE during initial setup: npm run seed
 *
 * HOW TO RE-SEED: If accounts already exist and you want to reset them,
 * manually delete them from MongoDB Atlas first, then run: npm run seed
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "./config/db.js";

// Must import discriminators so Mongoose registers them
import { User, Doctor } from "./models/index.js";

const seedUsers = async () => {
  await connectDB();

  // --- 1. Seed Admin ---
  const adminEmail = "admin@medicare.com";
  const existingAdmin = await User.findOne({ email: adminEmail });

  if (existingAdmin) {
    console.log("⏩  Admin already exists, skipping...");
  } else {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    // Admin is not a discriminator (no Patient/Doctor sub-schema),
    // so we insert raw to avoid discriminator mismatch.
    const db = mongoose.connection.db;
    await db.collection("users").insertOne({
      firstName: "System",
      lastName: "Admin",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
      isEmailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("✅ Admin created:");
    console.log("   Email: admin@medicare.com");
    console.log("   Password: Admin@123");
  }

  // --- 2. Seed First Senior Doctor ---
  // IMPORTANT: We use `new Doctor().save()` with the raw password string
  // so the pre-save hook hashes it ONCE. Do NOT pre-hash the password here.
  const sdocEmail = "senior.doctor@medicare.com";
  const existingSDoc = await User.findOne({ email: sdocEmail });

  if (existingSDoc) {
    console.log("⏩  Senior Doctor already exists, skipping...");
  } else {
    const sdoc = new Doctor({
      firstName: "Rajesh",
      lastName: "Kumar",
      email: sdocEmail,
      password: "SeniorDoc@123",   // plain text — pre-save hook hashes it
      role: "doctor",
      phone: "+91 9876500001",
      isActive: true,
      isEmailVerified: true,
      specialty: "General Medicine",
      experienceYears: 20,
      consultationFee: { amount: 800, currency: "INR" },
      licenseNumber: "MCI-2005-001234",
      hospital: "MediCare Central Hospital",
      bio: "Founding senior physician with 20 years of clinical experience.",
      isVerified: true,
      isSeniorDoctor: true,
    });

    await sdoc.save();

    console.log("✅ Senior Doctor created:");
    console.log("   Email: senior.doctor@medicare.com");
    console.log("   Password: SeniorDoc@123");
  }

  console.log("\n🌱 Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
};

seedUsers().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
