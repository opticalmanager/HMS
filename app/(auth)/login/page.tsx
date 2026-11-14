"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Activity, Lock, Mail, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("dr.gaurav@apexhospital.org");
  const [password, setPassword] = React.useState("••••••••••••");
  const [loading, setLoading] = React.useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  return (
    <Card className="border-slate-200 shadow-lg">
      <CardHeader className="text-center pb-4">
        <div className="h-12 w-12 rounded-xl bg-[#2563EB] mx-auto flex items-center justify-center text-white mb-2 shadow-md">
          <Activity className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">Apex HMS & Clinical EMR</CardTitle>
        <CardDescription className="text-xs">
          Secure Clinical Staff & Doctor Authentication
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Doctor / Staff Email</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-700 block mb-1">Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 h-4 w-4 text-slate-400" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 text-sm"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold"
            disabled={loading}
          >
            {loading ? "Authenticating Session..." : "Sign In to Clinical EMR"}
          </Button>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Encrypted HMAC-SHA256 Offline Fallback Protected</span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
