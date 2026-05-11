import { User, Patient, Doctor } from "../models/index.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";

/**
 * Register a new user (polymorphic creation based on role)
 */
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, ...otherData } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: "Missing required core fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    let newUser;
    const baseData = { firstName, lastName, email, password, role };

    // Create the specific document based on role using Mongoose Discriminators
    if (role === "patient") {
      if (!otherData.dateOfBirth || !otherData.gender) {
        return res.status(400).json({ success: false, message: "Patients require dateOfBirth and gender" });
      }
      newUser = new Patient({ ...baseData, ...otherData });
    } else if (role === "doctor") {
      if (!otherData.specialty || otherData.experienceYears === undefined || !otherData.consultationFee) {
        return res.status(400).json({ success: false, message: "Doctors require specialty, experienceYears, and consultationFee" });
      }
      newUser = new Doctor({ ...baseData, ...otherData });
    } else if (role === "admin") {
      // Admins are just base users for now
      newUser = new User({ ...baseData, ...otherData });
    } else {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    await newUser.save();

    // Generate JWT cookie
    generateTokenAndSetCookie(newUser._id, res);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: newUser.toSafeObject(),
    });
  } catch (error) {
    console.error("Error in register controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Login user
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please provide email and password" });
    }

    // Must explicitly select the password field since it is select: false in the schema
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated" });
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false }); // Don't trigger full validation just for lastLogin

    generateTokenAndSetCookie(user._id, res);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: user.toSafeObject(),
    });
  } catch (error) {
    console.error("Error in login controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Logout user (clear cookie)
 */
export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Get current logged in user (used for initial app load)
 */
export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user.toSafeObject(), // req.user is attached by the protectRoute middleware
    });
  } catch (error) {
    console.error("Error in getMe controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
