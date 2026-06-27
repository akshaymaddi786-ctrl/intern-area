import { apiUrl } from "@/lib/api";
import { sendLoginOtp, verifyLoginOtp } from "@/lib/loginTracking";
import { useState } from "react";
import { toast } from "react-toastify";

type LoginOTPModalProps = {
  loginId: string;
  email: string;
  onVerified: () => void;
  onCancel: () => void;
};

export default function LoginOTPModal({ loginId, email, onVerified, onCancel }: LoginOTPModalProps) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    try {
      setLoading(true);
      await sendLoginOtp(loginId, email);
      toast.success("OTP sent to your registered email");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    if (!otp.trim()) {
      toast.error("Enter the OTP");
      return;
    }

    try {
      setLoading(true);
      await verifyLoginOtp(loginId, otp);
      toast.success("Login verified successfully");
      onVerified();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-xl font-bold text-slate-900">Chrome login verification</h2>
        <p className="mt-2 text-sm text-slate-600">
          Google Chrome logins require email OTP verification before access is granted.
        </p>
        <button
          onClick={sendOtp}
          disabled={loading}
          className="mt-4 w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Send OTP to {email}
        </button>
        <input
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          placeholder="Enter OTP"
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={verify}
            disabled={loading}
            className="flex-1 rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Verify OTP
          </button>
          <button
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
