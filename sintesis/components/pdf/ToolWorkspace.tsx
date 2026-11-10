"use client";

import { useMemo, useRef, useState } from "react";
import {
  UploadCloud, FileText, X, ArrowUp, ArrowDown, Download, Loader2, CheckCircle2, AlertTriangle, RefreshCcw, Info, Copy, Plus, Trash2, Link2,
} from "lucide-react";
import type { PdfTool, InputKind, FieldOption, Slot } from "@/modules/pdf/catalog";
import { PagePreview, type Rect } from "./PagePreview";
import { SignaturePad } from "./SignaturePad";
import { ToolIcon } from "./ToolIcon";

type Result =
  | { type: "file"; url: string; name: string; size: number }
  | { type: "text"; texts: { title: string; text: string }[] }
  | { type: "link"; url: string; name: string; expiresAt: string }
  | null;

type TextOp = { type: "text"; page: number; x: number; y: number; text: string; size: number; color: string } | { type: "rect"; page: number; x: number; y: number; w: number; h: number; color: string; fill: boolean };

const ACCEPT: Record<InputKind, string> = {
  pdf: ".pdf,application/pdf",
  jpg: ".jpg,.jpeg,image/jpeg",
  png: ".png,image/png",
  docx: ".docx",
  xlsx: ".xlsx",
  pptx: ".pptx",
  epub: ".epub",
  djvu: ".djvu,.djvu",
  audio: ".mp3,.wav,.m4a,.ogg,.flac,audio/*",
};

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 25);

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function initialValues(tool: PdfTool): Record<string, string> {
  const v: Record<string, string> = { page: "1", x: "0.6", y: "0.8", width: "0.25", opacity: "30", days: "7" };
  for (const o of tool.options as FieldOption[]) {
    if (o.type === "boolean") v[o.key] = o.default ? "true" : "false";
    else if (o.type === "number") v[o.key] = String(o.default);
    else if (o.type === "select") v[o.key] = o.default;
    else v[o.key] = "";
  }
  return v;
}

export function ToolWorkspace({ tool }: { tool: PdfTool }) {
  const primaryKey = tool.slots[0]?.key;
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [values, setValues] = useState<Record<string, string>>(() => initialValues(tool));
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error" | "unavailable">("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result>(null);
  const [notes, setNotes] = useState<{ title: string; text: string }[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const inputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  // Estado de paneles especiales
  const [page, setPage] = useState(1);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [rects, setRects] = useState<Rect[]>([]);
  const [ops, setOps] = useState<TextOp[]>([]);
  const [draftText, setDraftText] = useState("");
  const [draftSize, setDraftSize] = useState(14);
  const [draftColor, setDraftColor] = useState("#01003e");
  const [draftMode, setDraftMode] = useState<"text" | "rect">("text");
  const [sigWidth, setSigWidth] = useState(0.25);
  const [sigMode, setSigMode] = useState<"draw" | "upload">("draw");

  const primaryFile = primaryKey ? files[primaryKey]?.[0] : undefined;

  const problems = useMemo(() => {
    const p: string[] = [];
    for (const s of tool.slots as Slot[]) {
      const n = files[s.key]?.length ?? 0;
      if (n < s.min) p.push(s.min > 1 ? `Añade al menos ${s.min} archivos en «${s.label}».` : `Añade «${s.label}».`);
      if (n > s.max) p.push(`«${s.label}» admite hasta ${s.max}.`);
    }
    for (const o of tool.options as FieldOption[]) {
      const cond = "requiredWhen" in o ? o.requiredWhen : undefined;
      const active = !cond || values[cond.key] === cond.value;
      const required = ("required" in o && o.required) || (cond && active);
      if (required && (o.type === "text" || o.type === "textarea" || o.type === "password" || o.type === "url" || o.type === "pages") && !values[o.key]?.trim()) {
        p.push(`Completa «${o.label}».`);
      }
    }
    if (tool.panel === "signature") {
      if (!point) p.push("Haz clic en la página donde quieres la firma.");
      if (!files.firma?.[0]) p.push("Dibuja o sube tu firma.");
    }
    if (tool.panel === "redact" && rects.length === 0) p.push("Marca al menos una zona para censurar.");
    if (tool.panel === "text-overlays" && ops.length === 0) p.push("Añade al menos un texto o recuadro.");
    return p;
  }, [tool, files, values, point, rects, ops]);

  function addFiles(slot: Slot, list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const tooBig = incoming.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) return setError(`«${tooBig.name}» supera el límite de ${MAX_MB} MB.`);
    const accepted = incoming.filter((f) => slot.accept.some((k) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (k === "pdf") return ext === "pdf";
      if (k === "jpg") return ext === "jpg" || ext === "jpeg";
      if (k === "png") return ext === "png";
      if (k === "djvu") return ext === "djvu";
      if (k === "audio") return ["mp3", "wav", "m4a", "ogg", "flac"].includes(ext);
      return ext === k;
    }));
    if (accepted.length < incoming.length) setError(`Algunos archivos no son de tipo válido para «${slot.label}».`);
    else setError(null);
    if (accepted.length === 0) return;
    setStatus("idle");
    setResult(null);
    if (slot.key === primaryKey) {
      // Un documento nuevo invalida las posiciones marcadas sobre el anterior.
      setPage(1);
      setPoint(null);
      setRects([]);
      setOps([]);
    }
    setFiles((prev) => {
      const current = prev[slot.key] ?? [];
      const next = slot.max > 1 ? [...current, ...accepted].slice(0, slot.max) : accepted.slice(0, 1);
      return { ...prev, [slot.key]: next };
    });
  }

  function removeFile(slot: string, index: number) {
    setFiles((prev) => ({ ...prev, [slot]: (prev[slot] ?? []).filter((_, i) => i !== index) }));
  }

  function move(slot: string, index: number, dir: -1 | 1) {
    setFiles((prev) => {
      const list = [...(prev[slot] ?? [])];
      const t = index + dir;
      if (t < 0 || t >= list.length) return prev;
      [list[index], list[t]] = [list[t]!, list[index]!];
      return { ...prev, [slot]: list };
    });
  }

  async function run() {
    setStatus("running");
    setError(null);
    setResult(null);
    setNotes([]);
    const form = new FormData();
    for (const s of tool.slots as Slot[]) for (const f of files[s.key] ?? []) form.append(s.key, f, f.name);
    const payload: Record<string, string> = { ...values };
    if (tool.panel === "signature" && point) Object.assign(payload, { page: String(page), x: String(point.x), y: String(point.y), width: String(sigWidth) });
    if (tool.panel === "redact") payload.rects = JSON.stringify(rects.map((r) => ({ page: r.page, x: r.x, y: r.y, w: r.w, h: r.h })));
    if (tool.panel === "text-overlays") payload.edits = JSON.stringify(ops);
    for (const [k, v] of Object.entries(payload)) form.append(k, v);

    try {
      const res = await fetch(`/api/pdf/${tool.slug}`, { method: "POST", body: form });
      const notesHeader = res.headers.get("X-Sintesis-Notes");
      if (notesHeader) {
        try {
          const decoded = JSON.parse(atob(notesHeader.replace(/-/g, "+").replace(/_/g, "/")));
          setNotes(decoded);
        } catch {
          setNotes([]);
        }
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const err = new Error(body?.error ?? "No se pudo procesar el archivo.") as Error & { code?: string };
        err.code = body?.code;
        throw err;
      }
      const type = res.headers.get("content-type") ?? "";
      if (type.includes("application/json")) {
        const data = await res.json();
        if (data.kind === "link") setResult({ type: "link", url: data.url, name: data.name, expiresAt: data.expiresAt });
        else setResult({ type: "text", texts: data.texts ?? [] });
      } else {
        const blob = await res.blob();
        const disp = res.headers.get("Content-Disposition") ?? "";
        const name = decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(disp)?.[1] ?? "resultado");
        setResult({ type: "file", url: URL.createObjectURL(blob), name, size: blob.size });
      }
      setStatus("done");
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === "requires-config") setStatus("unavailable");
      else setStatus("error");
      setError(err instanceof Error ? err.message : "Error inesperado.");
    }
  }

  function reset() {
    setFiles({});
    setStatus("idle");
    setError(null);
    setResult(null);
    setNotes([]);
    setPoint(null);
    setRects([]);
    setOps([]);
  }

  const busy = status === "running";
  const options = tool.options as FieldOption[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <section className="card p-5 sm:p-7" aria-labelledby="tool-title">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-navy-900 text-white">
            <ToolIcon icon={tool.icon} className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            <h1 id="tool-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">{tool.name}</h1>
            <p className="mt-1 text-muted">{tool.summary}</p>
          </div>
        </div>

        {tool.requiresNote && (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-navy-50 px-4 py-3 text-sm text-navy-900 ring-1 ring-navy-900/10">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {tool.requiresNote}
          </p>
        )}

        {status === "done" && result ? (
          <ResultView result={result} notes={notes} onReset={reset} />
        ) : (
          <>
            {(tool.slots as Slot[]).map((s) => (
              <div key={s.key} className="mt-6">
                {s.key === "firma" && tool.panel === "signature" ? (
                  <SignatureInput
                    mode={sigMode}
                    setMode={setSigMode}
                    file={files.firma?.[0]}
                    onFile={(f) => setFiles((p) => ({ ...p, firma: f ? [f] : [] }))}
                  />
                ) : (
                  <>
                    <Dropzone
                      slot={s}
                      dragging={dragging === s.key}
                      onDrag={(on) => setDragging(on ? s.key : null)}
                      onFiles={(list) => addFiles(s, list)}
                      onPick={() => inputsRef.current[s.key]?.click()}
                      inputRef={(el) => { inputsRef.current[s.key] = el; }}
                      multiple={s.max > 1}
                    />
                    {(files[s.key]?.length ?? 0) > 0 && (
                      <ul className="mt-4 divide-y divide-navy-900/5 rounded-2xl ring-1 ring-navy-900/10" aria-label={`Archivos: ${s.label}`}>
                        {files[s.key]!.map((f, i) => (
                          <li key={`${f.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50 text-navy-900"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{f.name}</p>
                              <p className="text-xs text-muted">{formatBytes(f.size)}{s.max > 1 ? ` · posición ${i + 1}` : ""}</p>
                            </div>
                            {s.max > 1 && (files[s.key]?.length ?? 0) > 1 && (
                              <div className="flex gap-1">
                                <button type="button" onClick={() => move(s.key, i, -1)} disabled={i === 0} className="btn-ghost !p-2" aria-label={`Subir ${f.name}`}><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                                <button type="button" onClick={() => move(s.key, i, 1)} disabled={i === files[s.key]!.length - 1} className="btn-ghost !p-2" aria-label={`Bajar ${f.name}`}><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                              </div>
                            )}
                            <button type="button" onClick={() => removeFile(s.key, i)} className="btn-ghost !p-2" aria-label={`Quitar ${f.name}`}><X className="h-4 w-4" aria-hidden="true" /></button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            ))}

            {tool.panel === "signature" && primaryFile && (
              <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-navy-900/5">
                <PagePreview file={primaryFile} mode="point" page={page} onPageChange={setPage} point={point ?? undefined} onPoint={(x, y) => setPoint({ x, y })} color="#01003e" />
                <div>
                  <label className="label" htmlFor="sig-width">Tamaño de la firma: {Math.round(sigWidth * 100)} % del ancho</label>
                  <input id="sig-width" type="range" min={0.1} max={0.6} step={0.01} value={sigWidth} onChange={(e) => setSigWidth(Number(e.target.value))} className="w-full accent-navy-900" />
                </div>
              </div>
            )}

            {tool.panel === "redact" && primaryFile && (
              <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-navy-900/5">
                <PagePreview file={primaryFile} mode="rects" page={page} onPageChange={setPage} rects={rects} onRects={setRects} />
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <p className="text-muted">{rects.length} zona{rects.length === 1 ? "" : "s"} marcada{rects.length === 1 ? "" : "s"}</p>
                  <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => setRects([])} disabled={rects.length === 0}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> Quitar todas
                  </button>
                </div>
                <p className="text-xs text-muted">Se elimina el texto y las imágenes bajo cada zona. Revisa el resultado antes de compartirlo.</p>
              </div>
            )}

            {tool.panel === "text-overlays" && primaryFile && (
              <div className="mt-6 space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-navy-900/5">
                <PagePreview file={primaryFile} mode="point" page={page} onPageChange={setPage} point={point ?? undefined} onPoint={(x, y) => setPoint({ x, y })} color={draftColor} />
                <div className="grid gap-3 sm:grid-cols-[120px_1fr_100px_80px]">
                  <div>
                    <label className="label" htmlFor="ov-mode">Elemento</label>
                    <select id="ov-mode" className="field" value={draftMode} onChange={(e) => setDraftMode(e.target.value as "text" | "rect")}>
                      <option value="text">Texto</option>
                      <option value="rect">Recuadro</option>
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="ov-text">{draftMode === "text" ? "Texto" : "Recuadro (sin texto)"}</label>
                    <input id="ov-text" className="field" value={draftText} onChange={(e) => setDraftText(e.target.value)} maxLength={300} disabled={draftMode === "rect"} placeholder="Escribe aquí…" />
                  </div>
                  <div>
                    <label className="label" htmlFor="ov-size">Tamaño</label>
                    <input id="ov-size" type="number" min={6} max={96} className="field" value={draftSize} onChange={(e) => setDraftSize(Number(e.target.value))} />
                  </div>
                  <div>
                    <label className="label" htmlFor="ov-color">Color</label>
                    <input id="ov-color" type="color" className="field h-[42px] p-1" value={draftColor} onChange={(e) => setDraftColor(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-muted">{point ? "Posición elegida." : "Haz clic en la página para elegir dónde va."}</p>
                  <button
                    type="button"
                    className="btn-ghost"
                    disabled={!point || (draftMode === "text" && !draftText.trim())}
                    onClick={() => {
                      if (!point) return;
                      if (draftMode === "text") setOps((o) => [...o, { type: "text", page, x: point.x, y: point.y, text: draftText.trim(), size: draftSize, color: draftColor }]);
                      else setOps((o) => [...o, { type: "rect", page, x: point.x, y: point.y, w: 0.2, h: 0.05, color: draftColor, fill: false }]);
                      setDraftText("");
                    }}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Añadir a la página {page}
                  </button>
                </div>
                {ops.length > 0 && (
                  <ul className="divide-y divide-navy-900/5 rounded-xl bg-white ring-1 ring-navy-900/10">
                    {ops.map((op, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <span className="truncate">{op.type === "text" ? `«${op.text}»` : "Recuadro"} · página {op.page}</span>
                        <button type="button" className="btn-ghost !p-1.5" onClick={() => setOps((o) => o.filter((_, j) => j !== i))} aria-label="Quitar elemento"><X className="h-4 w-4" aria-hidden="true" /></button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {options.length > 0 && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {options.map((o) => (
                  <OptionField
                    key={o.key}
                    option={o}
                    value={values[o.key] ?? ""}
                    disabled={"requiredWhen" in o && !!o.requiredWhen && values[o.requiredWhen.key] !== o.requiredWhen.value}
                    onChange={(v) => setValues((prev) => ({ ...prev, [o.key]: v }))}
                  />
                ))}
              </div>
            )}

            {error && (
              <div role="alert" className={`mt-5 flex items-start gap-3 rounded-xl p-4 text-sm ring-1 ${status === "unavailable" ? "bg-amber-50 text-amber-900 ring-amber-200" : "bg-danger-50 text-danger-800 ring-danger-200"}`}>
                {status === "unavailable" ? <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />}
                <p>{error}</p>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">{problems.length > 0 ? problems[0] : "Todo listo para continuar."}</p>
              <button type="button" onClick={run} disabled={busy || problems.length > 0} className="btn-primary w-full sm:w-auto">
                {busy ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Procesando…</> : tool.name}
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
              ["Ajusta las opciones", "Los valores de ejemplo ya vienen listos para usar."],
              ["Descarga el resultado", "Tus archivos se procesan y se eliminan al terminar."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-navy-900 text-sm font-bold text-white">{i + 1}</span>
                <div><p className="font-semibold">{t}</p><p className="text-sm text-muted">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-[var(--radius-card)] bg-navy-900 p-5 text-white shadow-lg">
          <p className="font-serif text-lg font-bold">Tus documentos, tuyos</p>
          <p className="mt-1 text-sm text-navy-100">
            El archivo se procesa solo el tiempo necesario y no se conserva. Solo guardamos datos técnicos de la operación para tu historial.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Dropzone({ slot, dragging, onDrag, onFiles, onPick, inputRef, multiple }: {
  slot: Slot; dragging: boolean; onDrag: (on: boolean) => void; onFiles: (l: FileList) => void; onPick: () => void;
  inputRef: (el: HTMLInputElement | null) => void; multiple: boolean;
}) {
  const accept = slot.accept.map((k) => ACCEPT[k]).join(",");
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDrag(true); }}
      onDragLeave={() => onDrag(false)}
      onDrop={(e) => { e.preventDefault(); onDrag(false); onFiles(e.dataTransfer.files); }}
      className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-navy-900 bg-navy-50" : "border-navy-900/20 bg-slate-50/60"}`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white shadow-sm"><UploadCloud className="h-7 w-7 text-navy-900" aria-hidden="true" /></div>
      <div>
        <p className="font-semibold">{slot.label}</p>
        <p className="text-sm text-muted">Arrastra aquí tus archivos{multiple ? ` (hasta ${slot.max})` : ""} · máximo {MAX_MB} MB cada uno</p>
      </div>
      <button type="button" onClick={onPick} className="btn-ghost">Elegir archivos</button>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} className="sr-only" aria-label={`Elegir ${slot.label}`} onChange={(e) => { onFiles(e.target.files ?? new DataTransfer().files); e.target.value = ""; }} />
    </div>
  );
}

function SignatureInput({ mode, setMode, file, onFile }: { mode: "draw" | "upload"; setMode: (m: "draw" | "upload") => void; file?: File; onFile: (f: File | null) => void }) {
  return (
    <div className="space-y-3 rounded-2xl bg-slate-50/60 p-4 ring-1 ring-navy-900/10">
      <div className="flex gap-2" role="tablist" aria-label="Origen de la firma">
        <button role="tab" aria-selected={mode === "draw"} type="button" className={mode === "draw" ? "btn-primary !py-2 text-sm" : "btn-ghost !py-2 text-sm"} onClick={() => { setMode("draw"); onFile(null); }}>Dibujar</button>
        <button role="tab" aria-selected={mode === "upload"} type="button" className={mode === "upload" ? "btn-primary !py-2 text-sm" : "btn-ghost !py-2 text-sm"} onClick={() => { setMode("upload"); onFile(null); }}>Subir imagen</button>
      </div>
      {mode === "draw" ? (
        <SignaturePad onChange={onFile} />
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <input type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" aria-label="Imagen de la firma" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-sm" />
          {file && <span className="inline-flex items-center gap-1 text-sm text-success-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {file.name}</span>}
        </div>
      )}
    </div>
  );
}

function OptionField({ option: o, value, onChange, disabled = false }: { option: FieldOption; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const id = `opt-${o.key}`;
  const wide = o.type === "textarea" || o.type === "pages" || o.type === "text" || o.type === "url";
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      {o.type === "boolean" ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl p-2 hover:bg-navy-50/60">
          <input id={id} type="checkbox" className="mt-1 h-4 w-4 accent-navy-900" checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "false")} />
          <span><span className="font-semibold">{o.label}</span>{o.help && <span className="hint block">{o.help}</span>}</span>
        </label>
      ) : (
        <>
          <label className="label" htmlFor={id}>{o.label}</label>
          {o.type === "select" && (
            <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
              {o.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          )}
          {o.type === "number" && (
            <input id={id} type="number" className="field" value={value} min={o.min} max={o.max} step={o.step ?? 1} onChange={(e) => onChange(e.target.value)} />
          )}
          {(o.type === "text" || o.type === "url" || o.type === "pages" || o.type === "password") && (
            <input id={id} type={o.type === "password" ? "password" : o.type === "url" ? "url" : "text"} autoComplete={o.type === "password" ? "new-password" : "off"} className="field disabled:bg-slate-50 disabled:text-slate-400" disabled={disabled} value={value} placeholder={o.placeholder} maxLength={o.type === "text" ? o.maxLength : undefined} onChange={(e) => onChange(e.target.value)} />
          )}
          {o.type === "textarea" && (
            <textarea id={id} className="field min-h-[160px] font-mono text-sm" value={value} placeholder={o.placeholder} maxLength={o.maxLength} onChange={(e) => onChange(e.target.value)} />
          )}
          {"help" in o && o.help && <p className="hint">{o.help}</p>}
        </>
      )}
    </div>
  );
}

function ResultView({ result, notes, onReset }: { result: NonNullable<Result>; notes: { title: string; text: string }[]; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-6 space-y-4" role="status">
      <div className="rounded-2xl bg-success-50 p-6 ring-1 ring-success-200">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-success-700" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-success-900">¡Listo!</p>
            {result.type === "file" && (
              <>
                <p className="mt-1 truncate text-sm text-success-800">{result.name} · {formatBytes(result.size)}</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={result.url} download={result.name} className="btn-primary"><Download className="h-4 w-4" aria-hidden="true" /> Descargar</a>
                  <button type="button" onClick={onReset} className="btn-ghost"><RefreshCcw className="h-4 w-4" aria-hidden="true" /> Empezar de nuevo</button>
                </div>
              </>
            )}
            {result.type === "link" && (
              <>
                <p className="mt-1 text-sm text-success-800">Enlace válido hasta {new Date(result.expiresAt).toLocaleString("es-ES")}.</p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input readOnly value={result.url} aria-label="Enlace para compartir" className="field font-mono text-sm" onFocus={(e) => e.currentTarget.select()} />
                  <button type="button" className="btn-primary" onClick={async () => { await navigator.clipboard.writeText(result.url).catch(() => undefined); setCopied(true); }}>
                    <Link2 className="h-4 w-4" aria-hidden="true" /> {copied ? "Copiado" : "Copiar enlace"}
                  </button>
                </div>
                <button type="button" onClick={onReset} className="btn-ghost mt-4"><RefreshCcw className="h-4 w-4" aria-hidden="true" /> Compartir otro</button>
              </>
            )}
            {result.type === "text" && (
              <button type="button" onClick={onReset} className="btn-ghost mt-4"><RefreshCcw className="h-4 w-4" aria-hidden="true" /> Empezar de nuevo</button>
            )}
          </div>
        </div>
      </div>

      {result.type === "text" && result.texts.map((t, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{t.title}</h2>
            <button type="button" className="btn-ghost !px-3 !py-1.5 text-sm" onClick={() => navigator.clipboard.writeText(t.text).catch(() => undefined)}>
              <Copy className="h-4 w-4" aria-hidden="true" /> Copiar
            </button>
          </div>
          <pre className="mt-3 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 font-sans text-[15px] leading-relaxed">{t.text}</pre>
        </div>
      ))}

      {notes.map((n, i) => (
        <div key={`n${i}`} className="rounded-xl bg-navy-50 p-4 text-sm ring-1 ring-navy-900/10">
          <p className="font-semibold">{n.title}</p>
          <p className="mt-1 whitespace-pre-wrap text-muted">{n.text}</p>
        </div>
      ))}
    </div>
  );
}
