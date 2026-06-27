// OTP Service - Generate and verify OTPs
function generateOTP(length = 6) {
  const digits = "0123456789";
  let otp = "";
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

function verifyOTP(providedOTP, storedOTP, expiryTime) {
  const now = new Date();
  if (now > expiryTime) {
    return { valid: false, message: "OTP expired" };
  }

  const cleanProvided = String(providedOTP || "").trim();
  const cleanStored = String(storedOTP || "").trim();

  if (cleanProvided === cleanStored) {
    return { valid: true, message: "OTP verified successfully" };
  }
  return { valid: false, message: "Invalid OTP" };
}

module.exports = {
  generateOTP,
  verifyOTP,
};
