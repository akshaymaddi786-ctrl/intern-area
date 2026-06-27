const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

function hasSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return false;

  const isPlaceholder = (str) => {
    const s = str.toLowerCase();
    return s.includes("your_") || 
           s.includes("example") || 
           s.includes("your-") || 
           s.includes("xxxx") || 
           s === "your_smtp_user" || 
           s === "your_smtp_password";
  };

  if (isPlaceholder(host) || isPlaceholder(user) || isPlaceholder(pass)) {
    return false;
  }

  return true;
}

function createTransporter() {
  if (!hasSmtpConfig()) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();
  const otpMatch = text ? text.match(/Your OTP is: (\d+)/) : null;
  const otp = otpMatch ? otpMatch[1] : "N/A";
  
  const logPath = path.join(__dirname, "../../../otp.txt");
  const logEntry = `\n============================================================\nTimestamp: ${new Date().toISOString()}\nTo: ${to}\nSubject: ${subject}\nOTP: ${otp}\nText Content:\n${text || html}\n============================================================\n`;

  if (!transporter) {
    console.warn("\n=======================================================");
    console.warn("WARNING: SMTP is not configured. Email was not sent.");
    console.warn(`To: ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn(`Content: ${text || html}`);
    console.warn("=======================================================\n");
    
    try {
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (err) {
      console.error("Failed to write to otp.txt:", err.message);
    }
    
    return { mockSent: true, messageId: "mock-id-" + Math.random().toString(36).substring(7) };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    const result = await transporter.sendMail({ from, to, subject, text, html });
    try {
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (err) {
      console.error("Failed to write to otp.txt:", err.message);
    }
    return result;
  } catch (error) {
    console.error("\n=======================================================");
    console.error("ERROR: Failed to send email via SMTP. Falling back to mock.");
    console.error(`Error details: ${error.message}`);
    console.error(`To: ${to}`);
    console.error(`Subject: ${subject}`);
    console.error(`Content: ${text || html}`);
    console.error("=======================================================\n");
    
    try {
      fs.appendFileSync(logPath, logEntry, "utf8");
    } catch (err) {
      console.error("Failed to write to otp.txt:", err.message);
    }
    
    return { mockSent: true, messageId: "mock-id-" + Math.random().toString(36).substring(7) };
  }
}

async function sendOtpEmail({ to, title, otp, message }) {
  const subject = `${title} OTP Verification`;
  const text = `${message}\n\nYour OTP is: ${otp}\nThis OTP expires in 10 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 12px;">${title}</h2>
      <p>${message}</p>
      <p style="font-size: 20px; font-weight: 700; letter-spacing: 4px; margin: 16px 0;">${otp}</p>
      <p>This OTP expires in 10 minutes.</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
}

async function sendInvoiceEmail({ to, planName, invoiceNumber, amount, invoiceUrl }) {
  const subject = `Invoice for ${planName} plan`;
  const text = `Your payment was successful.\n\nPlan: ${planName}\nInvoice: ${invoiceNumber}\nAmount: ₹${amount}\nInvoice URL: ${invoiceUrl || "N/A"}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin-bottom: 12px;">Payment Successful</h2>
      <p>Your plan has been activated.</p>
      <ul>
        <li><strong>Plan:</strong> ${planName}</li>
        <li><strong>Invoice:</strong> ${invoiceNumber}</li>
        <li><strong>Amount:</strong> ₹${amount}</li>
        <li><strong>Invoice URL:</strong> ${invoiceUrl ? `<a href="${invoiceUrl}">View Invoice</a>` : "N/A"}</li>
      </ul>
    </div>
  `;

  return sendMail({ to, subject, text, html });
}

module.exports = {
  sendMail,
  sendOtpEmail,
  sendInvoiceEmail,
};