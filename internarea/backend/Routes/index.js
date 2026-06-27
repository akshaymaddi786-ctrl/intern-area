const express = require("express");
const router = express.Router();
const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application = require("./application");
const language = require("./language");
const password = require("./password");
const resume = require("./resume");
const posts = require("./posts");
const loginHistory = require("./loginHistory");
const subscription = require("./subscription");

router.use("/admin", admin);
router.use("/internship", intern);
router.use("/job", job);
router.use("/application", application);
router.use("/language", language);
router.use("/password", password);
router.use("/resume", resume);
router.use("/posts", posts);
router.use("/login-history", loginHistory);
router.use("/subscription", subscription);

module.exports = router;
