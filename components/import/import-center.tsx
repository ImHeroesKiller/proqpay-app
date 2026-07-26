"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  commitImportBatch,
  downloadImportTemplate,
  uploadImportBatch,
} from "@/lib/import/actions";
import type { ImportTemplateDef } from "@/lib/import/templates";
import { Download, Upload, CheckCircle2 } from "lucide-react";

type Batch = {
  id: string;
  templateCode: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  committedRows: number;
  createdAt: Date | string;
};

export function ImportCenter({
  templates,
  initialBatches,
  companies,
}: {
  templates: ImportTemplateDef[];
  initialBatches: Batch[];
  companies: { id: string; name: string }[];
}) {
  const [selected, setSelected] = useState(templates[0]?.code ?? "EMPLOYEE_MASTER");
  const [batches, setBatches] = useState(initialBatches);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [companyId, setCompanyId] = useState(
    companies.length === 1 ? companies[0].id : "",
  );

  function onDownload() {
    start(async () => {
      setMessage(null);
      try {
        const res = await downloadImportTemplate(selected);
        const bin = atob(res.base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const blob = new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.fileName;
        a.click();
        URL.revokeObjectURL(url);
        setMessage("Template berhasil diunduh.");
      } catch {
        setMessage("Gagal mengunduh template. Silakan coba lagi.");
      }
    });
  }

  function onUpload(file: File | null) {
    if (!file) return;
    start(async () => {
      setMessage(null);
      try {
        const buf = await file.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const base64 = btoa(binary);
        const res = await uploadImportBatch({
          templateCode: selected,
          fileName: file.name,
          base64,
          companyId,
        });
        if (!res.ok) {
          setMessage(res.error);
          return;
        }
        setMessage(
          `${res.idaSummary} Validasi: ${res.validRows} valid, ${res.warningRows} peringatan, ${res.errorRows} error dari ${res.totalRows} baris.`,
        );
        setBatches((prev) => [
          {
            id: res.batchId,
            templateCode: selected,
            fileName: file.name,
            status: "VALIDATED",
            totalRows: res.totalRows,
            validRows: res.validRows,
            errorRows: res.errorRows,
            warningRows: res.warningRows,
            committedRows: 0,
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
      } catch {
        setMessage("Unggah gagal. Pastikan file mengikuti template resmi.");
      }
    });
  }

  function onCommit(batchId: string) {
    start(async () => {
      setMessage(null);
      const res = await commitImportBatch(batchId);
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setMessage(`Commit berhasil: ${res.committed} baris.`);
      setBatches((prev) =>
        prev.map((b) =>
          b.id === batchId
            ? { ...b, status: "COMMITTED", committedRows: res.committed }
            : b,
        ),
      );
    });
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-navy">
          {message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="font-display text-base font-semibold text-navy">Template</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Pilih template, unduh, isi sheet Data, lalu unggah kembali.
          </p>
          <label className="mt-4 block text-xs font-semibold text-navy">
            Client tujuan
            <select
              value={companyId}
              onChange={(event) => setCompanyId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm"
            >
              <option value="">Pilih client</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto">
            {templates.map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setSelected(t.code)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                  selected === t.code
                    ? "border-orange bg-orange/5 text-navy"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="font-medium">{t.name}</div>
                <div className="text-[11px] text-muted-foreground">{t.code} · v{t.version}</div>
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" onClick={onDownload} disabled={pending}>
              <Download className="h-3.5 w-3.5" />
              Unduh Excel
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept=".xlsx,.xls"
                disabled={!companyId}
                className="hidden"
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
              <span className={`inline-flex h-9 items-center gap-2 rounded-xl bg-navy px-3 text-sm font-medium text-white ${companyId ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                <Upload className="h-3.5 w-3.5" />
                Unggah
              </span>
            </label>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-navy">Riwayat batch</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Template</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Baris</th>
                  <th className="py-2">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Belum ada import. Unduh template dan unggah file pertama Anda.
                    </td>
                  </tr>
                )}
                {batches.map((b) => (
                  <tr key={b.id} className="border-b border-border/70">
                    <td className="py-3 pr-3 font-medium text-navy">{b.fileName}</td>
                    <td className="py-3 pr-3 text-muted-foreground">{b.templateCode}</td>
                    <td className="py-3 pr-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      {b.validRows} ok · {b.warningRows} warn · {b.errorRows} err / {b.totalRows}
                    </td>
                    <td className="py-3">
                      {b.status !== "COMMITTED" && b.errorRows < b.totalRows && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => onCommit(b.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Commit
                        </Button>
                      )}
                      {b.status === "COMMITTED" && (
                        <span className="text-xs text-emerald-700">
                          {b.committedRows} committed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
