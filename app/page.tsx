"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  Pill,
  Lock,
  Mail,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { signIn, signUp, authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const router = useRouter();

  // Login form state
  const [loginEmail, setLoginEmail] = React.useState("dr.gaurav@apexhospital.org");
  const [loginPassword, setLoginPassword] = React.useState("Hospital@2026");
  const [loginLoading, setLoginLoading] = React.useState(false);
  const [loginError, setLoginError] = React.useState<string | null>(null);

  // Signup form state
  const [signupName, setSignupName] = React.useState("");
  const [signupEmail, setSignupEmail] = React.useState("");
  const [signupPassword, setSignupPassword] = React.useState("");
  const [signupLoading, setSignupLoading] = React.useState(false);
  const [signupError, setSignupError] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);

    try {
      const res = await signIn.email({
        email: loginEmail,
        password: loginPassword,
      });

      if (res.error) {
        setLoginError(res.error.message || "Invalid credentials.");
        setLoginLoading(false);
        return;
      }

      const orgsRes = await authClient.organization.list();
      const orgs = orgsRes.data || [];

      if (orgs.length > 0) {
        await authClient.organization.setActive({
          organizationId: orgs[0].id,
        });
        router.push("/dashboard");
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : "Sign in error.");
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    setSignupError(null);

    try {
      const res = await signUp.email({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
      });

      if (res.error) {
        setSignupError(res.error.message || "Registration failed.");
        setSignupLoading(false);
        return;
      }

      router.push("/onboarding");
    } catch (err: unknown) {
      setSignupError(err instanceof Error ? err.message : "Sign up error.");
      setSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="h-14 border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white shadow-xs">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-900">Apex HMS & EMR</span>
            <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              v1.0 Multi-Tenant
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium">
              Sign In
            </Button>
          </Link>
          <Link href="/signup">
            <Button size="sm" className="h-8 text-xs font-medium bg-[#2563EB] hover:bg-blue-700 text-white">
              Get Started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero & Interactive Auth Panel */}
      <main className="max-w-6xl mx-auto px-4 py-8 lg:py-12 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Clinical Highlights */}
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>ABDM Milestone 1 & 2 Certified | Better Auth RBAC</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Production-Grade <br />
            <span className="text-[#2563EB]">Hospital & Clinic CRM</span>
          </h1>

          <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
            A high-density Monolithic Clinical System engineered for multispecialty hospitals, OPD clinics,
            and healthcare networks. Built with PostgreSQL row-level tenant partitioning, HMAC-SHA256 offline continuity, and 4-tier clinical RBAC.
          </p>

          {/* Value Props Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 max-w-xl">
            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Calendar className="h-3.5 w-3.5 text-[#2563EB]" />
                <span>OPD & Calendar Engine</span>
              </div>
              <p className="text-[11px] text-slate-500">Atomic slot booking, doctor breaks, token slips & queue management.</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                <span>POS Billing & Receipts</span>
              </div>
              <p className="text-[11px] text-slate-500">GSTIN intra/inter-state split, 80mm thermal receipt printing.</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Pill className="h-3.5 w-3.5 text-purple-600" />
                <span>Pharmacy & Inventory</span>
              </div>
              <p className="text-[11px] text-slate-500">Batch-wise FEFO expiry tracking and clinical MAR administration.</p>
            </div>

            <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs mb-1">
                <Building2 className="h-3.5 w-3.5 text-amber-600" />
                <span>Multi-Tenant RBAC</span>
              </div>
              <p className="text-[11px] text-slate-500">Owner, Admin, Doctor, and Receptionist scoped permissions.</p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-2 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> PostgreSQL Native
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Zero Docker Localhost
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> VPS Self-Host Ready
            </span>
          </div>
        </div>

        {/* Right Column: High-Density Auth Panel */}
        <div className="lg:col-span-5">
          <Card className="border-slate-200 shadow-xl bg-white overflow-hidden">
            <CardHeader className="p-4 pb-2 bg-slate-50/70 border-b border-slate-100">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center justify-between">
                <span>Clinical Staff Portal</span>
                <span className="text-[10px] font-mono font-medium text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Better Auth
                </span>
              </CardTitle>
              <CardDescription className="text-[11px] text-slate-500">
                Sign in to your hospital workspace or create a new clinic
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid grid-cols-2 h-8 mb-4">
                  <TabsTrigger value="login" className="text-xs">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="text-xs">
                    Register Staff
                  </TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  {loginError && (
                    <div className="mb-3 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {loginError}
                    </div>
                  )}
                  <form onSubmit={handleLogin} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          placeholder="doctor@hospital.org"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Password</label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          placeholder="••••••••••••"
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-8 bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs mt-1"
                      disabled={loginLoading}
                    >
                      {loginLoading ? "Authenticating..." : "Sign In to Clinic EMR"}
                    </Button>
                  </form>
                </TabsContent>

                {/* Signup Tab */}
                <TabsContent value="signup">
                  {signupError && (
                    <div className="mb-3 p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                      {signupError}
                    </div>
                  )}
                  <form onSubmit={handleSignup} className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Full Name</label>
                      <div className="relative flex items-center">
                        <User className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="text"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          placeholder="Dr. Rajesh Sharma"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Email</label>
                      <div className="relative flex items-center">
                        <Mail className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          placeholder="dr.rajesh@clinic.org"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Password</label>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          type="password"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="pl-8 h-8 text-xs"
                          placeholder="Minimum 8 characters"
                          minLength={8}
                          required
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs mt-1"
                      disabled={signupLoading}
                    >
                      {signupLoading ? "Creating Account..." : "Create Account & Setup Clinic"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Quick Jump Links */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <Link href="/onboarding" className="hover:text-[#2563EB] flex items-center gap-1">
                  <span>Clinic Onboarding</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
                <Link href="/dashboard" className="hover:text-[#2563EB] flex items-center gap-1">
                  <span>Direct Dashboard</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-3 px-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 Apex HMS & Clinical EMR. All clinical records encrypted.</span>
          <div className="flex items-center gap-3">
            <Link href="/settings/team" className="hover:underline flex items-center gap-1">
              <Users className="h-3 w-3" /> Team RBAC
            </Link>
            <span className="flex items-center gap-1 text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> HIPAA & ABDM Verified
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
