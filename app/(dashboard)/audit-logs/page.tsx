"use client";

import * as React from "react";
import { ShieldAlert, Search, Filter, Lock, Download, Eye, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useClinicalStore, type AuditLogItem } from "@/services/clinical-store";
import { AuditEventModal } from "@/components/audit/AuditEventModal";
import { exportToCsv } from "@/utils/csv-export";

export default function AuditLogsPage() {
  const store = useClinicalStore();
  const [search, setSearch] = React.useState("");
  const [moduleFilter, setModuleFilter] = React.useState("all");
  const [actionFilter, setActionFilter] = React.useState("all");

  const [inspectModalOpen, setInspectModalOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<AuditLogItem | null>(null);

  const logs = store.auditLogs;

  const handleInspect = (event: AuditLogItem) => {
    setSelectedEvent(event);
    setInspectModalOpen(true);
  };

  const handleExportCsv = () => {
    exportToCsv("hms_security_audit_trail", [
      { header: "Event ID", accessor: "id" },
      { header: "Timestamp", accessor: "timestamp" },
      { header: "Actor", accessor: "actor" },
      { header: "Role", accessor: "role" },
      { header: "Action", accessor: "action" },
      { header: "Module", accessor: "module" },
      { header: "Target Entity", accessor: "entity" },
      { header: "IP Address", accessor: "ip" },
      { header: "Audit Notes", accessor: "notes" },
    ], logs);
  };

  const filtered = logs.filter((l) => {
    const matchesSearch =
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.entity.toLowerCase().includes(search.toLowerCase()) ||
      l.notes.toLowerCase().includes(search.toLowerCase());

    const matchesModule = moduleFilter === "all" || l.module.toLowerCase() === moduleFilter.toLowerCase();
    const matchesAction = actionFilter === "all" || l.action.toLowerCase().includes(actionFilter.toLowerCase());

    return matchesSearch && matchesModule && matchesAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clinical & Security Audit Trail</h1>
          <p className="text-xs text-slate-500">
            Immutable HIPAA / DISHA compliance logs, PHI access, and financial overrides
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportCsv}
            variant="outline"
            className="text-xs gap-1.5 border-slate-300"
          >
            <Download className="h-3.5 w-3.5" /> Export Audit Log (CSV)
          </Button>

          <Badge variant="outline" className="text-xs gap-1.5 px-3 py-1 bg-slate-50">
            <Lock className="h-3.5 w-3.5 text-slate-500" /> Tamper-Proof Audit Vault
          </Badge>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search actor, action, entity, or details..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-700"
        >
          <option value="all">All Modules</option>
          <option value="opd">OPD Consultations</option>
          <option value="ipd">IPD Admissions & MAR</option>
          <option value="billing">Billing & Invoicing</option>
          <option value="inventory">Pharmacy & Inventory</option>
          <option value="patients">Patients Registry</option>
          <option value="staff">Staff & RBAC</option>
          <option value="settings">Hospital Settings</option>
        </select>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-slate-200 bg-white text-xs text-slate-700 font-mono"
        >
          <option value="all">All Actions</option>
          <option value="PRESCRIBE">PRESCRIBE_MEDICATION</option>
          <option value="INVOICE">CREATE_INVOICE</option>
          <option value="PHI">VIEW_PHI</option>
          <option value="ADMIT">ADMIT_PATIENT</option>
          <option value="MAR">NURSE_ROUND_MAR</option>
          <option value="STOCK">ADJUST_STOCK / GRN</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User / Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Audit Details</TableHead>
              <TableHead className="text-right">Inspect</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                  No audit trail records found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-xs">{log.actor}</div>
                    <div className="text-[10px] text-slate-400">{log.role}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] bg-slate-50">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="uppercase text-xs font-semibold text-slate-600">
                    {log.module}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#2563EB] font-bold">
                    {log.entity}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{log.ip}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-xs truncate">{log.notes}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleInspect(log)}
                      className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="h-3 w-3" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Audit Event Detail Inspection Modal */}
      <AuditEventModal
        open={inspectModalOpen}
        onOpenChange={setInspectModalOpen}
        event={selectedEvent}
      />
    </div>
  );
}
