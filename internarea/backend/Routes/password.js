const express = require("express");
const router = express.Router();
const PasswordReset = require("../Model/PasswordReset");
const { generateOTP, verifyOTP } = require("../Utils/otpService");
const { generatePassword } = require("../Utils/passwordGenerator");
const { sendOtpEmail } = require("../Utils/emailService");

function getIdentifier(userId, email, phone) {
  return [userId, email, phone].filter(Boolean).join("|");
}

// Request password reset
router.post("/request", async (req, res) => {
  try {
    const { userId, email, phone } = req.body;
    const identifier = getIdentifier(userId, email, phone);

    if (!identifier) {
      return res.status(400).json({ success: false, error: "Email or phone number is required" });
    }

    const latestRequest = await PasswordReset.findOne({ identifier }).sort({ lastRequestAt: -1 });
    if (latestRequest && Date.now() - new Date(latestRequest.lastRequestAt).getTime() < 24 * 60 * 60 * 1000) {
      return res.status(429).json({ success: false, error: "You can use this option only once per day." });
    }

    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const resetToken = require("crypto").randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const passwordReset = new PasswordReset({
      userId,
      identifier,
      email,
      phone,
      otp,
      otpVerified: false,
      resetToken,
      otpExpires: otpExpiry,
      resetTokenExpires: resetTokenExpiry,
      lastRequestAt: new Date(),
    });

    await passwordReset.save();

    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required to deliver the OTP" });
    }

    await sendOtpEmail({
      to: email,
      title: "Password reset",
      otp,
      message: "Use this OTP to continue with your password reset request.",
    });

    res.json({
      success: true,
      message: "OTP sent to your registered email/phone",
      resetToken,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP
router.post("/verifyOTP", async (req, res) => {
  try {
    const { resetToken, providedOTP } = req.body;

    const passwordReset = await PasswordReset.findOne({ resetToken });
    if (!passwordReset) {
      return res.status(400).json({ success: false, error: "Invalid reset token" });
    }

    const verification = verifyOTP(providedOTP, passwordReset.otp, passwordReset.otpExpires);
    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.message });
    }

    passwordReset.otpVerified = true;
    await passwordReset.save();

    res.json({ success: true, message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Reset password with new password
router.post("/reset", async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    const passwordReset = await PasswordReset.findOne({ resetToken });
    if (!passwordReset) {
      return res.status(400).json({ success: false, error: "Invalid reset token" });
    }

    if (new Date() > passwordReset.resetTokenExpires) {
      return res.status(400).json({ success: false, error: "Reset token expired" });
    }

    if (!passwordReset.otpVerified) {
      return res.status(400).json({ success: false, error: "Please verify OTP before resetting your password" });
    }

    // TODO: Update user password in User model
    // const user = await User.findById(passwordReset.userId);
    // user.password = newPassword; // Hash password before saving
    // await user.save();

    await PasswordReset.deleteOne({ resetToken });

    res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Generate random password
router.post("/generate-password", (req, res) => {
  try {
    const password = generatePassword(12);
    res.json({ success: true, password });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
