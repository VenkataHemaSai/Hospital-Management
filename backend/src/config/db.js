/**
 * @file db.js
 * @description MongoDB connection with production-grade configuration.
 *
 * Key settings explained:
 * ─────────────────────────────────────────────────────────────────────────────
 * maxPoolSize: 10
 *   Connection pool size. MongoDB driver reuses connections from this pool.
 *   Rule of thumb: (number of CPU cores) * 2 + 1, capped at 10–20 for most apps.
 *   Prevents overwhelming MongoDB with new connections on every request.
 *
 * serverSelectionTimeoutMS: 5000
 *   How long the driver waits to find an available MongoDB server.
 *   Fail fast rather than hanging indefinitely on a misconfigured connection string.
 *
 * socketTimeoutMS: 45000
 *   How long to wait for a response from MongoDB before timing out.
 *   45s is generous enough for heavy aggregation queries.
 *
 * family: 4
 *   Force IPv4. Avoids DNS resolution issues in some containerized environments
 *   where IPv6 causes unexpected connection failures.
 */

import mongoose from "mongoose";

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) {
    console.log("MongoDB: Reusing existing connection.");
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    isConnected = true;
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

    // Graceful shutdown handlers
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      console.log("MongoDB: Connection closed on app termination.");
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Event listeners for production monitoring
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected. Attempting to reconnect...");
  isConnected = false;
});

mongoose.connection.on("reconnected", () => {
  console.log("✅ MongoDB reconnected.");
  isConnected = true;
});
