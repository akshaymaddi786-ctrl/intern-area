// Time Restriction Service - Check if current time allows the action
function isWithinTimeWindow(startHour, endHour, timezone = "Asia/Kolkata") {
  const now = new Date();
  const timeString = now.toLocaleString("en-US", { timeZone: timezone });
  const localDate = new Date(timeString);
  const currentHour = localDate.getHours();

  return currentHour >= startHour && currentHour < endHour;
}

function checkPaymentWindow() {
  // Always allow in development/testing
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  // Payments only between 10:00 AM and 11:00 AM IST
  return isWithinTimeWindow(10, 11, "Asia/Kolkata");
}

function checkMobileLoginWindow() {
  // Always allow in development/testing
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  // Mobile devices only between 10:00 AM and 1:00 PM IST
  return isWithinTimeWindow(10, 13, "Asia/Kolkata");
}

function getTimeUntilWindow(startHour, endHour, timezone = "Asia/Kolkata") {
  const now = new Date();
  const timeString = now.toLocaleString("en-US", { timeZone: timezone });
  const localDate = new Date(timeString);
  const currentHour = localDate.getHours();

  if (currentHour < startHour) {
    return startHour - currentHour;
  } else if (currentHour >= endHour) {
    return 24 - currentHour + startHour;
  }
  return 0;
}

module.exports = {
  isWithinTimeWindow,
  checkPaymentWindow,
  checkMobileLoginWindow,
  getTimeUntilWindow,
};
