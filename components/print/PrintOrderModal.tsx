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
import { GripVertical, Eye, EyeOff, ArrowUp, ArrowDown, Check } from "lucide-react";

export interface PrintOrderItem {
  id: string;
  label: string;
  visible: boolean;
}

interface PrintOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  items: PrintOrderItem[];
  onSave: (items: PrintOrderItem[]) => void;
}

export function PrintOrderModal({
  open,
  onOpenChange,
  title = "Print Order & Section Visibility",
  items,
  onSave,
}: PrintOrderModalProps) {
  const [currentItems, setCurrentItems] = React.useState<PrintOrderItem[]>(items);

  React.useEffect(() => {
    setCurrentItems(items);
  }, [items, open]);

  const moveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) return;

    const updated = [...currentItems];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    setCurrentItems(updated);
  };

  const toggleVisibility = (id: string) => {
    setCurrentItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, visible: !item.visible } : item))
    );
  };

  const handleSave = () => {
    onSave(currentItems);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-200 bg-slate-50 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-sm font-bold text-slate-900">{title}</DialogTitle>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Reorder print sections and toggle field visibility
            </p>
          </div>
        </DialogHeader>

        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-1.5">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex justify-between px-2">
            <span>Section / Field</span>
            <span>Order & Visibility</span>
          </div>

          {currentItems.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50/80 transition-colors"
            >
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-slate-400" />
                <span
                  className={`text-[13px] font-medium ${
                    item.visible ? "text-slate-800" : "text-slate-400 line-through"
                  }`}
                >
                  {item.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === 0}
                  onClick={() => moveItem(idx, "up")}
                  className="h-7 w-7 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={idx === currentItems.length - 1}
                  onClick={() => moveItem(idx, "down")}
                  className="h-7 w-7 text-slate-500 hover:text-slate-900 disabled:opacity-30"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => toggleVisibility(item.id)}
                  className={`h-7 w-7 ${
                    item.visible ? "text-blue-600 hover:bg-blue-50" : "text-slate-400 hover:bg-slate-100"
                  }`}
                >
                  {item.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
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
            Save Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
