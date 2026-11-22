"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  Clock,
  PhoneCall,
  Save,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  FileSpreadsheet,
  Globe,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { validateGstin, getStateFromGstin } from "@/utils/gstin";

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export default function ClinicSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  // Clinic profile form state
  const [timezone, setTimezone] = React.useState("Asia/Kolkata");
  const [defaultSlotMinutes, setDefaultSlotMinutes] = React.useState(15);
  const [invoicePrefix, setInvoicePrefix] = React.useState("INV");
  const [gstin, setGstin] = React.useState("");
  const [wabaId, setWabaId] = React.useState("");
  const [broadcastWebhookUrl, setBroadcastWebhookUrl] = React.useState("");
  const [broadcastApiKey, setBroadcastApiKey] = React.useState("");
  const [hasBroadcastApiKey, setHasBroadcastApiKey] = React.useState(false);

  const [workingHours, setWorkingHours] = React.useState<
    Record<string, { start: string; end: string; enabled: boolean }>
  >({
    monday: { start: "09:00", end: "18:00", enabled: true },
    tuesday: { start: "09:00", end: "18:00", enabled: true },
    wednesday: { start: "09:00", end: "18:00", enabled: true },
    thursday: { start: "09:00", end: "18:00", enabled: true },
    friday: { start: "09:00", end: "18:00", enabled: true },
    saturday: { start: "09:00", end: "14:00", enabled: true },
    sunday: { start: "10:00", end: "13:00", enabled: false },
  });

  const isGstinValid = React.useMemo(() => (!gstin ? true : validateGstin(gstin)), [gstin]);
  const gstinState = React.useMemo(() => (gstin ? getStateFromGstin(gstin) : null), [gstin]);

  const fetchProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/crm/settings/clinic");
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        setTimezone(p.timezone || "Asia/Kolkata");
        setDefaultSlotMinutes(p.defaultSlotMinutes || 15);
        setInvoicePrefix(p.invoicePrefix || "INV");
        setGstin(p.gstin || "");
        setWabaId(p.wabaId || "");
        setBroadcastWebhookUrl(p.broadcastWebhookUrl || "");
        setHasBroadcastApiKey(p.hasBroadcastApiKey);
        if (p.workingHoursJson) {
          setWorkingHours((prev) => ({ ...prev, ...p.workingHoursJson }));
        }
      }
    } catch {
      toast.error("Failed to load clinic settings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (gstin && !isGstinValid) {
      toast.error("Please provide a valid 15-character GSTIN or leave blank");
      return;
    }

    try {
      setSaving(true);
      const payload: Record<string, unknown> = {
        timezone,
        defaultSlotMinutes: Number(defaultSlotMinutes),
        invoicePrefix,
        gstin: gstin.trim() || null,
        wabaId: wabaId.trim() || null,
        broadcastWebhookUrl: broadcastWebhookUrl.trim() || null,
        workingHoursJson: workingHours,
      };

      if (broadcastApiKey.trim()) {
        payload.broadcastApiKey = broadcastApiKey.trim();
      }

      const res = await fetch("/api/crm/settings/clinic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update settings");
      }

      toast.success("Clinic settings saved successfully");
      setBroadcastApiKey("");
      if (data.profile) {
        setHasBroadcastApiKey(data.profile.hasBroadcastApiKey);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving settings";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleHourChange = (
    day: string,
    field: "start" | "end" | "enabled",
    val: string | boolean
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: val,
      },
    }));
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Subnavigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Clinic Settings & Operational Profile
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure clinic operating parameters, working hours, and third-party integrations
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/settings/clinic"
            className="px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200"
          >
            Clinic Profile
          </Link>
          <Link
            href="/settings/schedules"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Doctor Schedules
          </Link>
          <Link
            href="/settings/catalog"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Master Catalog
          </Link>
          <Link
            href="/settings/team"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Staff & Team
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading clinic settings...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* General Profile Card */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                  <Clock className="h-4 w-4 text-blue-600" />
                  Operational Parameters
                </CardTitle>
                <CardDescription className="text-xs">
                  Timezone, appointment cadence, and billing numbering
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Clinic Timezone
                    </label>
                    <Input
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="h-9 text-[13px]"
                      placeholder="Asia/Kolkata"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Slot Duration (Mins)
                    </label>
                    <Input
                      type="number"
                      min={5}
                      max={120}
                      value={defaultSlotMinutes}
                      onChange={(e) => setDefaultSlotMinutes(Number(e.target.value))}
                      className="h-9 text-[13px]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Invoice Prefix
                    </label>
                    <Input
                      value={invoicePrefix}
                      onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                      className="h-9 text-[13px] uppercase"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      GSTIN (Optional)
                    </label>
                    <Input
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      className="h-9 text-[13px] uppercase font-mono"
                      placeholder="27AAAAA0000A1Z5"
                      maxLength={15}
                    />
                    {gstin && !isGstinValid && (
                      <p className="text-[11px] text-red-500 mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Invalid GSTIN format
                      </p>
                    )}
                    {gstin && isGstinValid && (
                      <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> State: {gstinState}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Integration Card */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="p-3.5 pb-2">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-slate-800">
                  <span className="flex items-center gap-2">
                    <PhoneCall className="h-4 w-4 text-emerald-600" />
                    WhatsApp Business (WABA) Integration
                  </span>
                  {hasBroadcastApiKey ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                      Encrypted Key Stored
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">
                      Key Not Configured
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs">
                  Automated appointment notifications and patient reminders via Meta Cloud API
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3.5 pt-0 space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    WhatsApp Business Account (WABA) ID
                  </label>
                  <Input
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="h-9 text-[13px] font-mono"
                    placeholder="e.g. 109283746501928"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Broadcast Webhook Callback URL
                  </label>
                  <Input
                    type="url"
                    value={broadcastWebhookUrl}
                    onChange={(e) => setBroadcastWebhookUrl(e.target.value)}
                    className="h-9 text-[13px] font-mono"
                    placeholder="https://api.yourclinic.com/webhooks/whatsapp"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    Broadcast API Secret Key
                  </label>
                  <Input
                    type="password"
                    value={broadcastApiKey}
                    onChange={(e) => setBroadcastApiKey(e.target.value)}
                    className="h-9 text-[13px] font-mono"
                    placeholder={hasBroadcastApiKey ? "•••••••••••••••• (Leave blank to keep unchanged)" : "Paste WABA API Key"}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Shield className="h-3 w-3 text-slate-400" />
                    Stored encrypted at rest with AES-256-GCM. Never logged in telemetry.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Working Hours Card */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="p-3.5 pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-800">
                <Clock className="h-4 w-4 text-blue-600" />
                Clinic Working Hours
              </CardTitle>
              <CardDescription className="text-xs">
                Weekly opening and closing windows for OPD slot generation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {DAYS_OF_WEEK.map((day) => {
                  const d = workingHours[day] || { start: "09:00", end: "18:00", enabled: true };
                  return (
                    <div
                      key={day}
                      className={`p-2.5 rounded-lg border text-xs transition-colors ${
                        d.enabled ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold capitalize text-slate-800">{day.slice(0, 3)}</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={d.enabled}
                            onChange={(e) => handleHourChange(day, "enabled", e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 h-3.5 w-3.5"
                          />
                          <span className="text-[10px] text-slate-500">Open</span>
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Start</span>
                          <Input
                            type="time"
                            value={d.start}
                            disabled={!d.enabled}
                            onChange={(e) => handleHourChange(day, "start", e.target.value)}
                            className="h-7 text-xs px-1.5 font-mono"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">End</span>
                          <Input
                            type="time"
                            value={d.end}
                            disabled={!d.enabled}
                            onChange={(e) => handleHourChange(day, "end", e.target.value)}
                            className="h-7 text-xs px-1.5 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="submit"
              disabled={saving}
              className="h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving Changes..." : "Save Clinic Settings"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
