"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, FileText, X, ArrowUp, ArrowDown, Download, Loader2, CheckCircle2, AlertTriangle, RefreshCcw } from "lucide-react";
import type { PdfTool } from "@/modules/pdf/tools";

type Status = "idle" | "running" | "done" | "error";

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 25);

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ToolWorkspace({ tool }: { tool: PdfTool }) {
  const [files, setFiles] = useState<File[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      tool.options.map((o) => [o.key, o.type === "range" ? String(o.defaultValue) : o.type === "select" ? o.choices[0]!.value : ""]),
    ),
  );
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Liberar la URL del resultado anterior para no acumular memoria.
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const accept = tool.accept === "pdf" ? ".pdf,application/pdf" : ".jpg,.jpeg,.png,image/jpeg,image/png";
  const isMultiple = tool.maxFiles > 1;

  const validation = useMemo(() => {
    const problems: string[] = [];
    if (files.length < tool.minFiles) {
      problems.push(tool.minFiles > 1 ? `Añade al menos ${tool.minFiles} archivos.` : "Añade un archivo.");
    }
    if (files.length > tool.maxFiles) problems.push(`Esta herramienta admite hasta ${tool.maxFiles} archivos.`);
    for (const o of tool.options) {
      if (o.type === "text" && o.required && !values[o.key]?.trim()) problems.push(`Completa «${o.label}».`);
    }
    if (tool.slug === "split" && values.mode !== "each" && !values.ranges?.trim()) {
      problems.push("Indica los rangos de páginas o elige «Cada página por separado».");
    }
    return problems;
  }, [files.length, tool, values]);

  function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) {
      setError(`«${tooBig.name}» supera el límite de ${MAX_MB} MB.`);
      return;
    }
    const valid = incoming.filter((f) =>
      tool.accept === "pdf" ? /\.pdf$/i.test(f.name) || f.type === "application/pdf" : /\.(jpe?g|png)$/i.test(f.name),
    );
    if (valid.length < incoming.length) {
      setError(tool.accept === "pdf" ? "Solo se aceptan archivos PDF." : "Solo se aceptan imágenes JPG o PNG.");
    } else {
      setError(null);
    }
    if (valid.length === 0) return;
    setStatus("idle");
    setResult(null);
    setFiles((prev) => (isMultiple ? [...prev, ...valid].slice(0, tool.maxFiles) : valid.slice(0, 1)));
  }

  function move(index: number, dir: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function run() {
    setStatus("running");
    setError(null);
    const form = new FormData();
    files.forEach((f) => form.append("files", f, f.name));
    for (const [k, v] of Object.entries(values)) form.append(k, v);
    try {
      const res = await fetch(`/api/pdf/${tool.slug}`, { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo procesar el archivo.");
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const name = decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(disp)?.[1] ?? "resultado.pdf");
      setResult({ url: URL.createObjectURL(blob), name, size: blob.size });
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado.");
      setStatus("error");
    }
  }

  function reset() {
    setFiles([]);
    setStatus("idle");
    setError(null);
    setResult(null);
  }

  const busy = status === "running";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card p-5 sm:p-7" aria-labelledby="tool-title">
        <h1 id="tool-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{tool.name}</h1>
        <p className="mt-2 text-muted">{tool.summary}</p>

        {status === "done" && result ? (
          <div className="mt-6 rounded-2xl bg-emerald-50 p-6 ring-1 ring-emerald-200" role="status">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-emerald-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-emerald-900">¡Listo! Tu {tool.outputLabel.toLowerCase()} está preparado.</p>
                <p className="mt-1 truncate text-sm text-emerald-800">
                  {result.name} · {formatBytes(result.size)}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={result.url} download={result.name} className="btn-primary">
                    <Download className="h-4 w-4" aria-hidden="true" /> Descargar
                  </a>
                  <button type="button" onClick={reset} className="btn-ghost">
                    <RefreshCcw className="h-4 w-4" aria-hidden="true" /> Empezar de nuevo
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
              className={`mt-6 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition ${
                dragging ? "border-rose-500 bg-rose-50" : "border-indigo-200 bg-indigo-50/40"
              }`}
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm">
                <UploadCloud className="h-7 w-7 text-rose-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">Arrastra tus archivos aquí</p>
                <p className="text-sm text-muted">
                  {tool.accept === "pdf" ? "Archivos PDF" : "Imágenes JPG o PNG"}
                  {isMultiple ? ` · hasta ${tool.maxFiles}` : ""} · máximo {MAX_MB} MB cada uno
                </p>
              </div>
              <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost">
                Elegir archivos
              </button>
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={isMultiple}
                className="sr-only"
                aria-label="Elegir archivos"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>

            {files.length > 0 && (
              <ul className="mt-5 divide-y divide-indigo-950/5 rounded-2xl ring-1 ring-indigo-950/5" aria-label="Archivos seleccionados">
                {files.map((f, i) => (
                  <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{f.name}</p>
                      <p className="text-xs text-muted">{formatBytes(f.size)}{tool.slug === "merge" ? ` · posición ${i + 1}` : ""}</p>
                    </div>
                    {tool.slug === "merge" && files.length > 1 && (
                      <div className="flex gap-1">
                        <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="btn-ghost !p-2" aria-label={`Subir ${f.name}`}>
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1} className="btn-ghost !p-2" aria-label={`Bajar ${f.name}`}>
                          <ArrowDown className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <button type="button" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="btn-ghost !p-2" aria-label={`Quitar ${f.name}`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {tool.options.length > 0 && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {tool.options.map((o) => {
                  const disabled = tool.slug === "split" && o.key === "ranges" && values.mode === "each";
                  return (
                    <div key={o.key} className={o.type === "range" || o.type === "text" ? "sm:col-span-2" : ""}>
                      {o.type === "select" && (
                        <>
                          <label className="label" htmlFor={`opt-${o.key}`}>{o.label}</label>
                          <select id={`opt-${o.key}`} className="field" value={values[o.key]} onChange={(e) => setValues((v) => ({ ...v, [o.key]: e.target.value }))}>
                            {o.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          <p className="hint">{o.help}</p>
                        </>
                      )}
                      {o.type === "text" && (
                        <>
                          <label className="label" htmlFor={`opt-${o.key}`}>{o.label}{o.required && <span className="text-rose-600"> *</span>}</label>
                          <input
                            id={`opt-${o.key}`}
                            type="text"
                            className="field disabled:bg-slate-50 disabled:text-slate-400"
                            placeholder={o.placeholder}
                            value={values[o.key] ?? ""}
                            disabled={disabled}
                            maxLength={200}
                            onChange={(e) => setValues((v) => ({ ...v, [o.key]: e.target.value }))}
                          />
                          <p className="hint">{o.help}</p>
                        </>
                      )}
                      {o.type === "range" && (
                        <>
                          <label className="label flex justify-between" htmlFor={`opt-${o.key}`}>
                            <span>{o.label}</span>
                            <span className="tabular-nums text-rose-600">{values[o.key]} %</span>
                          </label>
                          <input
                            id={`opt-${o.key}`}
                            type="range"
                            min={o.min}
                            max={o.max}
                            step={o.step}
                            value={values[o.key]}
                            onChange={(e) => setValues((v) => ({ ...v, [o.key]: e.target.value }))}
                            className="w-full accent-rose-600"
                          />
                          <p className="hint">{o.help}</p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {error && (
              <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                {validation.length > 0 && files.length > 0 ? validation[0] : files.length === 0 ? "Empieza subiendo tu archivo." : "Todo listo para continuar."}
              </p>
              <button type="button" onClick={run} disabled={busy || validation.length > 0} className="btn-primary w-full sm:w-auto">
                {busy ? (<><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Procesando…</>) : tool.name}
              </button>
            </div>
          </>
        )}
      </section>

      <aside className="space-y-4">
        <div className="card p-5">
          <h2 className="font-bold">Cómo funciona</h2>
          <ol className="mt-4 space-y-4">
            {[
              ["Sube tus archivos", "Arrástralos o elígelos desde tu dispositivo."],
              ["Ajusta las opciones", "Cambia lo que necesites; los valores de ejemplo ya vienen listos."],
              ["Descarga el resultado", tool.outputLabel + ". Tus archivos se eliminan al terminar."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-600 text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-[var(--radius-card)] bg-gradient-to-br from-indigo-600 to-fuchsia-600 p-5 text-white shadow-lg">
          <p className="font-bold">Privacidad primero</p>
          <p className="mt-1 text-sm text-indigo-100">
            Procesamos tu archivo en el servidor solo el tiempo necesario. No guardamos su contenido; sí registramos datos
            técnicos de la operación (nombre de la herramienta y tamaño) para tu historial y para mejorar el servicio.
          </p>
        </div>
      </aside>
    </div>
  );
}
