import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { loadRazorpayScript } from "@/lib/loadRazorpay";
import { selectuser } from "@/Feature/Userslice";
import axios from "axios";
import { FileText, Lock, Upload } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { useRouter } from "next/router";

export default function ResumePage() {
  const user = useSelector(selectuser);
  const router = useRouter();
  const { t } = useLanguage();
  const [resumeId, setResumeId] = useState("");
  const [otp, setOtp] = useState("");
  const [generatedResumeUrl, setGeneratedResumeUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const checkPremium = async () => {
      try {
        const response = await axios.get(apiUrl(`/subscription/current/${user.uid}`));
        const sub = response.data.subscription;
        if (!sub || sub.planType === "free" || sub.paymentStatus !== "completed") {
          toast.warn("Resume Builder is a premium feature. Redirecting to subscription plans...");
          router.push("/subscription");
        }
      } catch (error) {
        console.error("Failed to check subscription status:", error);
      }
    };

    checkPremium();
  }, [user?.uid, router]);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phoneNumber || "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    qualifications: "",
    experience: "",
    skills: "",
    photo: user?.photo || "",
    resumeSummary: "",
  });

  const qualifications = useMemo(
    () =>
      formData.qualifications
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((entry) => {
          const [degree = "", institution = "", year = "", cgpa = ""] = entry.split("|").map((part) => part.trim());
          return { degree, institution, year, cgpa };
        }),
    [formData.qualifications]
  );

  const experience = useMemo(
    () =>
      formData.experience
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((entry) => {
          const [jobTitle = "", company = "", startDate = "", endDate = "", description = ""] = entry.split("|").map((part) => part.trim());
          return { jobTitle, company, startDate, endDate, description };
        }),
    [formData.experience]
  );

  const handleChange = (event: any) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const createResume = async () => {
    if (!user?.uid) {
      toast.error("Sign in first to create a resume");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(apiUrl("/resume/create"), {
        userId: user.uid,
        resumeData: {
          ...formData,
          qualifications,
          experience,
          skills: formData.skills.split(",").map((item) => item.trim()).filter(Boolean),
        },
      });
      setResumeId(response.data.resumeId);
      toast.success(response.data.message || "Resume created");
    } catch (error: any) {
      // Log the detailed error for better debugging in the browser console.
      console.error("Error creating resume:", error.response?.data || error.message);
      // Provide a more informative error message to the user.
      toast.error(error?.response?.data?.error || "Unable to create resume. Note: This is a premium feature.");
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async () => {
    if (!resumeId || !user?.email) {
      toast.error("Create the resume first");
      return;
    }

    try {
      setLoading(true);
      await axios.post(apiUrl("/resume/sendOTP"), { resumeId, email: user.email });
      toast.success("OTP sent to your email");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndPay = async () => {
    if (!resumeId || !otp) {
      toast.error("Enter the OTP first");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(apiUrl("/resume/verifyOTPAndPay"), {
        resumeId,
        email: user?.email,
        providedOTP: otp,
      });

      if (!response.data?.orderId || !response.data?.keyId) {
        toast.info("Simulating payment callback for local testing...");
        const callbackResponse = await axios.post(apiUrl("/resume/paymentCallback"), {
          resumeId,
          paymentId: "mock-pay-" + Math.random().toString(36).substring(7),
          status: "success",
          email: user?.email,
        });
        if (callbackResponse.data?.success) {
          toast.success("Resume attached (Simulated payment)");
          setGeneratedResumeUrl(callbackResponse.data.resumeUrl || "mock-resume-url");
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
        description: "Resume creation fee",
        order_id: response.data.orderId,
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        handler: () => {
          toast.success("Payment completed. Resume will be attached after webhook confirmation.");
          setGeneratedResumeUrl(response.data.orderId || "");
        },
        theme: { color: "#0f172a" },
      });

      razorpay.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Payment flow failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-6xl rounded-3xl bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="rounded-2xl bg-blue-600 p-3 text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t("createResume")}</h1>
            <p className="mt-2 text-slate-500">{t("resumeDescription")}</p>
          </div>
        </div>

        {!user?.uid ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Sign in first to create and attach a resume to your profile.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-lg font-semibold text-slate-900">Resume details</h2>
            {[
              ["name", "Full name"],
              ["email", "Email"],
              ["phone", "Phone"],
              ["address", "Address"],
              ["city", "City"],
              ["state", "State"],
              ["pincode", "Pincode"],
              ["photo", "Photo URL"],
              ["resumeSummary", "Resume summary"],
            ].map(([field, label]) => (
              <input
                key={field}
                name={field}
                value={(formData as any)[field]}
                onChange={handleChange}
                placeholder={label}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
              />
            ))}
            <textarea
              name="qualifications"
              value={formData.qualifications}
              onChange={handleChange}
              placeholder="Qualifications: degree|institution|year|cgpa; ..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            />
            <textarea
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="Experience: jobTitle|company|startDate|endDate|description; ..."
              rows={3}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            />
            <input
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="Skills separated by commas"
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            />
            <button
              onClick={createResume}
              disabled={loading}
              className="rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
            >
              {t("createResume")}
            </button>
          </div>

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">Payment and OTP</h2>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              Resume fee: ₹50. The backend also blocks payment outside the 10:00 AM to 11:00 AM IST window.
            </div>
            <button
              onClick={sendOtp}
              disabled={!resumeId || loading}
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Send payment OTP
            </button>
            <input
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder={t("otp")}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-800 outline-none focus:border-blue-400"
            />
            <button
              onClick={verifyAndPay}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              <Lock className="h-4 w-4" />
              {t("verifyAndContinue")}
            </button>
            {generatedResumeUrl ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                Resume attached: {generatedResumeUrl}
              </div>
            ) : null}
            {resumeId ? (
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600">
                Resume session ID: <span className="font-semibold">{resumeId}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
