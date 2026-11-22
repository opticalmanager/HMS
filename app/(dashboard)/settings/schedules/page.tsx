"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  Ban,
  User,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface ScheduleRecord {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  isActive: boolean;
}

interface SlotBlockRecord {
  id: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  reason: string | null;
  createdVia: string;
}

export default function DoctorSchedulesPage() {
  const [loading, setLoading] = React.useState(true);
  const [schedules, setSchedules] = React.useState<ScheduleRecord[]>([]);
  const [blocks, setBlocks] = React.useState<SlotBlockRecord[]>([]);
  const [activeTab, setActiveTab] = React.useState<"schedules" | "blocks">("schedules");

  // Schedule modal state
  const [isAddScheduleOpen, setIsAddScheduleOpen] = React.useState(false);
  const [newDoctorId, setNewDoctorId] = React.useState("");
  const [newDayOfWeek, setNewDayOfWeek] = React.useState(1);
  const [newStartTime, setNewStartTime] = React.useState("09:00");
  const [newEndTime, setNewEndTime] = React.useState("13:00");
  const [newSlotDuration, setNewSlotDuration] = React.useState(15);
  const [savingSchedule, setSavingSchedule] = React.useState(false);

  // Block modal state
  const [isAddBlockOpen, setIsAddBlockOpen] = React.useState(false);
  const [blockDoctorId, setBlockDoctorId] = React.useState("");
  const [blockStartAt, setBlockStartAt] = React.useState("");
  const [blockEndAt, setBlockEndAt] = React.useState("");
  const [blockReason, setBlockReason] = React.useState("");
  const [savingBlock, setSavingBlock] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [schedRes, blockRes] = await Promise.all([
        fetch("/api/crm/schedules"),
        fetch("/api/crm/schedules/blocks"),
      ]);

      const schedData = await schedRes.json();
      const blockData = await blockRes.json();

      if (schedData.success) {
        setSchedules(schedData.schedules || []);
        if (schedData.schedules?.length > 0 && !newDoctorId) {
          setNewDoctorId(schedData.schedules[0].doctorId);
          setBlockDoctorId(schedData.schedules[0].doctorId);
        }
      }
      if (blockData.success) {
        setBlocks(blockData.blocks || []);
      }
    } catch {
      toast.error("Failed to load doctor schedules");
    } finally {
      setLoading(false);
    }
  }, [newDoctorId]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newStartTime >= newEndTime) {
      toast.error("Start time must be strictly before end time");
      return;
    }

    try {
      setSavingSchedule(true);
      const res = await fetch("/api/crm/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: newDoctorId,
          dayOfWeek: Number(newDayOfWeek),
          startTime: newStartTime,
          endTime: newEndTime,
          slotDurationMins: Number(newSlotDuration),
          isActive: true,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create schedule");
      }

      toast.success("Schedule block created successfully");
      setIsAddScheduleOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating schedule";
      toast.error(msg);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockStartAt || !blockEndAt) {
      toast.error("Start and End timestamps are required");
      return;
    }

    const startDate = new Date(blockStartAt);
    const endDate = new Date(blockEndAt);
    if (startDate >= endDate) {
      toast.error("Start timestamp must be strictly before end timestamp");
      return;
    }

    try {
      setSavingBlock(true);
      const res = await fetch("/api/crm/schedules/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: blockDoctorId,
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          reason: blockReason.trim() || undefined,
          createdVia: "WEB",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create slot block");
      }

      toast.success("Doctor slot block registered");
      setIsAddBlockOpen(false);
      setBlockReason("");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating block";
      toast.error(msg);
    } finally {
      setSavingBlock(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Are you sure you want to remove this slot block?")) return;

    try {
      const res = await fetch(`/api/crm/schedules/blocks?id=${blockId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete slot block");
      }

      toast.success("Slot block removed");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting block";
      toast.error(msg);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm("Are you sure you want to delete this weekly recurring schedule?")) return;

    try {
      const res = await fetch(`/api/crm/schedules?id=${scheduleId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete schedule");
      }

      toast.success("Doctor schedule deleted");
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting schedule";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Subnavigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            Doctor Schedules & Slot Availability
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage recurring weekly OPD consultation hours and temporary slot blocking
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Link
            href="/settings/clinic"
            className="px-2.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-medium"
          >
            Clinic Profile
          </Link>
          <Link
            href="/settings/schedules"
            className="px-2.5 py-1.5 rounded-md bg-blue-50 text-blue-700 font-medium border border-blue-200"
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

      {/* Primary Tabs & Header Actions */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("schedules")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "schedules"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Recurring Weekly Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab("blocks")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === "blocks"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Doctor Slot Blocks & Leaves ({blocks.length})
          </button>
        </div>

        <div>
          {activeTab === "schedules" ? (
            <Button
              onClick={() => setIsAddScheduleOpen(true)}
              className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Weekly Schedule
            </Button>
          ) : (
            <Button
              onClick={() => setIsAddBlockOpen(true)}
              className="h-8 px-3 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <Ban className="h-3.5 w-3.5 mr-1" />
              Block Doctor Slot
            </Button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <Card className="border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading schedules & blocks...</div>
        ) : activeTab === "schedules" ? (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-700">Doctor ID</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Day of Week</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Operating Hours</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Slot Duration</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Status</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                    No recurring doctor schedules registered. Click &quot;Add Weekly Schedule&quot; to configure.
                  </TableCell>
                </TableRow>
              ) : (
                schedules.map((s) => (
                  <TableRow key={s.id} className="py-2.5">
                    <TableCell className="text-xs font-mono font-medium text-slate-900">
                      {s.doctorId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-700">
                      {DAY_NAMES[s.dayOfWeek]}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-800">
                      {s.startTime} — {s.endTime}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {s.slotDurationMins} minutes
                    </TableCell>
                    <TableCell>
                      {s.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">
                          Disabled
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteSchedule(s.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Delete recurring schedule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-xs font-semibold text-slate-700">Doctor ID</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Block Range (UTC)</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Reason</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700">Source</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">
                    No active slot blocks found. Doctors are available according to their standard weekly schedules.
                  </TableCell>
                </TableRow>
              ) : (
                blocks.map((b) => (
                  <TableRow key={b.id} className="py-2.5">
                    <TableCell className="text-xs font-mono font-medium text-slate-900">
                      {b.doctorId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-xs font-mono text-slate-800">
                      {new Date(b.startAt).toLocaleString("en-IN")} — {new Date(b.endAt).toLocaleTimeString("en-IN")}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {b.reason || "Scheduled Break / Leave"}
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-[10px]">
                        {b.createdVia}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBlock(b.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        title="Delete slot block"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Add Schedule Modal */}
      <Dialog open={isAddScheduleOpen} onOpenChange={setIsAddScheduleOpen}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Add Weekly Recurring Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Specify weekly consultation window for an OPD clinician
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateSchedule} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Doctor UUID
              </label>
              <Input
                value={newDoctorId}
                onChange={(e) => setNewDoctorId(e.target.value)}
                placeholder="Doctor UUID"
                className="h-9 text-[13px] font-mono"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Day of Week
                </label>
                <select
                  value={newDayOfWeek}
                  onChange={(e) => setNewDayOfWeek(Number(e.target.value))}
                  className="w-full h-9 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {DAY_NAMES.map((name, idx) => (
                    <option key={idx} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Slot Duration (Mins)
                </label>
                <Input
                  type="number"
                  min={5}
                  max={120}
                  value={newSlotDuration}
                  onChange={(e) => setNewSlotDuration(Number(e.target.value))}
                  className="h-9 text-[13px]"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Start Time (24h)
                </label>
                <Input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="h-9 text-[13px] font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  End Time (24h)
                </label>
                <Input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="h-9 text-[13px] font-mono"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddScheduleOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingSchedule}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {savingSchedule ? "Saving..." : "Create Schedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Slot Block Modal */}
      <Dialog open={isAddBlockOpen} onOpenChange={setIsAddBlockOpen}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-semibold text-slate-900">
              Block Doctor Slot / Leave
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Prevent appointments from being scheduled during this period
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateBlock} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Doctor UUID
              </label>
              <Input
                value={blockDoctorId}
                onChange={(e) => setBlockDoctorId(e.target.value)}
                placeholder="Doctor UUID"
                className="h-9 text-[13px] font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Start Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={blockStartAt}
                  onChange={(e) => setBlockStartAt(e.target.value)}
                  className="h-9 text-[13px]"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  End Date & Time
                </label>
                <Input
                  type="datetime-local"
                  value={blockEndAt}
                  onChange={(e) => setBlockEndAt(e.target.value)}
                  className="h-9 text-[13px]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Reason for Block
              </label>
              <Input
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="e.g. Academic Conference, Surgery, Lunch"
                className="h-9 text-[13px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddBlockOpen(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingBlock}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
              >
                {savingBlock ? "Blocking..." : "Confirm Slot Block"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
