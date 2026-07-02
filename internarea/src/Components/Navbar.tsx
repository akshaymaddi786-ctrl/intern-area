import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { auth, provider } from "../firebase/firebase";
import { ChevronDown, Search, Menu, X } from "lucide-react";
import { signInWithPopup, signOut } from "firebase/auth";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageCode, supportedLanguages } from "@/lib/translations";
import { apiUrl } from "@/lib/api";
import { trackLogin } from "@/lib/loginTracking";
import axios from "axios";
import LoginOTPModal from "./LoginOTPModal";

const Navbar = () => {
  const user = useSelector(selectuser);
  const { language, setLanguage, t } = useLanguage();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [pendingLogin, setPendingLogin] = useState<{ loginId: string; email: string } | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!user?.uid || !user?.email) return;

    const validateActiveSession = async () => {
      try {
        const response = await axios.post(apiUrl("/login-history/validate-session"), {
          userId: user.uid,
          userAgent: navigator.userAgent,
        });

        if (response.data.requiresOTP && response.data.loginId) {
          setPendingLogin({ loginId: response.data.loginId, email: user.email });
        }
      } catch (error: any) {
        if (error.code === "ERR_NETWORK" || !error.response) {
          console.warn("Backend offline. Skipping session validation.");
          return;
        }
        await signOut(auth);
        toast.error(error?.response?.data?.error || "Session is invalid or expired.");
      }
    };

    validateActiveSession();
  }, [user?.uid, user?.email]);

  const handlelogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const authUser = result.user;

      let trackResult;
      try {
        trackResult = await trackLogin(authUser.uid);
      } catch (err: any) {
        console.warn("Backend offline. Logging in under offline preview mode:", err);
        toast.warning("Backend offline. Logged in offline mode.");
        toast.success("Logged in successfully");
        return;
      }

      if (!trackResult.success) {
        await signOut(auth);
        toast.error(trackResult.error || "Login blocked for this device or time window");
        return;
      }

      if (trackResult.requiresOTP && trackResult.loginId && authUser.email) {
        setPendingLogin({ loginId: trackResult.loginId, email: authUser.email });
        toast.info("Chrome login requires email OTP verification");
        return;
      }

      toast.success("Logged in successfully");
    } catch (error: any) {
      console.error(error);
      if (error?.code === "auth/unauthorized-domain") {
        toast.error("Firebase Auth: This domain is not whitelisted. Please add this domain under Authorized Domains in your Firebase console Settings.");
      } else {
        toast.error(error?.message || "Login failed");
      }
    }
  };

  const changeLanguage = async (code: LanguageCode) => {
    setShowLangMenu(false);

    if (!user?.uid || !user?.email) {
      setLanguage(code);
      toast.success(`Language set to ${code}`);
      return;
    }

    if (code === "fr") {
      try {
        await axios.post(apiUrl("/language/sendOTP/french"), { userId: user.uid, email: user.email });
        toast.info("OTP sent to your email for French language verification");
        window.location.href = "/language";
      } catch (error: any) {
        toast.error(error?.response?.data?.error || "Unable to send OTP");
      }
      return;
    }

    try {
      await axios.post(apiUrl("/language/change"), { userId: user.uid, language: code });
      setLanguage(code);
      toast.success(`Language changed to ${code}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Unable to change language");
    }
  };

  const handleGuestLogin = () => {
    const guestUser = {
      uid: "guest_user_evaluator",
      photo: "https://api.dicebear.com/7.x/adventurer/svg?seed=guest",
      name: "Guest Evaluator",
      email: "evaluator@internarea.com",
      phoneNumber: "1234567890",
    };
    localStorage.setItem("guestUser", JSON.stringify(guestUser));
    window.location.reload();
  };

  const handlelogout = () => {
    localStorage.removeItem("guestUser");
    signOut(auth);
    setPendingLogin(null);
    window.location.reload();
  };

  const currentLangLabel = supportedLanguages.find((item) => item.code === language)?.label || "English";

  return (
    <div className="relative">
      {pendingLogin ? (
        <LoginOTPModal
          loginId={pendingLogin.loginId}
          email={pendingLogin.email}
          onVerified={() => {
            setPendingLogin(null);
            toast.success("Logged in successfully");
          }}
          onCancel={async () => {
            setPendingLogin(null);
            await signOut(auth);
          }}
        />
      ) : null}

      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              {/* Mobile Menu Toggle (lg:hidden) */}
              <button
                onClick={() => setShowMobileMenu((prev) => !prev)}
                className="lg:hidden text-gray-700 hover:text-blue-600 focus:outline-none mr-2 p-1"
                aria-label="Toggle menu"
              >
                {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
              </button>

              <div className="flex-shrink-0">
                <a href="/" className="text-xl font-bold text-blue-600">
                  <img src={"/logo.png"} alt="" className="h-10 sm:h-16 object-contain transition-transform duration-300 hover:scale-105" />
                </a>
              </div>
            </div>

            <div className="hidden lg:flex items-center space-x-6">
              <Link href="/internship" className="text-gray-700 hover:text-blue-600">
                {t("internships")}
              </Link>
              <Link href="/job" className="text-gray-700 hover:text-blue-600">
                {t("jobs")}
              </Link>
              <Link href="/public-space" className="text-gray-700 hover:text-blue-600">
                {t("publicSpace")}
              </Link>
              <Link href="/resume" className="text-gray-700 hover:text-blue-600">
                {t("createResume")}
              </Link>
              <Link href="/subscription" className="text-gray-700 hover:text-blue-600">
                {t("subscriptionPlans")}
              </Link>
              <div className="flex items-center bg-gray-100 rounded-full px-4 py-2">
                <Search size={16} className="text-gray-400" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  className="ml-2 bg-transparent focus:outline-none text-sm w-40"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setShowLangMenu((previous) => !previous)}
                  className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  {currentLangLabel}
                  <ChevronDown size={14} />
                </button>
                {showLangMenu ? (
                  <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                    {supportedLanguages.map((item) => (
                      <button
                        key={item.code}
                        onClick={() => changeLanguage(item.code)}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          language === item.code ? "font-semibold text-blue-600" : "text-gray-700"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                    <Link href="/language" className="block px-4 py-2 text-sm text-blue-600 hover:bg-gray-50">
                      {t("selectLanguage")}
                    </Link>
                  </div>
                ) : null}
              </div>

              {user ? (
                <div className="relative flex items-center gap-2">
                  <Link href="/profile">
                    <img src={user.photo} alt="" className="w-8 h-8 rounded-full" />
                  </Link>
                  <button
                    className="hidden sm:inline-flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded-lg"
                    onClick={handlelogout}
                  >
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={handlelogin}
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 flex items-center space-x-2 hover:bg-gray-50 text-sm"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span className="text-gray-700 hidden sm:inline">{t("continueWithGoogle")}</span>
                  </button>
                  <button
                    onClick={handleGuestLogin}
                    className="hidden lg:inline-block bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                  >
                    Bypass Login
                  </button>
                  <Link href="/forgot-password" className="text-sm text-gray-600 hover:text-gray-800 hidden md:inline">
                    {t("forgotPassword")}
                  </Link>
                  <a href="/adminlogin" className="text-sm text-gray-600 hover:text-gray-800 hidden md:inline">
                    {t("admin")}
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Mobile Menu Drawer */}
        {showMobileMenu && (
          <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-4 space-y-3 shadow-inner">
            <Link
              href="/internship"
              onClick={() => setShowMobileMenu(false)}
              className="block text-gray-700 hover:text-blue-600 font-medium py-1"
            >
              {t("internships")}
            </Link>
            <Link
              href="/job"
              onClick={() => setShowMobileMenu(false)}
              className="block text-gray-700 hover:text-blue-600 font-medium py-1"
            >
              {t("jobs")}
            </Link>
            <Link
              href="/public-space"
              onClick={() => setShowMobileMenu(false)}
              className="block text-gray-700 hover:text-blue-600 font-medium py-1"
            >
              {t("publicSpace")}
            </Link>
            <Link
              href="/resume"
              onClick={() => setShowMobileMenu(false)}
              className="block text-gray-700 hover:text-blue-600 font-medium py-1"
            >
              {t("createResume")}
            </Link>
            <Link
              href="/subscription"
              onClick={() => setShowMobileMenu(false)}
              className="block text-gray-700 hover:text-blue-600 font-medium py-1"
            >
              {t("subscriptionPlans")}
            </Link>
            <div className="flex items-center bg-gray-100 rounded-full px-4 py-2 mt-2">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                className="ml-2 bg-transparent focus:outline-none text-sm w-full"
              />
            </div>
            {user ? (
              <button
                className="w-full text-left py-2 text-red-600 font-medium border-t border-gray-100 mt-2"
                onClick={() => {
                  handlelogout();
                  setShowMobileMenu(false);
                }}
              >
                {t("logout")}
              </button>
            ) : (
              <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                <button
                  onClick={() => {
                    handleGuestLogin();
                    setShowMobileMenu(false);
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-center text-sm transition-colors"
                >
                  Bypass Login
                </button>
                <div className="flex justify-between px-1 mt-1">
                  <Link
                    href="/forgot-password"
                    onClick={() => setShowMobileMenu(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t("forgotPassword")}
                  </Link>
                  <a
                    href="/adminlogin"
                    onClick={() => setShowMobileMenu(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t("admin")}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
