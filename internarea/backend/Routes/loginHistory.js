const express = require("express");
const router = express.Router();
const LoginHistory = require("../Model/LoginHistory");
const { getDeviceInfo } = require("../Utils/deviceDetection");
const { generateOTP, verifyOTP } = require("../Utils/otpService");
const { checkMobileLoginWindow } = require("../Utils/timeRestriction");
const { sendOtpEmail } = require("../Utils/emailService");

// Track login
router.post("/track", async (req, res) => {
  try {
    const { userId, userAgent, ipAddress } = req.body;

    const deviceInfo = getDeviceInfo(userAgent || "");

    // Determine OTP requirement and mobile restrictions first
    let requiresOTP = false;
    let isBlocked = false;
    let blockReason = "";

    if (deviceInfo.browser === "Chrome") requiresOTP = true;

    if (deviceInfo.deviceType === "mobile") {
      if (!checkMobileLoginWindow()) {
        isBlocked = true;
        blockReason = "Mobile logins are only allowed between 10:00 AM and 1:00 PM IST.";
      }
    }

    const loginHistory = new LoginHistory({
      userId,
      browser: deviceInfo.browser,
      operatingSystem: deviceInfo.os,
      deviceType: deviceInfo.deviceType,
      ipAddress,
      // If OTP is required initially mark as pending so the UI knows to verify
      loginAttempt: requiresOTP ? "pending" : "success",
      otpRequired: requiresOTP,
      otpVerified: false,
    });

    if (isBlocked) {
      loginHistory.loginAttempt = "blocked";
      loginHistory.otpRequired = requiresOTP;
      await loginHistory.save();
      return res.status(403).json({ success: false, error: blockReason });
    }

    await loginHistory.save();

    res.json({
      success: true,
      loginId: loginHistory._id,
      requiresOTP,
      loginHistoryId: loginHistory._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send OTP for login verification (Chrome)
router.post("/sendLoginOTP", async (req, res) => {
  try {
    const { loginId, email } = req.body;
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const loginHistory = await LoginHistory.findById(loginId);
    if (!loginHistory) {
      return res.status(400).json({ success: false, error: "Invalid login session" });
    }

    loginHistory.otp = otp;
    loginHistory.otpExpires = otpExpiry;
    loginHistory.otpRequired = true;
    await loginHistory.save();

    await sendOtpEmail({
      to: email,
      title: "Login verification",
      otp,
      message: "Use this OTP to complete your Chrome browser login verification.",
    });

    res.json({
      success: true,
      message: "OTP sent to your registered email",
      loginId,
      otpExpiry,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify login OTP
router.post("/verifyLoginOTP", async (req, res) => {
  try {
    const { loginId, otp, providedOTP } = req.body;

    const loginHistory = await LoginHistory.findById(loginId);
    if (!loginHistory) {
      return res.status(400).json({ success: false, error: "Invalid login session" });
    }

    const verification = verifyOTP(providedOTP || otp, loginHistory.otp, loginHistory.otpExpires);
    if (!verification.valid) {
      loginHistory.loginAttempt = "failed";
      await loginHistory.save();
      return res.status(400).json({ success: false, error: verification.message });
    }

    loginHistory.otpVerified = true;
    // mark overall login as successful after OTP verification
    loginHistory.loginAttempt = "success";
    loginHistory.otp = null;
    loginHistory.otpExpires = null;
    await loginHistory.save();

    res.json({ success: true, message: "Login verified successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get login history for user
router.get("/history/:userId", async (req, res) => {
  try {
    const loginHistory = await LoginHistory.find({ userId: req.params.userId })
      .sort({ loginTime: -1 })
      .limit(50);

    res.json({ success: true, loginHistory });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Track logout
router.post("/logout", async (req, res) => {
  try {
    const { loginId } = req.body;

    const loginHistory = await LoginHistory.findByIdAndUpdate(loginId, {
      logoutTime: new Date(),
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Validate active session
router.post("/validate-session", async (req, res) => {
  try {
    const { userId, userAgent } = req.body;
    const deviceInfo = getDeviceInfo(userAgent || "");

    if (deviceInfo.deviceType === "mobile") {
      if (!checkMobileLoginWindow()) {
        return res.status(403).json({
          success: false,
          error: "Mobile logins are only allowed between 10:00 AM and 1:00 PM IST.",
        });
      }
    }

    const latestLogin = await LoginHistory.findOne({ userId }).sort({ loginTime: -1 });
    if (latestLogin && latestLogin.loginAttempt === "pending" && latestLogin.otpRequired && !latestLogin.otpVerified) {
      return res.json({
        success: true,
        requiresOTP: true,
        loginId: latestLogin._id,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
