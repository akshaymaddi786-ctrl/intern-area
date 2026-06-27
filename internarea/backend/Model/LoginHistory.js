const mongoose = require("mongoose");

const LoginHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  browser: String,
  operatingSystem: String,
  deviceType: {
    type: String,
    enum: ["desktop", "laptop", "mobile"],
  },
  ipAddress: String,
  city: String,
  country: String,
  otp: String,
  otpExpires: Date,
  loginTime: {
    type: Date,
    default: Date.now,
  },
  logoutTime: Date,
  otpRequired: Boolean,
  otpVerified: Boolean,
  loginAttempt: {
    type: String,
    enum: ["pending", "success", "failed", "blocked"],
    default: "pending",
  },
});

module.exports = mongoose.model("LoginHistory", LoginHistorySchema);
