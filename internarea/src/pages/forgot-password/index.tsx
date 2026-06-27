import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import axios from "axios";
import { KeyRound, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [identifier, setIdentifier] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = async () => {
    if (!identifier.trim()) {
      toast.error("Enter your registered email or phone number");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(apiUrl("/password/request"), {
        userId: identifier.trim(),
        email: identifier.includes("@") ? identifier.trim() : undefined,
        phone: identifier.includes("@") ? undefined : identifier.trim(),
      });
      setResetToken(response.data.resetToken);
      toast.success(response.data.message || "OTP sent");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to request reset");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    if (!resetToken || !otp.trim()) {
      toast.error("Enter the OTP and request token first");
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl("/password/verifyOTP"), {
        resetToken,
        providedOTP: otp,
      });
      toast.success("OTP verified successfully");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!resetToken || !newPassword.trim()) {
      toast.error("Generate or enter a new password first");
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl("/password/reset"), {
        resetToken,
        newPassword,
      });
      toast.success("Password reset successfully");
      setIdentifier("");
      setOtp("");
      setNewPassword("");
      setResetToken("");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to reset password");
    } finally {
      setLoading(false);
    }
  };

  const generatePassword = async () => {
    try {
      const response = await axios.post(apiUrl("/password/generate-password"), {});
      setGeneratedPassword(response.data.password);
      setNewPassword(response.data.password);
      toast.success("Password generated");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to generate password");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-rose-600 p-3 text-white">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("forgotPassword")}</h1>
            <p className="mt-2 text-slate-500">{t("forgotPasswordDescription")}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700">Email or phone</label>
            <input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-400"
              placeholder="registered email or phone"
            />
            <button
              onClick={requestReset}
              disabled={loading}
              className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="inline h-4 w-4 animate-spin" /> : t("requestReset")}
            </button>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
            <label className="block text-sm font-medium text-slate-700">Reset token</label>
            <input
              value={resetToken}
              onChange={(event) => setResetToken(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-400"
              placeholder="token returned by request"
            />
            <label className="block text-sm font-medium text-slate-700">{t("otp")}</label>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-400"
              placeholder="OTP"
            />
            <div className="flex gap-3">
              <button
                onClick={verifyOtp}
                disabled={loading}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {t("verifyOtp")}
              </button>
              <button
                onClick={generatePassword}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {t("generatePassword")}
              </button>
            </div>
            <input
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-rose-400"
              placeholder={t("newPassword")}
            />
            <button
              onClick={resetPassword}
              disabled={loading}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {t("newPassword")}
            </button>
          </div>
        </div>

        {generatedPassword ? (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
            Generated password: <span className="font-semibold">{generatedPassword}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
