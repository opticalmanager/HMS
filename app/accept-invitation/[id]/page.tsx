"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Stethoscope,
  Users,
  Building,
  Shield,
  ArrowRight,
  LogIn,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authClient, useSession } from "@/lib/auth-client";
import { toast } from "sonner";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  organizationId: string;
  organizationName?: string;
  status: string;
  expiresAt: string | Date;
}

const ROLE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: React.ReactNode; desc: string }
> = {
  owner: {
    label: "Owner (Director)",
    badgeClass: "bg-purple-100 text-purple-800 border-purple-200",
    icon: <Shield className="h-3.5 w-3.5" />,
    desc: "Unrestricted clinical, billing, and organization administrative authority",
  },
  admin: {
    label: "Admin (Operations)",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <Building className="h-3.5 w-3.5" />,
    desc: "Manage staff, appointments, billing, and clinic operations",
  },
  doctor: {
    label: "Doctor (Consultant)",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <Stethoscope className="h-3.5 w-3.5" />,
    desc: "Electronic prescriptions, clinical visits, diagnoses, and vitals",
  },
  receptionist: {
    label: "Receptionist (Front Desk)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Users className="h-3.5 w-3.5" />,
    desc: "Patient registration, token generation, appointments, and billing",
  },
};

export default function AcceptInvitationPage() {
  const params = useParams();
  const router = useRouter();
  const invitationId = params?.id as string;

  const { data: session, isPending: sessionLoading } = useSession();
  const [invitation, setInvitation] = React.useState<InvitationData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [processing, setProcessing] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadInvitation() {
      if (!invitationId) return;
      try {
        setLoading(true);
        const res = await authClient.organization.getInvitation({
          query: { id: invitationId },
        });

        if (res.error) {
          setErrorMsg(res.error.message || "Invitation not found or has expired.");
          return;
        }

        if (res.data) {
          setInvitation(res.data as unknown as InvitationData);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load invitation details.";
        setErrorMsg(msg);
      } finally {
        setLoading(false);
      }
    }

    loadInvitation();
  }, [invitationId]);

  const handleAccept = async () => {
    if (!invitationId) return;
    setProcessing(true);
    setErrorMsg(null);

    try {
      const res = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (res.error) {
        setErrorMsg(res.error.message || "Failed to accept invitation.");
        setProcessing(false);
        return;
      }

      toast.success("Successfully joined the clinic organization!");

      // Set the newly joined organization as active
      if (invitation?.organizationId) {
        await authClient.organization.setActive({
          organizationId: invitation.organizationId,
        });
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error accepting invitation.";
      setErrorMsg(msg);
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!invitationId) return;
    setProcessing(true);
    try {
      await authClient.organization.rejectInvitation({
        invitationId,
      });
      toast.info("Invitation declined.");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error declining invitation.";
      setErrorMsg(msg);
      setProcessing(false);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500">Verifying clinic staff invitation...</p>
        </div>
      </div>
    );
  }

  const roleConfig = invitation?.role ? ROLE_CONFIG[invitation.role] || ROLE_CONFIG.receptionist : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <Card className="border-slate-200 shadow-xl bg-white">
          <CardHeader className="text-center pb-3">
            <div className="h-12 w-12 rounded-xl bg-[#2563EB] mx-auto flex items-center justify-center text-white mb-2 shadow-md">
              <Building2 className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
              Hospital Staff Invitation
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              You have been invited to join an authorized healthcare facility
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {invitation && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Invited Clinic</span>
                  <span className="font-semibold text-slate-900">
                    {invitation.organizationName || "Hospital Tenant"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Invited Email</span>
                  <span className="font-mono text-slate-700">{invitation.email}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Assigned RBAC Role</span>
                  {roleConfig && (
                    <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${roleConfig.badgeClass}`}>
                      {roleConfig.icon}
                      <span>{roleConfig.label}</span>
                    </Badge>
                  )}
                </div>

                {roleConfig && (
                  <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    {roleConfig.desc}
                  </p>
                )}
              </div>
            )}

            {!session ? (
              <div className="space-y-2.5 pt-2">
                <p className="text-xs text-slate-600 text-center">
                  Please sign in or register your staff account to accept this invitation.
                </p>
                <Button
                  onClick={() => router.push(`/login?next=/accept-invitation/${invitationId}`)}
                  className="w-full h-9 bg-[#2563EB] hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-2"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In to Accept Invitation</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/signup?next=/accept-invitation/${invitationId}`)}
                  className="w-full h-9 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-center gap-2 border-slate-200"
                >
                  <Users className="h-4 w-4 text-slate-400" />
                  <span>Register New Staff Account</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <Button
                  onClick={handleAccept}
                  disabled={processing}
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{processing ? "Joining Clinic..." : "Accept Invitation & Join Clinic"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>

                <Button
                  onClick={handleReject}
                  variant="outline"
                  disabled={processing}
                  className="w-full h-8 text-xs text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5 text-slate-400" />
                  <span>Decline Invitation</span>
                </Button>
              </div>
            )}

            <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 border-t border-slate-100">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Better Auth Multi-Tenant RBAC Isolation</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
