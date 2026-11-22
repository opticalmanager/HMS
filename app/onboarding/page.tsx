"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient, organization } from "@/lib/auth-client";

export default function OnboardingPage() {
  const router = useRouter();

  const [clinicName, setClinicName] = React.useState("Apex Super Specialty Hospital");
  const [clinicSlug, setClinicSlug] = React.useState("apex-hospital");
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSlugGen = (name: string) => {
    setClinicName(name);
    setClinicSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  };

  const handleCreateClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await organization.create({
        name: clinicName,
        slug: clinicSlug,
      });

      if (res.error) {
        setErrorMsg(res.error.message || "Failed to create clinic organization.");
        setLoading(false);
        return;
      }

      const orgId = res.data?.id;
      if (orgId) {
        await authClient.organization.setActive({
          organizationId: orgId,
        });
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error setting up clinic organization.";
      setErrorMsg(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg">
        <Card className="border-slate-200 shadow-xl bg-white">
          <CardHeader className="text-center pb-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-600 mx-auto flex items-center justify-center text-white mb-2 shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Register Your Clinic Organization
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Set up your multi-tenant hospital instance and initialize your Owner permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {errorMsg && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateClinic} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Official Clinic / Hospital Name
                </label>
                <Input
                  type="text"
                  value={clinicName}
                  onChange={(e) => handleSlugGen(e.target.value)}
                  className="h-9 text-xs"
                  placeholder="e.g. Metro Care Hospital"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Displayed on patient prescriptions, bills, and discharge summaries.
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Clinic Tenant Slug (URL identifier)
                </label>
                <div className="flex items-center">
                  <span className="h-9 px-2.5 flex items-center bg-slate-100 border border-r-0 border-slate-300 rounded-l-md text-[11px] text-slate-500 font-mono">
                    apex.org/
                  </span>
                  <Input
                    type="text"
                    value={clinicSlug}
                    onChange={(e) => setClinicSlug(e.target.value)}
                    className="h-9 text-xs rounded-l-none font-mono"
                    placeholder="clinic-slug"
                    required
                  />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Unique subdomain or routing identifier for this hospital.
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1.5">
                <div className="font-medium text-slate-800 text-[11px] uppercase tracking-wider">
                  Tenant Defaults Assigned to You:
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Assigned <strong>Owner</strong> role with unrestricted clinical authority</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Isolated PostgreSQL database schema tenant partitioning</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Auto-initialized ABDM M1/M2 and WhatsApp notification queues</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-1.5"
                disabled={loading}
              >
                <span>{loading ? "Initializing Clinic Tenant..." : "Complete Setup & Launch Dashboard"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>

              <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Protected by Better Auth Multi-Tenant RBAC</span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
