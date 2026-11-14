"use client";

import * as React from "react";
import { Search, Plus, X, Stethoscope } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { searchIcd10, type Icd10Code } from "@/utils/icd10";
import type { DiagnosisEntry } from "@/types/hms";

interface Icd10SearchComboboxProps {
  selectedDiagnoses: DiagnosisEntry[];
  onChange: (diagnoses: DiagnosisEntry[]) => void;
}

export function Icd10SearchCombobox({
  selectedDiagnoses,
  onChange,
}: Icd10SearchComboboxProps) {
  const [query, setQuery] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);

  const results = React.useMemo(() => searchIcd10(query, 6), [query]);

  const addDiagnosis = (code: Icd10Code) => {
    if (selectedDiagnoses.some((d) => d.icdCode === code.code)) return;
    onChange([
      ...selectedDiagnoses,
      {
        icdCode: code.code,
        description: code.description,
        type: "provisional",
      },
    ]);
    setQuery("");
    setIsOpen(false);
  };

  const removeDiagnosis = (code: string) => {
    onChange(selectedDiagnoses.filter((d) => d.icdCode !== code));
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search ICD-10 diagnosis (e.g. Hypertension, Dengue, Type 2 Diabetes, I10)..."
            className="pl-9 text-sm"
          />
        </div>

        {isOpen && query.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg p-1">
            {results.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">
                No ICD-10 code found matching &ldquo;{query}&rdquo;
              </div>
            ) : (
              results.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => addDiagnosis(item)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-slate-50 text-left transition-colors text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px] bg-blue-50 text-[#2563EB]">
                      {item.code}
                    </Badge>
                    <span className="font-medium text-slate-900">{item.description}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{item.category}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected diagnoses pill badges */}
      {selectedDiagnoses.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {selectedDiagnoses.map((diag) => (
            <div
              key={diag.icdCode}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs text-[#2563EB]"
            >
              <Stethoscope className="h-3.5 w-3.5 text-[#2563EB]" />
              <span className="font-semibold font-mono">{diag.icdCode}</span>
              <span className="text-slate-700">{diag.description}</span>
              <button
                type="button"
                onClick={() => removeDiagnosis(diag.icdCode)}
                className="hover:text-red-600 transition-colors ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
