const mongoose = require("mongoose");

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  name: String,
  email: String,
  phone: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  qualifications: [
    {
      degree: String,
      institution: String,
      year: String,
      cgpa: String,
    },
  ],
  experience: [
    {
      jobTitle: String,
      company: String,
      startDate: String,
      endDate: String,
      description: String,
    },
  ],
  skills: [String],
  photo: String,
  resumeSummary: String,
  generatedResumeUrl: String,
  pdfUrl: String,
  generatedHtml: String,
  paymentId: String,
  paymentOTP: String,
  paymentOTPExpires: Date,
  paymentVerifiedAt: Date,
  attachedToProfile: {
    type: Boolean,
    default: false,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed"],
    default: "pending",
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

module.exports = mongoose.model("Resume", ResumeSchema);
