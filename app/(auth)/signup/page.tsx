"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Lock,
  Mail,
  User,
  Building2,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp, authClient } from "@/lib/auth-client";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("next") || searchParams.get("callbackUrl");
  const isAcceptingInvite = !!(callbackUrl && callbackUrl.startsWith("/accept-invitation"));

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [clinicName, setClinicName] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation checks
    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please verify your confirm password.");
      return;
    }

    setLoading(true);

    try {
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res.error) {
        setErrorMsg(res.error.message || "Registration failed. Please check your details.");
        setLoading(false);
        return;
      }

      // If user came via an invitation link, navigate directly to invitation page without creating a dummy clinic
      if (isAcceptingInvite && callbackUrl) {
        router.push(callbackUrl);
        router.refresh();
        return;
      }

      // Automatically create clinic organization for a new clinical owner
      try {
        const orgName =
          clinicName.trim() ||
          (name.trim() ? `${name.trim()}'s Clinic` : "Apex Healthcare Monolith");
        const baseSlug =
          orgName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "clinic";
        const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

        const orgRes = await authClient.organization.create({
          name: orgName,
          slug,
        });

        if (orgRes.data?.id) {
          await authClient.organization.setActive({
            organizationId: orgRes.data.id,
          });
          router.push("/dashboard");
          router.refresh();
          return;
        }
      } catch (orgErr) {
        console.warn("Auto-clinic creation deferred, routing to onboarding:", orgErr);
      }

      // Fallback to onboarding if auto-creation is deferred
      router.push("/onboarding");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to register. Please try again.";
      setErrorMsg(message);
      setLoading(false);
    }
  };

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <Card className="border-slate-200 shadow-xl bg-white">
      <CardHeader className="text-center pb-4">
        <div className="h-12 w-12 rounded-xl bg-[#2563EB] mx-auto flex items-center justify-center text-white mb-2 shadow-md">
          <Activity className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
          {isAcceptingInvite ? "Register Staff Account" : "Register Clinical Account"}
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          {isAcceptingInvite
            ? "Create your staff account to accept your clinic invitation"
            : "Create Doctor or Hospital Administrator Profile with Instant Workspace"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Full Legal Name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="Dr. Rajesh Sharma"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Official Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="dr.rajesh@apexhospital.org"
                required
              />
            </div>
          </div>

          {!isAcceptingInvite && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-700">
                  Clinic / Hospital Name
                </label>
                <span className="text-[10px] text-slate-400 font-normal">Optional</span>
              </div>
              <div className="relative flex items-center">
                <Building2 className="absolute left-3 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="pl-9 h-9 text-xs"
                  placeholder={name.trim() ? `${name.trim()}'s Clinic` : "Apex Multispecialty Hospital"}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Your clinic organization workspace will be initialized automatically upon signup.
              </span>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 h-9 text-xs"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-500" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">
                Confirm Password
              </label>
              {passwordsMatch && (
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Passwords match
                </span>
              )}
              {passwordsMismatch && (
                <span className="text-[10px] text-rose-500 font-medium">
                  Does not match
                </span>
              )}
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`pl-9 pr-9 h-9 text-xs ${
                  passwordsMismatch
                    ? "border-rose-300 focus-visible:ring-rose-400"
                    : passwordsMatch
                    ? "border-emerald-300 focus-visible:ring-emerald-400"
                    : ""
                }`}
                placeholder="Re-enter password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 focus:outline-hidden transition-colors"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-slate-500" />
                ) : (
                  <Eye className="h-4 w-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-9 bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs mt-2 transition-all shadow-xs"
            disabled={loading}
          >
            {loading
              ? isAcceptingInvite
                ? "Creating Staff Account..."
                : "Creating Clinical Account & Workspace..."
              : isAcceptingInvite
              ? "Create Staff Account & Proceed to Invite"
              : "Create Account & Setup Clinic"}
          </Button>

          <div className="pt-2 text-center text-xs text-slate-600">
            Already have an account?{" "}
            <Link
              href={callbackUrl ? `/login?next=${encodeURIComponent(callbackUrl)}` : "/login"}
              className="text-[#2563EB] font-semibold hover:underline"
            >
              Sign In
            </Link>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>End-to-End Encrypted Healthcare Database</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[300px] flex items-center justify-center">
          <Activity className="h-8 w-8 text-[#2563EB] animate-spin" />
        </div>
      }
    >
      <SignupForm />
    </React.Suspense>
  );
}
