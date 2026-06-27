import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { LanguageCode, supportedLanguages } from "@/lib/translations";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

export default function LanguagePage() {
  const user = useSelector(selectuser);
  const { language, setLanguage, t } = useLanguage();
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>(language);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const changeLanguage = async () => {
    if (!user?.uid || !user?.email) {
      toast.error("Sign in first to update your language preference");
      return;
    }

    if (pendingLanguage === "fr") {
      try {
        setLoading(true);
        await axios.post(apiUrl("/language/sendOTP/french"), { userId: user.uid, email: user.email });
        toast.success("OTP sent to your email");
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Unable to send OTP");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl("/language/change"), { userId: user.uid, language: pendingLanguage });
      setLanguage(pendingLanguage);
      toast.success(`Language changed to ${pendingLanguage}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to change language");
    } finally {
      setLoading(false);
    }
  };

  const verifyFrench = async () => {
    if (!user?.uid || !user?.email) {
      toast.error("Sign in first to verify the OTP");
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl("/language/verifyOTP/french"), {
        userId: user.uid,
        email: user.email,
        providedOTP: otp,
      });
      setLanguage("fr");
      toast.success("French language enabled");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-start gap-4">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("selectYourLanguage")}</h1>
            <p className="mt-2 text-slate-500">{t("languageNote")}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">{t("selectLanguage")}</label>
            <select
              value={pendingLanguage}
              onChange={(event) => setPendingLanguage(event.target.value as LanguageCode)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
            >
              {supportedLanguages.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              onClick={changeLanguage}
              disabled={loading}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {pendingLanguage === "fr" ? t("sendOtp") : "Apply language"}
            </button>
          </div>

          {pendingLanguage === "fr" ? (
            <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900">{t("verifyOtp")}</h2>
              <p className="text-sm text-slate-600">{t("languageNote")}</p>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                placeholder={t("otp")}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"
              />
              <button
                onClick={verifyFrench}
                disabled={loading}
                className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {t("verifyOtp")}
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-lg font-semibold text-slate-900">Current preference</h2>
              <p className="mt-2 text-sm text-slate-500">Your current language is <span className="font-semibold">{language}</span>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
