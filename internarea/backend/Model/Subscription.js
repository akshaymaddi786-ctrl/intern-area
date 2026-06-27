const mongoose = require("mongoose");

const SubscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  planType: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  monthlyLimit: {
    type: Number,
    default: 0,
  },
  applicationsUsed: {
    type: Number,
    default: 0,
  },
  paymentId: String,
  paymentOTP: String,
  paymentOTPExpires: Date,
  invoiceUrl: String,
  invoiceNumber: String,
  price: Number,
  currency: {
    type: String,
    default: "INR",
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
  },
  emailInvoiceSentAt: Date,
  startDate: Date,
  expiryDate: Date,
  autoRenewal: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Subscription", SubscriptionSchema);
