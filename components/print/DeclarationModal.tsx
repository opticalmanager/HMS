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
import { FileText, Check } from "lucide-react";

interface DeclarationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declaration: string;
  onSave: (val: string) => void;
}

export function DeclarationModal({
  open,
  onOpenChange,
  declaration,
  onSave,
}: DeclarationModalProps) {
  const [text, setText] = React.useState(declaration);

  React.useEffect(() => {
    setText(declaration);
  }, [declaration, open]);

  const handleSave = () => {
    onSave(text);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50">
          <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            Custom Clinical Declaration & Terms
          </DialogTitle>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Configure legal disclaimer, consent clause, or discharge declaration on printouts
          </p>
        </DialogHeader>

        <div className="p-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full text-xs font-mono p-2.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500 focus:outline-none"
            placeholder="Enter clinical disclaimer or consent clause..."
          />
        </div>

        <DialogFooter className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between sm:justify-between">
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
            type="button"
            size="sm"
            onClick={handleSave}
            className="bg-[#2563EB] hover:bg-blue-700 text-white text-xs h-8 gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Apply Declaration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
