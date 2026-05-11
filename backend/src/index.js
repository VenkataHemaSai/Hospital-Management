import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { connectDB } from "./config/db.js";

import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import appointmentRouter from "./routes/appointment.routes.js";
import prescriptionRouter from "./routes/prescription.routes.js";
import medicalRecordRouter from "./routes/medicalRecord.routes.js";
import chatRouter from "./routes/chat.routes.js";
import { initSocket } from "./config/socket.js";

const app = express();
const httpServer = createServer(app);

// --- Middleware ---
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- Health Check ---
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/prescriptions", prescriptionRouter);
app.use("/api/records", medicalRecordRouter);
app.use("/api/chat", chatRouter);

// --- 404 Handler ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  initSocket(httpServer);
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

start();

export { httpServer };
