"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Lock, Mail, User, ShieldCheck, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signUp } from "@/lib/auth-client";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

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

      // New users proceed straight to clinic onboarding to create their organization
      router.push("/onboarding");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to register. Please try again.";
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
          Register Clinical Account
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Create Doctor or Hospital Administrator Profile
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

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 h-9 text-xs"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-9 bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs mt-2"
            disabled={loading}
          >
            {loading ? "Creating Clinical Account..." : "Create Account & Setup Clinic"}
          </Button>

          <div className="pt-2 text-center text-xs text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="text-[#2563EB] font-semibold hover:underline">
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
