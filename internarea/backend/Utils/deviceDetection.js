const { UAParser } = require("ua-parser-js");

// Device Detection Service
function getDeviceInfo(userAgent) {
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  const browser = result.browser.name || "Unknown";
  const os = result.os.name || "Unknown";

  let deviceType = "desktop";
  const type = result.device.type;
  if (type === "mobile") {
    deviceType = "mobile";
  } else if (type === "tablet") {
    deviceType = "laptop";
  }

  // Preserve manual fallbacks to match the project's exact logic
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    deviceType = "mobile";
  } else if (ua.includes("tablet") || ua.includes("ipad")) {
    deviceType = "laptop";
  }

  return { browser, os, deviceType };
}

module.exports = {
  getDeviceInfo,
};
