const express = require("express");
const router = express.Router();
const Language = require("../Model/Language");
const { generateOTP, verifyOTP } = require("../Utils/otpService");
const { sendOtpEmail } = require("../Utils/emailService");

const SUPPORTED_LANGUAGES = ["en", "es", "hi", "pt", "zh", "fr"];

// Get current language preference
router.get("/:userId", async (req, res) => {
  try {
    let language = await Language.findOne({ userId: req.params.userId });
    if (!language) {
      language = new Language({ userId: req.params.userId, preferredLanguage: "en" });
      await language.save();
    }
    res.json({ success: true, language: language.preferredLanguage });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send OTP for French language switch
router.post("/sendOTP/french", async (req, res) => {
  try {
    const { userId, email } = req.body;
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    let language = await Language.findOne({ userId });
    if (!language) {
      language = new Language({ userId, preferredLanguage: "en" });
    }

    language.pendingLanguage = "fr";
    language.languageOTP = otp;
    language.languageOTPExpires = otpExpiry;
    await language.save();

    await sendOtpEmail({
      to: email,
      title: "French language change",
      otp,
      message: "Use this OTP to verify your French language preference.",
    });

    res.json({
      success: true,
      message: "OTP sent to your email",
      otpExpiry,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP and switch to French
router.post("/verifyOTP/french", async (req, res) => {
  try {
    const { userId, otp, providedOTP } = req.body;

    const language = await Language.findOne({ userId });
    if (!language || !language.languageOTP || !language.languageOTPExpires) {
      return res.status(400).json({ success: false, error: "No pending language verification found" });
    }

    const verification = verifyOTP(providedOTP || otp, language.languageOTP, language.languageOTPExpires);

    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.message });
    }

    language.preferredLanguage = "fr";
    language.frenchOTPVerified = true;
    language.pendingLanguage = null;
    language.languageOTP = null;
    language.languageOTPExpires = null;
    await language.save();

    res.json({ success: true, message: "Language switched to French successfully" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Change language (for non-French languages)
router.post("/change", async (req, res) => {
  try {
    const { userId, language } = req.body;

    if (!SUPPORTED_LANGUAGES.includes(language) || language === "fr") {
      return res.status(400).json({ success: false, error: "Invalid language" });
    }

    let lang = await Language.findOne({ userId });
    if (!lang) {
      lang = new Language({ userId, preferredLanguage: "en" });
    }

    lang.preferredLanguage = language;
    lang.frenchOTPVerified = false;
    lang.pendingLanguage = null;
    lang.languageOTP = null;
    lang.languageOTPExpires = null;
    await lang.save();

    res.json({ success: true, message: `Language changed to ${language}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
