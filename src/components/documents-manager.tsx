"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DOC_TYPES, docTypeLabel, formatBytes } from "@/lib/tickets";
import { FEATURE_FLOORS } from "@/lib/levels";
import { Upload, Download, Trash2, FilePlus2, FileText, History } from "lucide-react";
import type { DocType } from "@/lib/types";

export type DocVersion = {
  version: number;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
};

export type DocCard = {
  id: string;
  name: string;
  doc_type: DocType;
  contact_id: string | null;
  account_id: string | null;
  deal_id: string | null;
  ticket_id: string | null;
  created_at: string;
  latest: DocVersion | null;
  versionCount: number;
};

type Opt = { id: string; name: string };
type Prefill = {
  contact_id?: string;
  account_id?: string;
  deal_id?: string;
  ticket_id?: string;
};

const BUCKET = "documents";
const safeName = (n: string) => n.replace(/[^\w.\-]+/g, "_");

export function DocumentsManager({
  orgId,
  initialDocs,
  contacts,
  accounts,
  prefill = {},
}: {
  orgId: string;
  initialDocs: DocCard[];
  contacts: Opt[];
  accounts: Opt[];
  prefill?: Prefill;
}) {
  const supabase = createClient();
  const [docs, setDocs] = useState(initialDocs);
  const [filter, setFilter] = useState<"all" | DocType>("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: "",
    doc_type: "other" as DocType,
    contact_id: prefill.contact_id ?? "",
    account_id: prefill.account_id ?? "",
  });

  const shown = useMemo(
    () => (filter === "all" ? docs : docs.filter((d) => d.doc_type === filter)),
    [docs, filter]
  );

  async function uploadNew(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setBusy(true);
    setError("");

    const { data: doc, error: dErr } = await (supabase.from("documents") as any)
      .insert({
        org_id: orgId,
        name: form.name.trim() || file.name,
        doc_type: form.doc_type,
        contact_id: form.contact_id || null,
        account_id: form.account_id || null,
        deal_id: prefill.deal_id || null,
        ticket_id: prefill.ticket_id || null,
        min_level: FEATURE_FLOORS.documents,
      })
      .select("id, name, doc_type, contact_id, account_id, deal_id, ticket_id, created_at")
      .single();
    if (dErr || !doc) {
      setError(dErr?.message ?? "Could not create document.");
      setBusy(false);
      return;
    }

    const path = `${orgId}/${doc.id}/1_${safeName(file.name)}`;
    const { error: uErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
    });
    if (uErr) {
      await (supabase.from("documents") as any).delete().eq("id", doc.id);
      setError(`Upload failed: ${uErr.message}`);
      setBusy(false);
      return;
    }

    const version: DocVersion = {
      version: 1,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    };
    const { error: vErr } = await (supabase.from("document_versions") as any).insert({
      document_id: doc.id,
      ...version,
    });
    if (vErr) {
      setError(vErr.message);
      setBusy(false);
      return;
    }

    setDocs((ds) => [{ ...(doc as any), latest: version, versionCount: 1 }, ...ds]);
    setForm({ name: "", doc_type: "other", contact_id: form.contact_id, account_id: form.account_id });
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
  }

  async function addVersion(doc: DocCard, file: File) {
    setError("");
    const next = (doc.latest?.version ?? doc.versionCount) + 1;
    const path = `${orgId}/${doc.id}/${next}_${safeName(file.name)}`;
    const { error: uErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: false,
    });
    if (uErr) {
      setError(`Upload failed: ${uErr.message}`);
      return;
    }
    const version: DocVersion = {
      version: next,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    };
    const { error: vErr } = await (supabase.from("document_versions") as any).insert({
      document_id: doc.id,
      ...version,
    });
    if (vErr) {
      setError(vErr.message);
      return;
    }
    setDocs((ds) =>
      ds.map((d) =>
        d.id === doc.id ? { ...d, latest: version, versionCount: d.versionCount + 1 } : d
      )
    );
  }

  async function download(path: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
    if (error || !data) {
      setError(error?.message ?? "Could not generate download link.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(doc: DocCard) {
    if (!confirm(`Delete "${doc.name}" and all its versions?`)) return;
    const prev = docs;
    setDocs((ds) => ds.filter((d) => d.id !== doc.id));
    if (doc.latest) {
      await supabase.storage.from(BUCKET).remove([doc.latest.storage_path]);
    }
    const { error } = await (supabase.from("documents") as any).delete().eq("id", doc.id);
    if (error) {
      setError(error.message);
      setDocs(prev);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4">
          <form onSubmit={uploadNew} className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="doc-name">Name</Label>
                <Input
                  id="doc-name"
                  placeholder="Defaults to the file name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-type">Type</Label>
                <Select
                  id="doc-type"
                  value={form.doc_type}
                  onChange={(e) => setForm({ ...form, doc_type: e.target.value as DocType })}
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-contact">Contact</Label>
                <Select
                  id="doc-contact"
                  value={form.contact_id}
                  onChange={(e) => setForm({ ...form, contact_id: e.target.value })}
                >
                  <option value="">— None —</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-account">Account</Label>
                <Select
                  id="doc-account"
                  value={form.account_id}
                  onChange={(e) => setForm({ ...form, account_id: e.target.value })}
                >
                  <option value="">— None —</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {(prefill.ticket_id || prefill.deal_id) && (
              <p className="text-xs text-muted-foreground">
                Linking to the {prefill.ticket_id ? "ticket" : "deal"} you came from.
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input ref={fileRef} type="file" className="sm:flex-1" />
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">
                <Upload className="h-4 w-4" /> {busy ? "Uploading…" : "Upload document"}
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" />
        {DOC_TYPES.map((t) => (
          <FilterChip
            key={t.key}
            active={filter === t.key}
            onClick={() => setFilter(t.key)}
            label={t.label}
          />
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No documents yet.</p>
      ) : (
        <div className="space-y-1.5">
          {shown.map((d) => (
            <div key={d.id} className="group flex items-start gap-3 rounded-md border bg-card p-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{d.name}</span>
                  <Badge variant="secondary">{docTypeLabel(d.doc_type)}</Badge>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {d.latest && <span>{d.latest.file_name}</span>}
                  {d.latest?.size_bytes != null && <span>{formatBytes(d.latest.size_bytes)}</span>}
                  <span className="inline-flex items-center gap-1">
                    <History className="h-3 w-3" /> v{d.latest?.version ?? d.versionCount} ·{" "}
                    {d.versionCount} version{d.versionCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {d.latest && (
                  <button
                    onClick={() => download(d.latest!.storage_path)}
                    aria-label="Download"
                    className="rounded p-1.5 text-muted-foreground hover:text-foreground"
                    title="Download latest"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
                <label
                  className="cursor-pointer rounded p-1.5 text-muted-foreground hover:text-foreground"
                  title="Upload new version"
                >
                  <FilePlus2 className="h-4 w-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) addVersion(d, f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={() => remove(d)}
                  aria-label="Delete"
                  className="rounded p-1.5 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors " +
        (active
          ? "border-primary bg-primary/[0.08] text-primary"
          : "text-muted-foreground hover:bg-accent")
      }
    >
      {label}
    </button>
  );
}
