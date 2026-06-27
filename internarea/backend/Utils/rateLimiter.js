// Rate Limiter Service - Implement rate limiting for forgot password and other features
const rateLimit = {};

function checkRateLimit(userId, action, limit = 1, windowMs = 24 * 60 * 60 * 1000) {
  const key = `${userId}_${action}`;
  const now = Date.now();

  if (!rateLimit[key]) {
    rateLimit[key] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Reset if window has passed
  if (now > rateLimit[key].resetTime) {
    rateLimit[key] = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Check limit
  if (rateLimit[key].count >= limit) {
    return {
      allowed: false,
      message: `You can use this option only once per day.`,
      retryAfter: rateLimit[key].resetTime,
    };
  }

  // Increment counter
  rateLimit[key].count++;

  return {
    allowed: true,
    message: "Action allowed",
  };
}

function resetRateLimit(userId, action) {
  const key = `${userId}_${action}`;
  delete rateLimit[key];
}

module.exports = {
  checkRateLimit,
  resetRateLimit,
};
