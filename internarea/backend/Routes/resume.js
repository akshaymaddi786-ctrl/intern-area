const express = require("express");
const router = express.Router();
const Resume = require("../Model/Resume");
const Subscription = require("../Model/Subscription");
const { generateOTP, verifyOTP } = require("../Utils/otpService");
const { checkPaymentWindow } = require("../Utils/timeRestriction");
const { sendOtpEmail, sendInvoiceEmail } = require("../Utils/emailService");
const { createOrder, verifyWebhookSignature, hasRazorpayConfig } = require("../Utils/razorpayService");
const { buildResumeHtml } = require("../Utils/resumeGenerator");

async function getActiveSubscription(userId) {
  return Subscription.findOne({
    userId,
    paymentStatus: "completed",
    expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: -1 });
}

// Create resume (requires premium, OTP, and payment)
router.post("/create", async (req, res) => {
  try {
    const { userId, resumeData } = req.body;

    const subscription = await getActiveSubscription(userId);
    if (!subscription || subscription.planType === "free") {
      return res.status(403).json({
        success: false,
        error: "Resume creation is available only on a paid subscription plan.",
      });
    }

    const resume = new Resume({
      userId,
      name: resumeData.name,
      email: resumeData.email,
      phone: resumeData.phone,
      address: resumeData.address,
      city: resumeData.city,
      state: resumeData.state,
      pincode: resumeData.pincode,
      qualifications: resumeData.qualifications,
      experience: resumeData.experience,
      skills: resumeData.skills,
      photo: resumeData.photo,
      resumeSummary: resumeData.resumeSummary,
      paymentStatus: "pending",
    });

    await resume.save();

    res.json({
      success: true,
      message: "Resume created. Proceed to payment.",
      resumeId: resume._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send OTP before payment
router.post("/sendOTP", async (req, res) => {
  try {
    const { resumeId, email } = req.body;
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(400).json({ success: false, error: "Resume not found" });
    }

    resume.paymentOTP = otp;
    resume.paymentOTPExpires = otpExpiry;
    await resume.save();

    await sendOtpEmail({
      to: email,
      title: "Resume purchase",
      otp,
      message: "Use this OTP to verify the resume purchase before Razorpay checkout.",
    });

    res.json({
      success: true,
      message: "OTP sent to your email",
      resumeId,
      otpExpiry,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP and process payment
router.post("/verifyOTPAndPay", async (req, res) => {
  try {
    const { resumeId, otp, providedOTP, email } = req.body;

    // Check if within payment window (10-11 AM IST)
    if (!checkPaymentWindow()) {
      const hoursUntilPaymentWindow = 10; // Calculate actual hours
      return res.status(400).json({
        success: false,
        error: `Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try after ${hoursUntilPaymentWindow} hours.`,
      });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(400).json({ success: false, error: "Resume not found" });
    }

    const verification = verifyOTP(providedOTP || otp, resume.paymentOTP, resume.paymentOTPExpires);
    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.message });
    }

    const order = hasRazorpayConfig()
      ? await createOrder({
          amountInr: 50,
          receipt: `resume_${resumeId}_${Date.now()}`,
          notes: { resumeId, flow: "resume", userId: resume.userId, email: email || resume.email },
        })
      : null;

    res.json({
      success: true,
      message: "OTP verified. Proceed to Razorpay payment.",
      paymentAmount: 50,
      currency: "INR",
      orderId: order?.id || null,
      keyId: process.env.RAZORPAY_KEY_ID || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/create-order", async (req, res) => {
  try {
    const { resumeId, email } = req.body;

    if (!checkPaymentWindow()) {
      return res.status(400).json({ success: false, error: "Payments are only allowed between 10:00 AM and 11:00 AM IST." });
    }

    if (!hasRazorpayConfig()) {
      return res.status(400).json({ success: false, error: "Razorpay is not configured" });
    }

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(400).json({ success: false, error: "Resume not found" });
    }

    const order = await createOrder({
      amountInr: 50,
      receipt: `resume_${resumeId}_${Date.now()}`,
      notes: { resumeId, flow: "resume", userId: resume.userId, email: email || resume.email },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      resumeId,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const rawBody = req.rawBody || JSON.stringify(req.body);

    if (!verifyWebhookSignature(rawBody, signature)) {
      return res.status(400).json({ success: false, error: "Invalid webhook signature" });
    }

    const event = JSON.parse(rawBody);
    if (event.event !== "payment.captured") {
      return res.json({ success: true });
    }

    const payment = event.payload.payment.entity;
    const notes = payment.notes || {};
    if (notes.flow !== "resume") {
      return res.json({ success: true });
    }

    const resume = await Resume.findById(notes.resumeId);
    if (!resume) {
      return res.json({ success: true });
    }

    resume.paymentId = payment.id;
    resume.paymentStatus = "completed";
    resume.paymentVerifiedAt = new Date();
    resume.attachedToProfile = true;
    resume.generatedResumeUrl = `/api/resume/preview/${notes.resumeId}`;
    resume.pdfUrl = resume.generatedResumeUrl;
    resume.generatedHtml = buildResumeHtml(resume);
    await resume.save();

    if (notes.email) {
      await sendInvoiceEmail({
        to: notes.email,
        planName: "Resume Purchase",
        invoiceNumber: `INV-${Date.now()}`,
        amount: 50,
        invoiceUrl: resume.generatedResumeUrl,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle Razorpay payment callback
router.post("/paymentCallback", async (req, res) => {
  try {
    const { resumeId, paymentId, status, email } = req.body;

    const resume = await Resume.findById(resumeId);
    if (!resume) {
      return res.status(400).json({ success: false, error: "Resume not found" });
    }

    if (status === "success") {
      resume.paymentId = paymentId;
      resume.paymentStatus = "completed";
      resume.paymentVerifiedAt = new Date();
      resume.attachedToProfile = true;
      resume.generatedResumeUrl = `/api/resume/preview/${resumeId}`;
      resume.pdfUrl = resume.generatedResumeUrl;
      resume.generatedHtml = buildResumeHtml(resume);
      await resume.save();

      if (email || resume.email) {
        await sendInvoiceEmail({
          to: email || resume.email,
          planName: "Resume Purchase",
          invoiceNumber: `INV-${Date.now()}`,
          amount: 50,
          invoiceUrl: resume.generatedResumeUrl,
        });
      }

      res.json({
        success: true,
        message: "Payment successful. Resume attached to profile.",
        resumeUrl: resume.generatedResumeUrl,
      });
    } else {
      resume.paymentStatus = "failed";
      await resume.save();
      res.status(400).json({ success: false, error: "Payment failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's resumes
router.get("/user/:userId", async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.params.userId });
    res.json({ success: true, resumes });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Preview generated resume HTML
router.get("/preview/:resumeId", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.resumeId);
    if (!resume) {
      return res.status(404).send("Resume not found");
    }

    const html = resume.generatedHtml || buildResumeHtml(resume);
    res.setHeader("Content-Type", "text/html");
    res.send(html);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
