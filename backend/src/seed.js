/**
 * Database Seed Script
 * Creates the initial Admin and first Senior Doctor.
 * Run ONCE during initial setup: npm run seed
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
    console.log("⚠️  Admin already exists, skipping...");
  } else {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("Admin@123", salt);

    // Admin is not a discriminator, so insert directly into the users collection
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
  const sdocEmail = "senior.doctor@medicare.com";
  const existingSDoc = await User.findOne({ email: sdocEmail });

  if (existingSDoc) {
    console.log("⚠️  Senior Doctor already exists, skipping...");
  } else {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash("SeniorDoc@123", salt);

    await Doctor.create({
      firstName: "Rajesh",
      lastName: "Kumar",
      email: sdocEmail,
      password: hashedPassword,
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
    console.log("✅ Senior Doctor created:");
    console.log("   Email: senior.doctor@medicare.com");
    console.log("   Password: SeniorDoc@123");
  }

  console.log("\n🎉 Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
};

seedUsers().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
