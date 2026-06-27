import { selectuser } from "@/Feature/Userslice";
import { useLanguage } from "@/context/LanguageContext";
import { apiUrl } from "@/lib/api";
import { ExternalLink, FileText, History, Mail, Shield, User, CreditCard, Users } from "lucide-react";
import Link from "next/link";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";

const index = () => {
  const user = useSelector(selectuser);
  const { t } = useLanguage();
  const [resumes, setResumes] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.uid) return;

      try {
        const [resumeResponse, subscriptionResponse] = await Promise.all([
          axios.get(apiUrl(`/resume/user/${user.uid}`)),
          axios.get(apiUrl(`/subscription/current/${user.uid}`)),
        ]);
        setResumes((resumeResponse.data.resumes || []).filter((item: any) => item.attachedToProfile));
        setSubscription(subscriptionResponse.data.subscription);
      } catch (error) {
        console.log(error);
      }
    };

    fetchProfileData();
  }, [user?.uid]);

  const quickLinks = [
    { href: "/userapplication", label: "View Applications", icon: ExternalLink },
    { href: "/resume", label: t("createResume"), icon: FileText },
    { href: "/subscription", label: t("subscriptionPlans"), icon: CreditCard },
    { href: "/login-history", label: t("loginHistory"), icon: History },
    { href: "/public-space", label: t("publicSpace"), icon: Users },
    { href: "/language", label: t("selectLanguage"), icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt={user?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          <div className="pt-16 pb-8 px-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <div className="mt-2 flex items-center justify-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
              {subscription ? (
                <p className="mt-3 inline-flex rounded-full bg-blue-50 px-4 py-1 text-sm font-medium text-blue-700 capitalize">
                  {subscription.planType} plan — {subscription.monthlyLimit >= 999999 ? "Unlimited" : subscription.monthlyLimit} applications/month
                </p>
              ) : null}
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <span className="text-blue-600 font-semibold text-2xl">0</span>
                  <p className="text-blue-600 text-sm mt-1">Active Applications</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">{resumes.length}</span>
                  <p className="text-green-600 text-sm mt-1">Attached Resumes</p>
                </div>
              </div>

              {resumes.length > 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h2 className="font-semibold text-slate-900">Your resumes</h2>
                  <ul className="mt-3 space-y-2">
                    {resumes.map((resume) => (
                      <li key={resume._id} className="flex items-center justify-between text-sm text-slate-600">
                        <span>{resume.name}</span>
                        {resume.generatedResumeUrl ? (
                          <a
                            href={apiUrl(resume.generatedResumeUrl.replace("/api", ""))}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            View resume
                          </a>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                {quickLinks.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
