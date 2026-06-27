import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/loadRazorpay";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { BadgeCheck, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

const planOrder = ["free", "bronze", "silver", "gold"] as const;

type PlanType = (typeof planOrder)[number];

export default function SubscriptionPage() {
  const user = useSelector(selectuser);
  const { t } = useLanguage();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>("bronze");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState("");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await axios.get(apiUrl("/subscription/plans"));
        setPlans(response.data.plans || []);
      } catch (error) {
        console.log(error);
      }
    };

    fetchPlans();
  }, []);

  const sendOtp = async () => {
    if (!user?.uid || !user?.email) {
      toast.error("Sign in first to purchase a plan");
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl("/subscription/sendOTP"), {
        userId: user.uid,
        email: user.email,
        planType: selectedPlan,
      });
      toast.success("OTP sent to your email");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndPay = async () => {
    if (!otp.trim()) {
      toast.error("Enter the OTP first");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(apiUrl("/subscription/verifyOTPAndPay"), {
        userId: user?.uid,
        email: user?.email,
        planType: selectedPlan,
        providedOTP: otp,
      });

      if (!response.data?.orderId || !response.data?.keyId) {
        toast.info("Simulating payment callback for local testing...");
        const callbackResponse = await axios.post(apiUrl("/subscription/paymentCallback"), {
          userId: user?.uid,
          planType: selectedPlan,
          paymentId: "mock-pay-" + Math.random().toString(36).substring(7),
          status: "success",
          email: user?.email,
        });
        if (callbackResponse.data?.success) {
          toast.success("Subscription activated (Simulated payment)");
          setInvoice(callbackResponse.data.invoiceNumber || "mock-invoice");
        } else {
          toast.error("Simulated payment failed");
        }
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Could not load Razorpay checkout");
        return;
      }

      const razorpay = new (window as any).Razorpay({
        key: response.data.keyId,
        amount: response.data.paymentAmount * 100,
        currency: response.data.currency,
        name: "InternArea",
        description: `${selectedPlan} subscription`,
        order_id: response.data.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        handler: () => {
          toast.success("Payment completed. Invoice will arrive by email after webhook confirmation.");
          setInvoice(response.data.orderId || "");
        },
        theme: { color: "#0f172a" },
      });

      razorpay.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Subscription payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-emerald-600 p-3 text-white">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("subscriptionPlans")}</h1>
            <p className="mt-2 text-slate-500">{t("subscriptionDescription")}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <button
              key={plan.planName}
              onClick={() => setSelectedPlan(plan.planName)}
              className={`rounded-3xl border p-5 text-left transition ${
                selectedPlan === plan.planName ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">{plan.displayName}</h2>
                <BadgeCheck className="h-5 w-5 text-blue-600" />
              </div>
              <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
              <p className="mt-4 text-2xl font-bold text-slate-900">₹{plan.priceInr}/month</p>
              <p className="mt-1 text-sm text-slate-500">
                Limit: {plan.internshipLimit >= Number.MAX_SAFE_INTEGER ? "Unlimited" : plan.internshipLimit}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <label className="block text-sm font-medium text-slate-700">Selected plan</label>
            <input value={selectedPlan} readOnly className="w-full rounded-2xl border border-slate-200 px-4 py-3" />
            <button
              onClick={sendOtp}
              disabled={loading}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              Send verification OTP
            </button>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder={t("otp")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-400"
            />
            <button
              onClick={verifyAndPay}
              disabled={loading}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {t("payNow")}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Active status</h2>
            <p className="mt-2 text-sm text-slate-600">{t("paymentWindowNotice")}</p>
            {user?.uid ? (
              <p className="mt-4 text-sm text-slate-600">
                Logged-in user: <span className="font-semibold">{user.email}</span>
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Sign in to activate a plan.</p>
            )}
            {invoice ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                Invoice generated: {invoice}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
