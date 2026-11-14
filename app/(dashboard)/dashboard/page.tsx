"use client";

import * as React from "react";
import Link from "next/link";
import {
  Users,
  Stethoscope,
  BedDouble,
  Receipt,
  CalendarDays,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  TrendingUp,
  Activity,
  Award,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrencyINR } from "@/utils/formatting";
import { useClinicalStore } from "@/services/clinical-store";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const REVENUE_DATA = [
  { day: "Mon", revenue: 112000, footfall: 38 },
  { day: "Tue", revenue: 135000, footfall: 44 },
  { day: "Wed", revenue: 128000, footfall: 41 },
  { day: "Thu", revenue: 148500, footfall: 49 },
  { day: "Fri", revenue: 162000, footfall: 56 },
  { day: "Sat", revenue: 174000, footfall: 62 },
  { day: "Sun", revenue: 98000, footfall: 32 },
];

export default function DashboardPage() {
  const store = useClinicalStore();
  const [selectedKpi, setSelectedKpi] = React.useState<string>("all");

  const todayAppointments = store.appointments;
  const activeConsults = store.appointments.filter((a) => a.status === "in_consultation");
  const occupiedBeds = store.beds.filter((b) => b.status === "occupied");
  const totalBeds = store.beds.length;
  const occupancyPercent = totalBeds > 0 ? Math.round((occupiedBeds.length / totalBeds) * 100) : 0;
  const totalBilling = store.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

  const KPIS = [
    {
      id: "appointments",
      title: "Today's Appointments",
      value: String(todayAppointments.length),
      sub: `${todayAppointments.filter((a) => a.priority === "urgent" || a.priority === "emergency").length} urgent/emergency`,
      icon: CalendarDays,
      color: "text-blue-600 bg-blue-50",
    },
    {
      id: "opd",
      title: "Active OPD Consults",
      value: String(activeConsults.length),
      sub: "Avg consult time: 11 mins",
      icon: Stethoscope,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      id: "ipd",
      title: "IPD Bed Occupancy",
      value: `${occupancyPercent}%`,
      sub: `${occupiedBeds.length} of ${totalBeds} beds occupied`,
      icon: BedDouble,
      color: "text-amber-600 bg-amber-50",
    },
    {
      id: "billing",
      title: "Daily Billing Volume",
      value: formatCurrencyINR(totalBilling),
      sub: `${store.invoices.length} invoices generated`,
      icon: Receipt,
      color: "text-indigo-600 bg-indigo-50",
    },
  ];

  // Doctor productivity metrics
  const DOCTORS_PRODUCTIVITY = [
    {
      id: "doc-1",
      name: "Dr. Gaurav Kumar",
      dept: "Cardiology",
      todayConsults: 14,
      avgConsultMins: "10.5m",
      ipdRounds: 4,
      revenueGenerated: 28400,
      rating: "4.9 ★",
    },
    {
      id: "doc-2",
      name: "Dr. Ananya Sharma",
      dept: "General Medicine",
      todayConsults: 18,
      avgConsultMins: "8.2m",
      ipdRounds: 6,
      revenueGenerated: 19500,
      rating: "4.8 ★",
    },
    {
      id: "doc-3",
      name: "Dr. Rajesh Varma",
      dept: "Orthopedics",
      todayConsults: 11,
      avgConsultMins: "14.0m",
      ipdRounds: 3,
      revenueGenerated: 34200,
      rating: "4.9 ★",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical Executive Dashboard</h1>
          <p className="text-xs text-slate-500">Live hospital census, OPD queue status, and ward throughput</p>
        </div>

        <div className="flex items-center gap-2">
          {selectedKpi !== "all" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedKpi("all")}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Clear Filter
            </Button>
          )}
          <Link href="/appointments">
            <Button size="sm" variant="outline" className="text-xs gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> Book Slot
            </Button>
          </Link>
          <Link href="/opd">
            <Button size="sm" className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5">
              <Stethoscope className="h-3.5 w-3.5" /> Start OPD Session
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid with Interactive Outline Filter State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          const isSelected = selectedKpi === kpi.id;
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => setSelectedKpi(isSelected ? "all" : kpi.id)}
              className={`text-left p-4 rounded-xl border bg-white transition-all cursor-pointer ${
                isSelected
                  ? "border-2 border-[#2563EB] shadow-md scale-[1.01] ring-2 ring-blue-100"
                  : "border-slate-200 hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-slate-500">{kpi.title}</span>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{kpi.value}</div>
              <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
            </button>
          );
        })}
      </div>

      {/* Revenue & Footfall Throughput Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#2563EB]" />
                Weekly Hospital Revenue & Patient Footfall Trends
              </CardTitle>
              <p className="text-xs text-slate-500">Net billed revenue (₹) across departments with daily footfall</p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">Past 7 Days</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      name === "revenue" ? formatCurrencyINR(Number(value)) : `${value} Patients`,
                      name === "revenue" ? "Daily Revenue" : "Footfall",
                    ]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563EB"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#revenueGrad)"
                    name="revenue"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Patient Footfall Distribution Bar Chart */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              Daily Patient Check-ins
            </CardTitle>
            <p className="text-xs text-slate-500">Triage volume by day</p>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REVENUE_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: any) => [`${val} Patients`, "Footfall"]}
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="footfall" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column Split: Filtered Live Queue & Doctor Productivity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Queue / Invoices Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900">
                  {selectedKpi === "billing"
                    ? "Today's Hospital Invoices"
                    : selectedKpi === "ipd"
                    ? "Current Inpatient (IPD) Occupancy"
                    : "Today's Active OPD Triage Queue"}
                </CardTitle>
                <p className="text-xs text-slate-500">
                  {selectedKpi === "all" ? "Showing all real-time patient queue records" : `Filtered by: ${selectedKpi.toUpperCase()}`}
                </p>
              </div>
              <Link href={selectedKpi === "billing" ? "/billing" : selectedKpi === "ipd" ? "/ipd" : "/opd"} className="text-xs text-[#2563EB] font-semibold flex items-center hover:underline">
                View Full Module <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {selectedKpi === "billing" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Grand Total</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-bold text-[#2563EB]">{inv.invoiceNumber}</TableCell>
                        <TableCell className="font-semibold text-slate-900 text-xs">{inv.patientName}</TableCell>
                        <TableCell className="text-xs uppercase font-medium text-slate-600">{inv.paymentMode}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 text-xs">{formatCurrencyINR(inv.grandTotal)}</TableCell>
                        <TableCell>
                          <Badge variant={inv.paymentStatus === "paid" ? "success" : "warning"}>{inv.paymentStatus}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : selectedKpi === "ipd" ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bed #</TableHead>
                      <TableHead>Ward</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead className="text-right">Daily Rate</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {store.beds.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-xs text-slate-900">{b.bedNumber}</TableCell>
                        <TableCell className="text-xs text-slate-600">{b.wardName}</TableCell>
                        <TableCell className="text-xs font-semibold text-slate-900">{b.patientName || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs text-slate-700">{formatCurrencyINR(b.dailyRate)}</TableCell>
                        <TableCell>
                          <Badge variant={b.status === "occupied" ? "danger" : b.status === "available" ? "success" : "warning"}>
                            {b.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="divide-y divide-slate-100">
                  {store.appointments.map((item) => (
                    <div key={item.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center font-mono font-bold text-sm">
                          #{item.tokenNumber}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-900">{item.patientName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {item.patientUhid} • {item.doctorName} ({item.department})
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Badge variant={item.priority === "emergency" ? "danger" : item.priority === "urgent" ? "warning" : "outline"}>
                          {item.priority}
                        </Badge>
                        <Badge variant={item.status === "in_consultation" ? "info" : item.status === "completed" ? "success" : "outline"}>
                          {item.status}
                        </Badge>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> {item.timeSlot}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Doctor Productivity Metrics Column */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="h-4 w-4 text-amber-500" />
                Doctor Productivity Leaderboard
              </CardTitle>
              <p className="text-xs text-slate-500">Today&apos;s consult speed, rounds, and billings</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 text-xs">
                {DOCTORS_PRODUCTIVITY.map((doc) => (
                  <div key={doc.id} className="p-3.5 space-y-2 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900">{doc.name}</div>
                        <div className="text-[11px] text-slate-500">{doc.dept}</div>
                      </div>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 font-semibold border-amber-200">
                        {doc.rating}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block">Consults</span>
                        <span className="font-bold text-slate-900">{doc.todayConsults} pts</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block">Avg Pace</span>
                        <span className="font-bold text-slate-900">{doc.avgConsultMins}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">Revenue</span>
                        <span className="font-bold text-emerald-600">{formatCurrencyINR(doc.revenueGenerated)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Connected Gateways Status */}
          <Card className="border-slate-200">
            <CardContent className="p-3.5 space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-emerald-900">ABDM Sandbox Linked</div>
                  <div className="text-[11px] text-emerald-700">HIP ID: IN01100001 (FHIR R4 Bundles Active)</div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-900">Meta WhatsApp Cloud API v20+</div>
                  <div className="text-[11px] text-blue-700">Official verified number ID 100000000000001</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
