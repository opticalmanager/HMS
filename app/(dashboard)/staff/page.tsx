"use client";

import * as React from "react";
import { Users2, Plus, Search, ShieldCheck, Check, X, ShieldAlert, Award, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddStaffModal } from "@/components/staff/AddStaffModal";
import { useClinicalStore, clinicalStore, type RbacRole, type RbacPermission } from "@/services/clinical-store";

const RBAC_ROLES_LIST: Array<{ role: RbacRole; label: string }> = [
  { role: "super_admin", label: "Super Admin" },
  { role: "hospital_admin", label: "Hospital Admin" },
  { role: "medical_director", label: "Medical Director" },
  { role: "senior_consultant", label: "Senior Consultant" },
  { role: "junior_resident", label: "Junior Resident" },
  { role: "chief_nursing_officer", label: "Chief Nursing Officer" },
  { role: "staff_nurse", label: "Staff Nurse" },
  { role: "pharmacist", label: "Pharmacist" },
  { role: "chief_cashier", label: "Chief Cashier" },
  { role: "receptionist", label: "Receptionist" },
  { role: "lab_technician", label: "Lab Technician" },
  { role: "radiologist", label: "Radiologist" },
];

const RBAC_PERMISSIONS_LIST: Array<{ perm: RbacPermission; label: string }> = [
  { perm: "view_phi", label: "View PHI" },
  { perm: "edit_clinical_emr", label: "Edit EMR" },
  { perm: "prescribe_medications", label: "Prescribe Rx" },
  { perm: "ipd_admission_discharge", label: "Admit / Discharge" },
  { perm: "dispense_pharmacy", label: "Dispense Meds" },
  { perm: "billing_collections", label: "Bill & Collect" },
  { perm: "issue_discounts", label: "Issue Discounts" },
  { perm: "cancel_invoices", label: "Cancel Invoices" },
  { perm: "view_financial_reports", label: "Financial Reports" },
  { perm: "manage_staff", label: "Manage Staff" },
  { perm: "system_configuration", label: "System Config" },
  { perm: "export_audit_logs", label: "Audit Logs Export" },
];

export default function StaffPage() {
  const store = useClinicalStore();
  const [activeTab, setActiveTab] = React.useState("directory");
  const [search, setSearch] = React.useState("");
  const [addModalOpen, setAddModalOpen] = React.useState(false);

  const staffMembers = store.staff;
  const rbacMatrix = store.rbacMatrix;

  const handleTogglePermission = (role: RbacRole, perm: RbacPermission) => {
    const currentValue = rbacMatrix[role]?.[perm] ?? false;
    clinicalStore.updateRbacPermission(role, perm, !currentValue);
  };

  const handleToggleStaffStatus = (id: string) => {
    clinicalStore.toggleStaffStatus(id);
  };

  const filtered = staffMembers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.department.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase()) ||
      s.license.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Staff & RBAC Management</h1>
          <p className="text-xs text-slate-500">
            Medical council licenses, practitioner credentials, and 12-role granular permission matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="directory">Staff Directory ({staffMembers.length})</TabsTrigger>
              <TabsTrigger value="matrix">12-Role RBAC Matrix</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="bg-[#2563EB] hover:bg-blue-700 text-xs gap-1.5 font-semibold ml-2"
          >
            <Plus className="h-3.5 w-3.5" /> Add Staff Member
          </Button>
        </div>
      </div>

      {activeTab === "directory" ? (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by doctor name, department, role, or license..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name & Title</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Medical License / Council Reg No</TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Contact Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="font-semibold text-slate-900 text-xs">{member.name}</div>
                      <div className="text-[11px] text-slate-400">{member.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-[10px] font-medium bg-slate-50">
                        {member.role.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium text-slate-700 text-xs">{member.department}</TableCell>
                    <TableCell className="font-mono text-xs font-bold text-[#2563EB]">
                      {member.license}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{member.qualification}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-600">{member.phone}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "success" : "danger"}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleStaffStatus(member.id)}
                        className={`h-7 text-xs gap-1 ${
                          member.status === "active" ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <Power className="h-3 w-3" />
                        {member.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : (
        /* Tab 2: 12-Role RBAC Matrix */
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              12-Role Granular Permission Security Matrix
            </CardTitle>
            <CardDescription className="text-xs">
              Click any checkbox to immediately grant or revoke granular permissions per clinical and administrative role
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="p-3 font-bold sticky left-0 bg-slate-100 z-10 w-44">Hospital Role</th>
                  {RBAC_PERMISSIONS_LIST.map((p) => (
                    <th key={p.perm} className="p-2 text-center text-[10px] uppercase font-bold tracking-tight whitespace-nowrap">
                      {p.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {RBAC_ROLES_LIST.map((r) => (
                  <tr key={r.role} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-semibold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 whitespace-nowrap">
                      {r.label}
                    </td>
                    {RBAC_PERMISSIONS_LIST.map((p) => {
                      const isChecked = rbacMatrix[r.role]?.[p.perm] ?? false;
                      return (
                        <td key={p.perm} className="p-2 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(r.role, p.perm)}
                            className="h-4 w-4 rounded text-blue-600 cursor-pointer focus:ring-blue-500"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Add Staff Modal */}
      <AddStaffModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />
    </div>
  );
}
