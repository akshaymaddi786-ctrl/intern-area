import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { AlertTriangle, History, Monitor, Shield, Smartphone, Tablet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

export default function LoginHistoryPage() {
  const { t } = useLanguage();
  const user = useSelector(selectuser);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.uid) return;

      try {
        setLoading(true);
        const response = await axios.get(apiUrl(`/login-history/history/${user.uid}`));
        setHistory(response.data.loginHistory || []);
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Could not load login history");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.uid]);

  const deviceIcon = (deviceType: string) => {
    if (deviceType === "mobile") return <Smartphone className="h-4 w-4" />;
    if (deviceType === "laptop") return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 rounded-3xl bg-slate-950 p-8 text-white shadow-2xl">
          <div className="flex items-center gap-3 text-cyan-300">
            <History className="h-7 w-7" />
            <span className="text-sm font-semibold uppercase tracking-[0.3em]">{t("loginHistory")}</span>
          </div>
          <h1 className="mt-4 text-4xl font-bold">Security log for every session</h1>
          <p className="mt-3 max-w-2xl text-slate-300">{t("loginHistoryDescription")}</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
            <AlertTriangle className="h-4 w-4" />
            {t("mobileWindowNotice")}
          </div>
        </div>

        {!user?.uid ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Sign in to view your login history.
          </div>
        ) : null}

        <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
          {loading ? (
            <div className="p-8 text-slate-600">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-slate-600">No login history found for this account.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((item) => (
                <div key={item._id} className="grid gap-4 px-6 py-5 md:grid-cols-[1fr_1fr_1fr_1fr]">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">{deviceIcon(item.deviceType)}</div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.browser}</p>
                      <p className="text-sm text-slate-500">{item.operatingSystem}</p>
                    </div>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Device</p>
                    <p className="capitalize">{item.deviceType}</p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-900">IP Address</p>
                    <p>{item.ipAddress || "Unknown"}</p>
                  </div>
                  <div className="text-sm text-slate-600">
                    <p className="font-medium text-slate-900">Status</p>
                    <p className="capitalize">{item.loginAttempt}</p>
                    <p className="text-xs text-slate-400">{new Date(item.loginTime).toLocaleString()}</p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <Shield className="h-3.5 w-3.5" />
                      {item.otpRequired ? (item.otpVerified ? "OTP verified" : "OTP required") : "No OTP"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
