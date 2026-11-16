"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";
import { ArrowLeft, CheckCircle2, FileUp, X } from "lucide-react";
import { OwnLayout, PageHead, GlassStats, Sheet, SheetTitle, SheetFooter, btn, field, table, tableWrap } from "@/components/admin/ui";

interface ImportRow {
  name: string;
  email: string;
  phone: string;
}

const CSV_NAME_KEYS = ["name", "full name", "fullname", "guest name", "guestname", "first name", "firstname"];
const CSV_EMAIL_KEYS = ["email", "email address", "emailaddress", "e-mail"];
const CSV_PHONE_KEYS = ["phone", "mobile", "tel", "telephone", "phone number", "mobile number"];

/** Every guest is keyed by email, so that's the one field a row can't do without. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const hasEmail = (r: ImportRow) => EMAIL.test(r.email.trim());

function findKey(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(h.toLowerCase().trim()));
}

export default function GuestImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number; noEmail?: number } | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = `${field} !h-9 !px-3.5`;

  function updateRow(idx: number, field: keyof ImportRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleFile(file: File) {
    setParseError("");
    setResult(null);
    setImportError("");
    setFileName(file.name);
    setRows([]);

    if (file.name.toLowerCase().endsWith(".pdf")) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch("/api/admin/guests/import", { method: "POST", body: formData });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setParseError(data.error || "Could not read this PDF."); return; }
        setRows(data.rows || []);
        if ((data.rows || []).length === 0) setParseError("No email addresses found in this PDF. Try a CSV instead.");
      } catch {
        setParseError("Could not upload the PDF. Check your connection and try again.");
      }
      return;
    }

    // CSV
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const headers = results.meta.fields || [];
        const nameKey = findKey(headers, CSV_NAME_KEYS);
        const emailKey = findKey(headers, CSV_EMAIL_KEYS);
        const phoneKey = findKey(headers, CSV_PHONE_KEYS);

        if (!emailKey) {
          setParseError(`Could not find an email column. Found: ${headers.join(", ") || "no headings"}`);
          return;
        }

        const parsed: ImportRow[] = results.data.map((row) => ({
          name: (nameKey ? row[nameKey] : "") || "",
          email: (emailKey ? row[emailKey] : "") || "",
          phone: (phoneKey ? row[phoneKey] : "") || "",
        })).filter((r) => r.name.trim() || r.email.trim() || r.phone.trim());

        if (parsed.length === 0) { setParseError("No valid rows found in file."); return; }
        setRows(parsed);
      },
      error(err) {
        setParseError(`CSV parse error: ${err.message}`);
      },
    });
  }

  async function handleImport() {
    const valid = rows.filter(hasEmail);
    if (valid.length === 0) { setImportError("At least one guest needs a valid email address."); return; }
    setImporting(true);
    setImportError("");
    try {
      const res = await fetch("/api/admin/guests/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guests: valid }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setImportError(data.error || "Import failed. Please try again."); return; }
      setResult({ ...data, noEmail: (data.noEmail || 0) + (rows.length - valid.length) });
      setRows([]);
      setFileName("");
    } catch {
      setImportError("Could not reach the server. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows.filter(hasEmail).length;

  const back = (
    <Link href="/admin/guests" className={btn.glass}>
      <ArrowLeft className="h-5 w-5" strokeWidth={1.5} />
      Guests
    </Link>
  );

  return (
    <OwnLayout>
      <PageHead title="Import guests" subtitle="Add guests to the CRM from a CSV or a PDF" actions={back} />

      {rows.length > 0 && (
        <GlassStats
          items={[
            { label: "Rows found", value: rows.length },
            { label: "Ready to import", value: validCount },
            { label: "Need a valid email", value: rows.length - validCount },
          ]}
        />
      )}

      {/* Result banner */}
      {result && (
        <Sheet label="Import complete" className="mb-3 flex items-start gap-3 p-[18px]">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div>
            <h2 className="font-outfit text-xl font-normal tracking-tight text-stone-900">Import complete</h2>
            <p className="mt-1 text-sm font-light text-stone-600">
              {result.added} guest{result.added !== 1 ? "s" : ""} added · {result.skipped} already in the CRM
              {result.noEmail ? ` · ${result.noEmail} left out (no valid email)` : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/admin/guests" className={btn.primary}>
                View Guest CRM
              </Link>
            </div>
          </div>
        </Sheet>
      )}

      {/* Upload zone */}
      {rows.length === 0 && !result && (
        <Sheet label="Upload a file" className="p-3 md:p-4">
          <div
            role="button"
            tabIndex={0}
            className="flex cursor-pointer flex-col items-center rounded-[18px] border border-stone-200 bg-stone-50 px-6 py-12 text-center transition hover:border-stone-300 hover:bg-white focus-visible:border-stone-500 focus-visible:outline-none"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-900">
              <FileUp className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <p className="font-outfit text-xl font-normal text-stone-900">Drop a CSV or PDF here</p>
            <p className="mb-4 mt-1 text-sm font-light text-stone-500">Or click to browse</p>
            <p className="text-xs font-light leading-relaxed text-stone-500">
              CSV: an email column, plus name and phone if you have them (any order)
              <br />
              PDF: email addresses extracted automatically
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </Sheet>
      )}

      {parseError && <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{parseError}</p>}

      {/* Preview */}
      {rows.length > 0 && (
        <Sheet label="Review before importing" className="overflow-hidden">
          <div className="px-4 pb-3 pt-[18px] md:px-5">
            <SheetTitle
              aside={
                <button onClick={() => { setRows([]); setFileName(""); setParseError(""); }} className={btn.small}>
                  Change file
                </button>
              }
            >
              <span className="block truncate">{fileName}</span>
            </SheetTitle>
            <p className="mt-0.5 text-[13px] font-light text-stone-500">{rows.length} rows found. Review and edit before importing.</p>
          </div>

          {/* Phones: one card per row */}
          <ul className="md:hidden">
            {rows.map((r, i) => (
              <li key={i} className={`border-t border-stone-100 px-4 py-3 ${!hasEmail(r) ? "bg-red-50" : ""}`}>
                <div className="mb-2 flex items-center">
                  <span className="text-xs font-light text-stone-500">Row {i + 1}{!hasEmail(r) ? " · needs a valid email" : ""}</span>
                  <button onClick={() => removeRow(i)} aria-label={`Remove row ${i + 1}`} className="ml-auto flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-white hover:text-red-700">
                    <X className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
                <div className="space-y-2">
                  <input value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} className={inputCls} placeholder="Name" aria-label="Name" />
                  <input value={r.email} onChange={(e) => updateRow(i, "email", e.target.value)} className={inputCls} placeholder="Email (required)" aria-label="Email" />
                  <input value={r.phone} onChange={(e) => updateRow(i, "phone", e.target.value)} className={inputCls} placeholder="Phone" aria-label="Phone" />
                </div>
              </li>
            ))}
          </ul>

          {/* iPad and up: the table */}
          <div className={`hidden md:block ${tableWrap}`}>
            <table className={table}>
              <thead>
                <tr>
                  <th className="!pl-5">Name</th>
                  <th>Email *</th>
                  <th>Phone</th>
                  <th className="w-12 !pr-5"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={!hasEmail(r) ? "bg-red-50" : ""}>
                    <td className="!py-2 !pl-5">
                      <input value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} className={inputCls} placeholder="Name" aria-label="Name" />
                    </td>
                    <td className="!py-2">
                      <input value={r.email} onChange={(e) => updateRow(i, "email", e.target.value)} className={inputCls} placeholder="Required" aria-label="Email" />
                    </td>
                    <td className="!py-2">
                      <input value={r.phone} onChange={(e) => updateRow(i, "phone", e.target.value)} className={inputCls} placeholder="Phone" aria-label="Phone" />
                    </td>
                    <td className="!py-2 !pr-5 text-center">
                      <button onClick={() => removeRow(i)} aria-label={`Remove row ${i + 1}`} className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-red-700">
                        <X className="h-4 w-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importError && <p className="mx-4 my-3 rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700 md:mx-5">{importError}</p>}

          <SheetFooter>
            <span className="text-stone-500">
              {validCount} of {rows.length} rows ready to import
              {validCount < rows.length ? " · rows in red need a valid email" : ""}
            </span>
            <button onClick={handleImport} disabled={importing || validCount === 0} className={`${btn.primary} ml-auto`}>
              {importing ? "Importing…" : `Import ${validCount} guest${validCount !== 1 ? "s" : ""}`}
            </button>
          </SheetFooter>
        </Sheet>
      )}
    </OwnLayout>
  );
}
