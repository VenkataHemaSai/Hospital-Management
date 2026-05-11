import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

/**
 * Protects routes by verifying the JWT cookie.
 * Attaches the user object to the request.
 */
export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ success: false, message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ success: false, message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Your account has been deactivated" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

/**
 * Role-Based Access Control (RBAC).
 * Expects an array of allowed roles. Must be used AFTER protectRoute.
 * @param {...string} roles - e.g., authorizeRoles("admin", "doctor")
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user?.role || "unknown"}' is not allowed to access this resource`,
      });
    }
    next();
  };
};

/**
 * Authorize Senior Doctors and Admins only.
 * Senior doctors are regular doctors with the isSeniorDoctor flag.
 * Must be used AFTER protectRoute.
 */
export const authorizeSeniorOrAdmin = (req, res, next) => {
  const isAdmin = req.user?.role === "admin";
  const isSDoc = req.user?.role === "doctor" && req.user?.isSeniorDoctor === true;

  if (!isAdmin && !isSDoc) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: Only senior doctors and admins can access this resource",
    });
  }
  next();
};
