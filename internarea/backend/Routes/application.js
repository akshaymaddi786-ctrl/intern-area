const express = require("express");
const router = express.Router();
const application = require("../Model/Application");
const Subscription = require("../Model/Subscription");

async function getUserSubscription(userId) {
  let subscription = await Subscription.findOne({
    userId,
    paymentStatus: "completed",
    expiryDate: { $gt: new Date() },
  }).sort({ expiryDate: -1 });

  if (!subscription) {
    subscription = await Subscription.findOne({
      userId,
      planType: "free",
    });
    if (!subscription) {
      subscription = new Subscription({
        userId,
        planType: "free",
        monthlyLimit: 1,
        paymentStatus: "completed",
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });
      await subscription.save();
    }
  }
  return subscription;
}

router.post("/", async (req, res) => {
  try {
    const userId = req.body.user?.uid;
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required" });
    }

    const subscription = await getUserSubscription(userId);
    if (subscription.applicationsUsed >= subscription.monthlyLimit) {
      return res.status(403).json({
        success: false,
        error: `You have reached the monthly application limit of ${subscription.monthlyLimit} for your ${subscription.planType} plan.`,
      });
    }

    const applicationipdata = new application({
      company: req.body.company,
      category: req.body.category,
      coverLetter: req.body.coverLetter,
      user: req.body.user,
      Application: req.body.Application,
      availability: req.body.availability,
    });
    const savedApplication = await applicationipdata.save();

    subscription.applicationsUsed += 1;
    await subscription.save();

    res.status(201).json({ success: true, data: savedApplication });
  } catch (error) {
    console.error("Error creating application:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
router.get("/", async (req, res) => {
  try {
    const data = await application.find();
    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const data = await application.findById(id);
    if (!data) {
      return res.status(404).json({ error: "application not found" });
    }
    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "internal server error" });
  }
});
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  let status;
  if (action === "accepted") {
    status = "accepted";
  } else if (action === "rejected") {
    status = "rejected";
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }
  try {
    const updateapplication = await application.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
    if (!updateapplication) {
      return res.status(404).json({ error: "Not able to update the application" });
    }
    res.status(200).json({ success: true, data: updateapplication });
  } catch (error) {
    res.status(500).json({ error: "internal server error" });
  }
});
module.exports = router;
