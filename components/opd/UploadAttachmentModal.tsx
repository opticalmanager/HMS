"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clinicalStore } from "@/services/clinical-store";
import type { ClinicalAttachment, AttachmentCategory } from "@/types/hms";
import { Upload, Paperclip, FileText, Image as ImageIcon, Check, AlertCircle } from "lucide-react";

interface UploadAttachmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  patientId: string;
  patientName: string;
}

export function UploadAttachmentModal({
  open,
  onOpenChange,
  appointmentId,
  patientId,
  patientName,
}: UploadAttachmentModalProps) {
  const [fileName, setFileName] = React.useState("");
  const [category, setCategory] = React.useState<AttachmentCategory>("lab");
  const [notes, setNotes] = React.useState("");
  const [fileType, setFileType] = React.useState("application/pdf");
  const [fileSize, setFileSize] = React.useState(1024 * 350); // ~350 KB default
  const [isUploading, setIsUploading] = React.useState(false);

  const handleSimulateFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileType(file.type || "application/pdf");
      setFileSize(file.size);
    }
  };

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      alert("Please specify a document or file name.");
      return;
    }

    setIsUploading(true);

    const attachment: ClinicalAttachment = {
      id: `att-${Date.now()}`,
      appointmentId,
      patientId,
      fileName: fileName.trim(),
      fileSize,
      fileType,
      fileUrl: "/placeholder-scan.png",
      category,
      notes: notes.trim() || undefined,
      uploadedAt: new Date().toISOString(),
    };

    clinicalStore.addClinicalAttachment(attachment);

    setIsUploading(false);
    setFileName("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 flex flex-col">
        <DialogHeader className="p-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-300">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-slate-900">
                Upload Clinical Document
              </DialogTitle>
              <p className="text-[11px] text-slate-500">
                Attach reports, scans, or past prescriptions for {patientName}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleUpload} className="p-4 space-y-3.5 text-xs">
          {/* File Selector Dropzone */}
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center hover:bg-slate-50/50 transition-colors relative">
            <input
              type="file"
              onChange={handleSimulateFileSelect}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
              <Upload className="h-6 w-6 text-slate-400" />
              <div className="text-slate-700 font-semibold text-xs">
                {fileName ? fileName : "Click or drag document to upload"}
              </div>
              <div className="text-[10px] text-slate-400">
                Supports PDF, PNG, JPG, DICOM scans (Max 10MB)
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-700 block mb-1">
              Document Display Name *
            </label>
            <Input
              required
              placeholder="e.g. Corneal Topography Pentacam Scan.pdf"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Document Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AttachmentCategory)}
                className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800"
              >
                <option value="lab">Lab Diagnostic Report</option>
                <option value="radiology">Radiology / Ophthalmic Scan</option>
                <option value="prescription">External Prescription</option>
                <option value="clinical_photo">Clinical Photo / Biomicroscopy</option>
                <option value="other">General Medical Record</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">
                Estimated File Size
              </label>
              <div className="h-8 rounded-md border border-slate-200 bg-slate-50 px-2.5 flex items-center text-slate-600 text-[11px] font-mono">
                {(fileSize / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600 block mb-1">
              Clinical Findings / Notes
            </label>
            <Input
              placeholder="e.g. Left eye steepening noted, referred from Lajpatnagar"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={isUploading}
              className="text-xs h-8 gap-1.5 bg-[#1976D2] hover:bg-blue-700 text-white"
            >
              <Check className="h-3.5 w-3.5" /> Attach Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
