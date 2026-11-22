"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Activity, Lock, Mail, ShieldCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn, authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("next") || searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res.error) {
        setErrorMsg(res.error.message || "Invalid credentials. Please verify and retry.");
        setLoading(false);
        return;
      }

      // Check if user has an active organization or any organizations
      const orgsRes = await authClient.organization.list();
      const orgs = orgsRes.data || [];

      if (orgs.length > 0) {
        // Set the first organization as active if not already active
        await authClient.organization.setActive({
          organizationId: orgs[0].id,
        });
        router.push(callbackUrl);
      } else if (callbackUrl && callbackUrl !== "/dashboard") {
        // User was invited and directed to an invite flow or specific resource
        router.push(callbackUrl);
      } else {
        router.push("/onboarding");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in. Please try again.";
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-xl bg-white">
      <CardHeader className="text-center pb-4">
        <div className="h-12 w-12 rounded-xl bg-[#2563EB] mx-auto flex items-center justify-center text-white mb-2 shadow-md">
          <Activity className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
          Apex HMS & Clinical EMR
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Multi-Tenant Doctor & Healthcare Staff Authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        {errorMsg && (
          <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Staff Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="doctor@clinic.com"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-700">Password</label>
              <span className="text-[11px] text-blue-600 hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 h-9 text-xs"
                placeholder="••••••••••••"
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

          <Button
            type="submit"
            className="w-full h-9 bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs mt-2"
            disabled={loading}
          >
            {loading ? "Authenticating Session..." : "Sign In to Clinic EMR"}
          </Button>

          <div className="pt-2 text-center text-xs text-slate-600">
            Don&apos;t have a clinic account?{" "}
            <Link
              href={callbackUrl && callbackUrl !== "/dashboard" ? `/signup?next=${encodeURIComponent(callbackUrl)}` : "/signup"}
              className="text-[#2563EB] font-semibold hover:underline"
            >
              Register New Staff
            </Link>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>HIPAA & ABDM Compliant Multi-Tenant RBAC</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[300px] flex items-center justify-center">
          <Activity className="h-8 w-8 text-[#2563EB] animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}
