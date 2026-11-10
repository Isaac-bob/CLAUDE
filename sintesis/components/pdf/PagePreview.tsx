"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

export type Rect = { page: number; x: number; y: number; w: number; h: number };

// Vista previa de una página. Modo "point": un clic fija una posición. Modo "rects": arrastrar dibuja recuadros.
export function PagePreview({
  file,
  mode,
  page,
  onPageChange,
  point,
  onPoint,
  rects,
  onRects,
  color = "#01003e",
}: {
  file: File;
  mode: "point" | "rects";
  page: number;
  onPageChange: (p: number) => void;
  point?: { x: number; y: number };
  onPoint?: (x: number, y: number) => void;
  rects?: Rect[];
  onRects?: (r: Rect[]) => void;
  color?: string;
}) {
  // Resultado de la última carga, identificado por documento+página (así el estado de carga se deriva sin setState en el efecto).
  const [loaded, setLoaded] = useState<{ key: string; url: string; pages: number } | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const key = `${file.name}-${file.size}-${page}`;
  const url = loaded?.key === key ? loaded.url : null;
  const pages = loaded?.pages ?? 1;
  const error = failed?.key === key ? failed.message : null;
  const loading = !url && !error;
  const [drag, setDrag] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [current, setCurrent] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    const form = new FormData();
    form.append("file", file, file.name);
    form.append("page", String(page));
    form.append("width", "900");
    fetch("/api/pdf/preview", { method: "POST", body: form })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? "No se pudo mostrar la página.");
        const count = Number(r.headers.get("X-Page-Count") ?? 1);
        const blob = await r.blob();
        if (!alive) return;
        setLoaded({ key, url: URL.createObjectURL(blob), pages: count });
      })
      .catch((e: Error) => {
        if (alive) setFailed({ key, message: e.message });
      });
    return () => {
      alive = false;
    };
  }, [file, page, key]);

  const rel = (e: { clientX: number; clientY: number }) => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };

  const pageOnThis = (rects ?? []).filter((r) => r.page === page);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" className="btn-ghost !p-2" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="Página anterior">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="text-sm font-semibold tabular-nums">Página {page} de {pages}</span>
          <button type="button" className="btn-ghost !p-2" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="Página siguiente">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-muted">{mode === "point" ? "Haz clic donde quieras colocarlo" : "Arrastra sobre la página para marcar zonas"}</p>
      </div>

      <div className="relative overflow-auto rounded-xl bg-slate-100 p-3 text-center ring-1 ring-navy-900/10">
        {loading && <div className="grid h-64 place-items-center text-muted"><Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" /></div>}
        {error && <p role="alert" className="p-6 text-center text-sm text-danger-700">{error}</p>}
        {url && !error && (
          <div
            ref={boxRef}
            className="relative inline-block max-w-full select-none cursor-crosshair align-top"
            onClick={(e) => {
              if (mode !== "point" || !onPoint) return;
              const p = rel(e);
              onPoint(p.x, p.y);
            }}
            onMouseDown={(e) => {
              if (mode !== "rects") return;
              const p = rel(e);
              setDrag({ x: p.x, y: p.y, cx: p.x, cy: p.y });
              setCurrent({ x: p.x, y: p.y, w: 0, h: 0 });
            }}
            onMouseMove={(e) => {
              if (!drag) return;
              const p = rel(e);
              setDrag({ ...drag, cx: p.x, cy: p.y });
              setCurrent({ x: Math.min(drag.x, p.x), y: Math.min(drag.y, p.y), w: Math.abs(p.x - drag.x), h: Math.abs(p.y - drag.y) });
            }}
            onMouseUp={() => {
              if (drag && current && current.w > 0.005 && current.h > 0.005 && onRects) {
                onRects([...(rects ?? []), { page, ...current }]);
              }
              setDrag(null);
              setCurrent(null);
            }}
            onMouseLeave={() => {
              if (drag) {
                setDrag(null);
                setCurrent(null);
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Vista previa de la página ${page}`} className="block h-auto max-h-[68vh] w-auto max-w-full rounded-lg bg-white shadow-sm" draggable={false} />
            {mode === "point" && point && (
              <span className="pointer-events-none absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ring-2 ring-white" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%`, background: color }}>
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            )}
            {mode === "rects" &&
              pageOnThis.map((r, i) => (
                <span key={i} className="pointer-events-none absolute border-2 bg-black/70" style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }} />
              ))}
            {mode === "rects" && current && (
              <span className="pointer-events-none absolute border-2 border-dashed border-navy-900 bg-navy-900/20" style={{ left: `${current.x * 100}%`, top: `${current.y * 100}%`, width: `${current.w * 100}%`, height: `${current.h * 100}%` }} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
