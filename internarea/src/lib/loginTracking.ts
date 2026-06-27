import { apiUrl } from "@/lib/api";
import axios from "axios";

export async function fetchClientIp() {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip as string;
  } catch {
    return "Unknown";
  }
}

export async function trackLogin(userId: string) {
  const ipAddress = await fetchClientIp();
  const response = await axios.post(apiUrl("/login-history/track"), {
    userId,
    userAgent: navigator.userAgent,
    ipAddress,
  });
  return response.data as {
    success: boolean;
    loginId?: string;
    requiresOTP?: boolean;
    error?: string;
  };
}

export async function sendLoginOtp(loginId: string, email: string) {
  const response = await axios.post(apiUrl("/login-history/sendLoginOTP"), { loginId, email });
  return response.data;
}

export async function verifyLoginOtp(loginId: string, providedOTP: string) {
  const response = await axios.post(apiUrl("/login-history/verifyLoginOTP"), { loginId, providedOTP });
  return response.data;
}
