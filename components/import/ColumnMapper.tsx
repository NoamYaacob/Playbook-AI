"use client";

// ---------------------------------------------------------------------------
// ColumnMapper – maps CSV headers to internal trade fields
// ---------------------------------------------------------------------------

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldDef {
  key: string;
  label: string;
  description: string;
  required: boolean;
}

export interface ColumnMapperProps {
  csvHeaders: string[];
  /** Preview data rows (first N rows from CSV) */
  previewRows: Record<string, string>[];
  internalFields: FieldDef[];
  value: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ColumnMapper({
  csvHeaders,
  previewRows,
  internalFields,
  value,
  onChange,
}: ColumnMapperProps) {
  function handleSelect(fieldKey: string, csvColumn: string) {
    const next = { ...value };
    if (csvColumn === "__none__") {
      delete next[fieldKey];
    } else {
      next[fieldKey] = csvColumn;
    }
    onChange(next);
  }

  function getPreviewValues(csvColumn: string): string[] {
    return previewRows
      .slice(0, 3)
      .map((row) => row[csvColumn] ?? "")
      .filter(Boolean);
  }

  const requiredFields = internalFields.filter((f) => f.required);
  const optionalFields = internalFields.filter((f) => !f.required);

  function renderGroup(fields: FieldDef[], title: string) {
    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          {title}
        </h3>
        <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
          {fields.map((field) => {
            const selectedCol = value[field.key];
            const preview = selectedCol ? getPreviewValues(selectedCol) : [];

            return (
              <div
                key={field.key}
                className={cn(
                  "grid grid-cols-[1fr_1fr] gap-4 p-3 items-start bg-slate-900/50",
                  "hover:bg-slate-900/80 transition-colors",
                )}
              >
                {/* Internal field info */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">
                      {field.label}
                    </span>
                    {field.required ? (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        Required
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-slate-500">
                        Optional
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{field.description}</p>
                </div>

                {/* CSV column selector + preview */}
                <div className="min-w-0 space-y-1.5">
                  <Select
                    value={selectedCol ?? "__none__"}
                    onValueChange={(v) => handleSelect(field.key, v)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-700">
                      <SelectValue placeholder="— not mapped —" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-700 max-h-56">
                      <SelectItem value="__none__" className="text-slate-400 text-xs">
                        — not mapped —
                      </SelectItem>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h} className="text-xs">
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {preview.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {preview.map((v, i) => (
                        <span
                          key={i}
                          className="inline-block bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono max-w-[120px] truncate"
                          title={v}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      {renderGroup(requiredFields, "Required Fields")}
      {renderGroup(optionalFields, "Optional Fields")}
    </div>
  );
}
