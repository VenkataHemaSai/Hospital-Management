import jwt from "jsonwebtoken";

/**
 * Generates a JWT and sets it in an HTTP-only cookie.
 * @param {string} userId - The user's database ID
 * @param {object} res - Express response object
 */
export const generateTokenAndSetCookie = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in MS
    httpOnly: true, // Prevents XSS attacks
    sameSite: "strict", // Prevents CSRF attacks
    secure: process.env.NODE_ENV !== "development", // HTTPS in production
  });

  return token;
};
