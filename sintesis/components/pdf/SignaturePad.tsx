"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

// Lienzo para dibujar la firma. Exporta un PNG con fondo transparente.
export function SignaturePad({ onChange }: { onChange: (file: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#01003e";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * canvasRef.current!.width, y: ((e.clientY - r.top) / r.height) * canvasRef.current!.height };
  };

  async function exportPng() {
    const c = canvasRef.current!;
    const blob: Blob | null = await new Promise((res) => c.toBlob(res, "image/png"));
    onChange(blob ? new File([blob], "firma.png", { type: "image/png" }) : null);
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={220}
        className="w-full touch-none rounded-xl bg-white ring-1 ring-navy-900/15"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          canvasRef.current!.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current!.getContext("2d")!;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
          setDirty(true);
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (dirty) void exportPng();
        }}
        aria-label="Área para dibujar tu firma"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">Dibuja tu firma con el ratón o el dedo.</p>
        <button
          type="button"
          className="btn-ghost !px-3 !py-1.5 text-sm"
          onClick={() => {
            const c = canvasRef.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            setDirty(false);
            onChange(null);
          }}
        >
          <Eraser className="h-4 w-4" aria-hidden="true" /> Borrar
        </button>
      </div>
    </div>
  );
}
