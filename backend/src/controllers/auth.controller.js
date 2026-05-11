import { User, Patient, Doctor } from "../models/index.js";
import { generateTokenAndSetCookie } from "../utils/generateToken.js";

/**
 * Register a new PATIENT (public self-registration).
 * Doctors register via approved application tokens.
 * Admins are seeded directly.
 */
export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, ...otherData } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email is already registered" });
    }

    if (!otherData.dateOfBirth || !otherData.gender) {
      return res.status(400).json({ success: false, message: "Date of birth and gender are required" });
    }

    const newUser = new Patient({ firstName, lastName, email, password, role: "patient", ...otherData });
    await newUser.save();

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
    await user.save({ validateBeforeSave: false });

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
 * Get current logged in user
 */
export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    console.error("Error in getMe controller: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
