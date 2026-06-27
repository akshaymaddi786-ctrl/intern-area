const mongoose = require("mongoose");

const PlanSchema = new mongoose.Schema({
  planName: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    unique: true,
  },
  displayName: String,
  description: String,
  priceInr: {
    type: Number,
    default: 0,
  },
  internshipLimit: {
    type: Number,
    required: true,
  },
  features: [String],
  billingCycle: {
    type: String,
    enum: ["monthly", "yearly"],
    default: "monthly",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Plan", PlanSchema);
