const crypto = require("crypto");
const Razorpay = require("razorpay");

function hasRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) return false;

  const isPlaceholder = (str) => {
    const s = str.toLowerCase();
    return s.includes("xxxxx") || s.includes("placeholder") || s.includes("your_");
  };

  if (isPlaceholder(keyId) || isPlaceholder(keySecret)) {
    return false;
  }

  return true;
}

function createRazorpayClient() {
  if (!hasRazorpayConfig()) {
    throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

async function createOrder({ amountInr, currency = "INR", receipt, notes = {} }) {
  const client = createRazorpayClient();
  return client.orders.create({
    amount: Math.round(amountInr * 100),
    currency,
    receipt,
    payment_capture: 1,
    notes,
  });
}

function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Razorpay webhook secret is not configured.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return expectedSignature === signature;
}

module.exports = {
  hasRazorpayConfig,
  createOrder,
  verifyWebhookSignature,
};