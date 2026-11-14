"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stethoscope, PlayCircle, CheckCircle2 } from "lucide-react";
import type { Appointment } from "@/types/hms";

interface OpdQueueTableProps {
  queue: Appointment[];
  activePatientId?: string;
  onStartConsultation: (appointment: Appointment) => void;
}

export function OpdQueueTable({
  queue,
  activePatientId,
  onStartConsultation,
}: OpdQueueTableProps) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16 text-center">Token</TableHead>
            <TableHead>Patient Details</TableHead>
            <TableHead>UHID</TableHead>
            <TableHead>Time Slot</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {queue.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                No patients currently waiting in OPD queue.
              </TableCell>
            </TableRow>
          ) : (
            queue.map((item) => {
              const isSelected = activePatientId === item.patientId;
              return (
                <TableRow key={item.id} className={isSelected ? "bg-blue-50/60" : undefined}>
                  <TableCell className="text-center font-bold font-mono text-base text-[#2563EB]">
                    #{item.tokenNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{item.patientName}</div>
                    <div className="text-xs text-slate-500">{item.patientPhone}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {item.patientUhid || "UHID-2026-0001"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 font-medium">{item.timeSlot}</TableCell>
                  <TableCell>
                    {item.priority === "emergency" ? (
                      <Badge variant="danger">Emergency</Badge>
                    ) : item.priority === "urgent" ? (
                      <Badge variant="warning">Urgent</Badge>
                    ) : (
                      <Badge variant="outline">Normal</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.status === "in_consultation" ? (
                      <Badge variant="info">In Room</Badge>
                    ) : item.status === "completed" ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Badge variant="outline">Waiting</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      onClick={() => onStartConsultation(item)}
                      size="sm"
                      variant={isSelected ? "default" : "outline"}
                      className="h-8 text-xs gap-1.5"
                    >
                      <Stethoscope className="h-3.5 w-3.5" />
                      {isSelected ? "Active" : "Consult"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
