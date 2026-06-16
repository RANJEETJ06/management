"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";

type Row = { key: string; value: string };

/**
 * Editor for arbitrary key/value pairs serialized to a jsonb object. Keeps its
 * own row state (so a half-typed key doesn't vanish) and emits the cleaned
 * object on every change — blank keys are dropped.
 */
export function CustomFieldsEditor({
  value,
  onChange,
  label = "Custom fields",
}: {
  value: Record<string, string>;
  onChange: (fields: Record<string, string>) => void;
  label?: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => {
    const init = Object.entries(value ?? {}).map(([key, v]) => ({
      key,
      value: String(v ?? ""),
    }));
    return init.length ? init : [{ key: "", value: "" }];
  });

  function commit(next: Row[]) {
    setRows(next);
    const obj: Record<string, string> = {};
    for (const r of next) {
      const k = r.key.trim();
      if (k) obj[k] = r.value;
    }
    onChange(obj);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="space-y-2">
        {rows.map((r, idx) => (
          <div key={idx} className="flex gap-2">
            <Input
              placeholder="Field name"
              value={r.key}
              onChange={(e) =>
                commit(rows.map((x, i) => (i === idx ? { ...x, key: e.target.value } : x)))
              }
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={r.value}
              onChange={(e) =>
                commit(rows.map((x, i) => (i === idx ? { ...x, value: e.target.value } : x)))
              }
              className="flex-1"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove field"
              onClick={() => {
                const next = rows.filter((_, i) => i !== idx);
                commit(next.length ? next : [{ key: "", value: "" }]);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRows([...rows, { key: "", value: "" }])}
      >
        <Plus className="h-4 w-4" /> Add field
      </Button>
    </div>
  );
}
