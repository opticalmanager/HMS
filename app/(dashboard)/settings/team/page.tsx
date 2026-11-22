"use client";

import * as React from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Stethoscope,
  Building,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { authClient, organization } from "@/lib/auth-client";
import { toast } from "sonner";

interface MemberRecord {
  id: string;
  role: string;
  createdAt: string | Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

interface InvitationRecord {
  id: string;
  email: string;
  role: string;
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
    icon: <Shield className="h-3 w-3" />,
    desc: "Unrestricted clinical, billing, AI, and organization management authority",
  },
  admin: {
    label: "Admin (Operations)",
    badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <Building className="h-3 w-3" />,
    desc: "Manage staff, appointments, billing, and clinic operations",
  },
  doctor: {
    label: "Doctor (Consultant)",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <Stethoscope className="h-3 w-3" />,
    desc: "OPD consultation, electronic prescriptions, vitals, and visit notes",
  },
  receptionist: {
    label: "Receptionist (Front Desk)",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Users className="h-3 w-3" />,
    desc: "Patient registration, token generation, appointments, and billing receipts",
  },
};

export default function TeamSettingsPage() {
  const [members, setMembers] = React.useState<MemberRecord[]>([]);
  const [invitations, setInvitations] = React.useState<InvitationRecord[]>([]);
  const [orgDetails, setOrgDetails] = React.useState<{ name: string; slug: string; id: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  // Invite form state
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"admin" | "doctor" | "receptionist">("doctor");
  const [inviteLoading, setInviteLoading] = React.useState(false);
  const [inviteError, setInviteError] = React.useState<string | null>(null);

  const fetchTeamData = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await authClient.organization.getFullOrganization();
      if (res.data) {
        setOrgDetails({
          id: res.data.id,
          name: res.data.name,
          slug: res.data.slug || "",
        });
        setMembers((res.data.members as unknown as MemberRecord[]) || []);
        setInvitations((res.data.invitations as unknown as InvitationRecord[]) || []);
      }
    } catch (err) {
      console.error("Failed to load team data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  const handleInviteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError(null);

    try {
      const res = await organization.inviteMember({
        email: inviteEmail,
        role: inviteRole,
      });

      if (res.error) {
        setInviteError(res.error.message || "Failed to send invitation.");
        setInviteLoading(false);
        return;
      }

      toast.success(`Invitation successfully dispatched to ${inviteEmail}`);
      setInviteEmail("");
      setIsDialogOpen(false);
      await fetchTeamData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error dispatching staff invitation.";
      setInviteError(message);
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-[#2563EB]" />
            Clinic Staff & Role-Based Access Control (RBAC)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage authorized healthcare personnel, clinical roles, and invitations for{" "}
            <span className="font-semibold text-slate-700">{orgDetails?.name || "Active Clinic"}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTeamData}
            disabled={loading}
            className="h-8 text-xs text-slate-600 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs bg-[#2563EB] hover:bg-blue-700 text-white gap-1.5">
                <UserPlus className="h-3.5 w-3.5" />
                <span>Invite Staff Member</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white">
              <DialogHeader>
                <DialogTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-[#2563EB]" />
                  Invite Clinical Staff Member
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Send an official invitation link to join {orgDetails?.name || "this hospital"}.
                </DialogDescription>
              </DialogHeader>

              {inviteError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{inviteError}</span>
                </div>
              )}

              <form onSubmit={handleInviteStaff} className="space-y-3.5 py-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Staff Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3 h-4 w-4 text-slate-400" />
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="doctor.name@hospital.org"
                      className="pl-9 h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Assign Clinical RBAC Role
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {(["doctor", "receptionist", "admin"] as const).map((r) => {
                      const cfg = ROLE_CONFIG[r];
                      const isSelected = inviteRole === r;
                      return (
                        <div
                          key={r}
                          onClick={() => setInviteRole(r)}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected
                              ? "border-[#2563EB] bg-blue-50/50 ring-1 ring-[#2563EB]"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {cfg.icon}
                              <span className="text-xs font-semibold text-slate-900">{cfg.label}</span>
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1 pl-5">{cfg.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen(false)}
                    className="h-8 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={inviteLoading}
                    className="h-8 text-xs bg-[#2563EB] hover:bg-blue-700 text-white gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{inviteLoading ? "Sending Invite..." : "Send Invitation"}</span>
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Role Summary Badges Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(ROLE_CONFIG).map(([roleKey, cfg]) => {
          const count = members.filter((m) => m.role === roleKey).length;
          return (
            <Card key={roleKey} className="border-slate-200 bg-white shadow-2xs">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {cfg.label.split(" ")[0]}
                  </span>
                  <div className={`p-1 rounded-md ${cfg.badgeClass}`}>{cfg.icon}</div>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">{count}</div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">{cfg.desc}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Active Members Table */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="py-3 px-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900">
              Active Clinic Personnel ({members.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Users with verified access to this hospital tenant
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Assigned RBAC Role</th>
                  <th className="py-2.5 px-4">Member ID</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      {loading ? "Loading clinic personnel..." : "No active members found."}
                    </td>
                  </tr>
                ) : (
                  members.map((m) => {
                    const cfg = ROLE_CONFIG[m.role] || ROLE_CONFIG.receptionist;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-4">
                          <div className="font-medium text-slate-900">{m.user?.name || "Clinic Staff"}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{m.user?.email}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[11px] px-2 py-0.5 gap-1 font-medium ${cfg.badgeClass}`}
                          >
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                          {m.id}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Active
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending Invitations Table */}
      {invitations.length > 0 && (
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="py-3 px-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Staff Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Invited Email</th>
                    <th className="py-2.5 px-4">Designated Role</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => {
                    const cfg = ROLE_CONFIG[inv.role] || ROLE_CONFIG.receptionist;
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 font-medium text-slate-900 font-mono">{inv.email}</td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-[11px] px-2 py-0.5 gap-1 font-medium ${cfg.badgeClass}`}
                          >
                            {cfg.icon}
                            <span>{cfg.label}</span>
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Pending Acceptance
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
