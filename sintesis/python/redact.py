"""Censura real: elimina el texto e imágenes bajo cada rectángulo y lo tapa con negro.
Uso: redact.py <entrada.pdf> <salida.pdf> <rects.json>
rects.json = [{"page": 1, "x": 0.1, "y": 0.2, "w": 0.3, "h": 0.05}, ...] (fracciones, origen arriba-izquierda)"""
import json
import sys
import pymupdf

src, dst, rects_path = sys.argv[1], sys.argv[2], sys.argv[3]
with open(rects_path, encoding="utf-8") as fh:
    rects = json.load(fh)

doc = pymupdf.open(src)
by_page = {}
for r in rects:
    by_page.setdefault(int(r["page"]), []).append(r)

for number, page in enumerate(doc, start=1):
    items = by_page.get(number, [])
    if not items:
        continue
    W, H = page.rect.width, page.rect.height
    for r in items:
        x0 = float(r["x"]) * W
        y0 = float(r["y"]) * H
        box = pymupdf.Rect(x0, y0, x0 + float(r["w"]) * W, y0 + float(r["h"]) * H)
        page.add_redact_annot(box, fill=(0, 0, 0))
    page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_PIXELS)

doc.save(dst, garbage=4, deflate=True)
doc.close()
