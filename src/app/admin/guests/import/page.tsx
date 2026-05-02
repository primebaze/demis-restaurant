"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Papa from "papaparse";

interface ImportRow {
  name: string;
  email: string;
  phone: string;
}

const CSV_NAME_KEYS = ["name", "full name", "fullname", "guest name", "guestname", "first name", "firstname"];
const CSV_EMAIL_KEYS = ["email", "email address", "emailaddress", "e-mail"];
const CSV_PHONE_KEYS = ["phone", "mobile", "tel", "telephone", "phone number", "mobile number"];

function findKey(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(h.toLowerCase().trim()));
}

export default function GuestImportPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const [importError, setImportError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const inputCls = "px-3 py-1.5 bg-[#0f0f0f] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold-400 w-full";

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
      const res = await fetch("/api/admin/guests/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setParseError(data.error || "Failed to parse PDF"); return; }
      setRows(data.rows || []);
      if ((data.rows || []).length === 0) setParseError("No email addresses found in this PDF. Try a CSV instead.");
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

        if (!nameKey && !emailKey) {
          setParseError(`Could not find name or email columns. Found: ${headers.join(", ")}`);
          return;
        }

        const parsed: ImportRow[] = results.data.map((row) => ({
          name: (nameKey ? row[nameKey] : "") || "",
          email: (emailKey ? row[emailKey] : "") || "",
          phone: (phoneKey ? row[phoneKey] : "") || "",
        })).filter((r) => r.name.trim() || r.email.trim());

        if (parsed.length === 0) { setParseError("No valid rows found in file."); return; }
        setRows(parsed);
      },
      error(err) {
        setParseError(`CSV parse error: ${err.message}`);
      },
    });
  }

  async function handleImport() {
    const valid = rows.filter((r) => r.name.trim());
    if (valid.length === 0) { setImportError("At least one guest must have a name."); return; }
    setImporting(true);
    setImportError("");
    const res = await fetch("/api/admin/guests/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guests: valid }),
    });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) { setImportError(data.error || "Import failed"); return; }
    setResult(data);
    setRows([]);
    setFileName("");
  }

  const validCount = rows.filter((r) => r.name.trim()).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/guests" className="text-gray-500 hover:text-white transition text-sm">← Guests</Link>
        <span className="text-gray-700">/</span>
        <h1 className="text-2xl font-bold text-white">Import Guests</h1>
      </div>

      {/* Result banner */}
      {result && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <p className="text-emerald-400 font-medium">Import complete</p>
          <p className="text-sm text-gray-400 mt-1">{result.added} guest{result.added !== 1 ? "s" : ""} added · {result.skipped} skipped (email already exists)</p>
          <Link href="/admin/guests" className="inline-block mt-3 text-sm text-gold-300 hover:underline">View Guest CRM →</Link>
        </div>
      )}

      {/* Upload zone */}
      {rows.length === 0 && !result && (
        <div
          className="bg-[#1a1a1a] border-2 border-dashed border-gray-700 hover:border-gold-300/40 rounded-2xl p-12 text-center cursor-pointer transition"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        >
          <div className="text-4xl mb-4">📂</div>
          <p className="text-white font-medium mb-1">Drop a CSV or PDF here</p>
          <p className="text-sm text-gray-500 mb-4">Or click to browse</p>
          <p className="text-xs text-gray-600">CSV: columns named name, email, phone (any order)<br />PDF: email addresses extracted automatically</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {parseError && (
        <p className="mt-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{parseError}</p>
      )}

      {/* Preview table */}
      {rows.length > 0 && (
        <div className="bg-[#1a1a1a] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div>
              <p className="text-white font-medium">{fileName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{rows.length} rows found — review and edit before importing</p>
            </div>
            <button
              onClick={() => { setRows([]); setFileName(""); setParseError(""); }}
              className="text-sm text-gray-500 hover:text-white transition"
            >
              Change file
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b border-gray-800">
                  <th className="px-4 py-3">Name *</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map((r, i) => (
                  <tr key={i} className={`${!r.name.trim() ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-2">
                      <input value={r.name} onChange={(e) => updateRow(i, "name", e.target.value)} className={inputCls} placeholder="Required" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={r.email} onChange={(e) => updateRow(i, "email", e.target.value)} className={inputCls} placeholder="—" />
                    </td>
                    <td className="px-4 py-2">
                      <input value={r.phone} onChange={(e) => updateRow(i, "phone", e.target.value)} className={inputCls} placeholder="—" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => removeRow(i)} className="text-gray-600 hover:text-red-400 transition text-lg leading-none">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {importError && (
            <p className="mx-6 my-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{importError}</p>
          )}

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
            <p className="text-sm text-gray-500">{validCount} of {rows.length} rows ready to import</p>
            <button
              onClick={handleImport}
              disabled={importing || validCount === 0}
              className="px-6 py-2.5 bg-gold-300 text-black font-semibold text-sm rounded-xl hover:bg-gold-400 disabled:opacity-50 transition"
            >
              {importing ? "Importing…" : `Import ${validCount} Guest${validCount !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
