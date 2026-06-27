const express = require("express");
const router = express.Router();
const Subscription = require("../Model/Subscription");
const Plan = require("../Model/Plan");
const { generateOTP, verifyOTP } = require("../Utils/otpService");
const { checkPaymentWindow } = require("../Utils/timeRestriction");
const { sendOtpEmail, sendInvoiceEmail } = require("../Utils/emailService");
const { createOrder, verifyWebhookSignature, hasRazorpayConfig } = require("../Utils/razorpayService");

// Initialize subscription plans
async function initializePlans() {
  const plans = await Plan.find();
  if (plans.length === 0) {
    await Plan.insertMany([
      {
        planName: "free",
        displayName: "Free",
        description: "Apply for 1 internship per month",
        priceInr: 0,
        internshipLimit: 1,
        features: ["1 internship per month"],
      },
      {
        planName: "bronze",
        displayName: "Bronze",
        description: "Apply for 3 internships per month",
        priceInr: 100,
        internshipLimit: 3,
        features: ["3 internships per month"],
      },
      {
        planName: "silver",
        displayName: "Silver",
        description: "Apply for 5 internships per month",
        priceInr: 300,
        internshipLimit: 5,
        features: ["5 internships per month"],
      },
      {
        planName: "gold",
        displayName: "Gold",
        description: "Unlimited internship applications",
        priceInr: 1000,
        internshipLimit: Number.MAX_SAFE_INTEGER,
        features: ["Unlimited internship applications"],
      },
    ]);
  }
}

// Get all subscription plans
router.get("/plans", async (req, res) => {
  try {
    await initializePlans();
    const plans = await Plan.find();
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user's current subscription
router.get("/current/:userId", async (req, res) => {
  try {
    let subscription = await Subscription.findOne({
      userId: req.params.userId,
      expiryDate: { $gt: new Date() },
    });

    if (!subscription) {
      subscription = new Subscription({
        userId: req.params.userId,
        planType: "free",
        monthlyLimit: 1,
      });
      await subscription.save();
    }

    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Send OTP before payment
router.post("/sendOTP", async (req, res) => {
  try {
    const { userId, email, planType } = req.body;
    const otp = generateOTP(6);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    const plan = await Plan.findOne({ planName: planType });
    if (!plan) {
      return res.status(400).json({ success: false, error: "Plan not found" });
    }

    let subscription = await Subscription.findOne({ userId, planType, paymentStatus: "pending" });
    if (!subscription) {
      subscription = new Subscription({
        userId,
        planType,
        monthlyLimit: plan.internshipLimit,
        price: plan.priceInr,
        paymentStatus: "pending",
      });
    }

    subscription.paymentOTP = otp;
    subscription.paymentOTPExpires = otpExpiry;
    subscription.monthlyLimit = plan.internshipLimit;
    subscription.price = plan.priceInr;
    await subscription.save();

    await sendOtpEmail({
      to: email,
      title: "Subscription payment",
      otp,
      message: `Use this OTP to verify your ${plan.displayName} plan payment.`,
    });

    res.json({
      success: true,
      message: "OTP sent to your email",
      userId,
      planType,
      otpExpiry,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Verify OTP and process subscription payment
router.post("/verifyOTPAndPay", async (req, res) => {
  try {
    const { userId, planType, otp, providedOTP, email } = req.body;

    // Check if within payment window (10-11 AM IST)
    if (!checkPaymentWindow()) {
      const hoursUntilPaymentWindow = 10; // Calculate actual hours
      return res.status(400).json({
        success: false,
        error: `Payments are only allowed between 10:00 AM and 11:00 AM IST. Please try after ${hoursUntilPaymentWindow} hours.`,
      });
    }

    const pendingSubscription = await Subscription.findOne({
      userId,
      planType,
      paymentStatus: "pending",
    });

    if (!pendingSubscription || !pendingSubscription.paymentOTP || !pendingSubscription.paymentOTPExpires) {
      return res.status(400).json({ success: false, error: "No pending subscription verification found" });
    }

    const verification = verifyOTP(providedOTP || otp, pendingSubscription.paymentOTP, pendingSubscription.paymentOTPExpires);
    if (!verification.valid) {
      return res.status(400).json({ success: false, error: verification.message });
    }

    const plan = await Plan.findOne({ planName: planType });
    if (!plan) {
      return res.status(400).json({ success: false, error: "Plan not found" });
    }

    const order = hasRazorpayConfig()
      ? await createOrder({
          amountInr: plan.priceInr,
          receipt: `sub_${userId}_${Date.now()}`,
          notes: { userId, planType, flow: "subscription", email },
        })
      : null;

    res.json({
      success: true,
      message: "OTP verified. Proceed to Razorpay payment.",
      paymentAmount: plan.priceInr,
      currency: "INR",
      planType,
      orderId: order?.id || null,
      keyId: process.env.RAZORPAY_KEY_ID || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post("/create-order", async (req, res) => {
  try {
    const { userId, planType, email } = req.body;
    if (!checkPaymentWindow()) {
      return res.status(400).json({ success: false, error: "Payments are only allowed between 10:00 AM and 11:00 AM IST." });
    }

    const plan = await Plan.findOne({ planName: planType });
    if (!plan) {
      return res.status(400).json({ success: false, error: "Plan not found" });
    }

    if (!hasRazorpayConfig()) {
      return res.status(400).json({ success: false, error: "Razorpay is not configured" });
    }

    const order = await createOrder({
      amountInr: plan.priceInr,
      receipt: `sub_${userId}_${Date.now()}`,
      notes: { userId, planType, flow: "subscription", email },
    });

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planType,
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
    if (notes.flow !== "subscription") {
      return res.json({ success: true });
    }

    const plan = await Plan.findOne({ planName: notes.planType });
    const invoiceNumber = `INV-${Date.now()}`;
    const subscription = (await Subscription.findOne({
      userId: notes.userId,
      planType: notes.planType,
      paymentStatus: "pending",
    })) || new Subscription({ userId: notes.userId, planType: notes.planType });

    const oldActive = await Subscription.findOne({
      userId: notes.userId,
      $or: [
        { paymentStatus: "completed", expiryDate: { $gt: new Date() } },
        { planType: "free" }
      ]
    }).sort({ createdAt: -1 });

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1);

    subscription.monthlyLimit = plan.internshipLimit;
    if (oldActive) {
      subscription.applicationsUsed = oldActive.applicationsUsed;
    }
    subscription.paymentId = payment.id;
    subscription.paymentStatus = "completed";
    subscription.startDate = startDate;
    subscription.expiryDate = expiryDate;
    subscription.invoiceNumber = invoiceNumber;
    subscription.invoiceUrl = `/invoices/${invoiceNumber}.pdf`;
    subscription.price = plan.priceInr;
    subscription.emailInvoiceSentAt = new Date();
    subscription.paymentOTP = null;
    subscription.paymentOTPExpires = null;

    await subscription.save();

    if (notes.email) {
      await sendInvoiceEmail({
        to: notes.email,
        planName: plan.displayName,
        invoiceNumber,
        amount: plan.priceInr,
        invoiceUrl: subscription.invoiceUrl,
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Handle payment callback
router.post("/paymentCallback", async (req, res) => {
  try {
    const { userId, planType, paymentId, status } = req.body;

    if (status === "success") {
      const plan = await Plan.findOne({ planName: planType });
      const startDate = new Date();
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + 1);

      const invoiceNumber = "INV-" + Date.now();
      const invoiceUrl = `/invoices/${invoiceNumber}.pdf`;
      const subscription = (await Subscription.findOne({
        userId,
        planType,
        paymentStatus: "pending",
      })) || new Subscription({ userId, planType });

      const oldActive = await Subscription.findOne({
        userId,
        $or: [
          { paymentStatus: "completed", expiryDate: { $gt: new Date() } },
          { planType: "free" }
        ]
      }).sort({ createdAt: -1 });

      subscription.monthlyLimit = plan.internshipLimit;
      if (oldActive) {
        subscription.applicationsUsed = oldActive.applicationsUsed;
      }
      subscription.paymentId = paymentId;
      subscription.paymentStatus = "completed";
      subscription.startDate = startDate;
      subscription.expiryDate = expiryDate;
      subscription.invoiceNumber = invoiceNumber;
      subscription.invoiceUrl = invoiceUrl;
      subscription.price = plan.priceInr;
      subscription.emailInvoiceSentAt = new Date();
      subscription.paymentOTP = null;
      subscription.paymentOTPExpires = null;

      await subscription.save();

      if (req.body.email) {
        await sendInvoiceEmail({
          to: req.body.email,
          planName: plan.displayName,
          invoiceNumber,
          amount: plan.priceInr,
          invoiceUrl,
        });
      }

      res.json({
        success: true,
        message: "Subscription activated successfully",
        invoiceNumber: subscription.invoiceNumber,
        invoiceUrl: subscription.invoiceUrl,
      });
    } else {
      res.status(400).json({ success: false, error: "Payment failed" });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get subscription history
router.get("/history/:userId", async (req, res) => {
  try {
    const subscriptions = await Subscription.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });

    res.json({ success: true, subscriptions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
