const mongoose = require("mongoose");

const LanguageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  preferredLanguage: {
    type: String,
    enum: ["en", "es", "hi", "pt", "zh", "fr"],
    default: "en",
  },
  frenchOTPVerified: {
    type: Boolean,
    default: false,
  },
  pendingLanguage: {
    type: String,
    enum: ["en", "es", "hi", "pt", "zh", "fr"],
    default: null,
  },
  languageOTP: String,
  languageOTPExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Language", LanguageSchema);
