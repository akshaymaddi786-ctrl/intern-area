const mongoose = require("mongoose");

const PasswordResetSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  identifier: {
    type: String,
    required: true,
  },
  email: String,
  phone: String,
  otp: String,
  otpVerified: {
    type: Boolean,
    default: false,
  },
  resetToken: String,
  resetTokenExpires: Date,
  otpExpires: Date,
  lastRequestAt: {
    type: Date,
    default: Date.now,
  },
  requestCount: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 3600,
  },
});

module.exports = mongoose.model("PasswordReset", PasswordResetSchema);
