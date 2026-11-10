#!/bin/bash
# Genera los archivos de prueba que usan las pruebas de motores (tests/e2e/engines.spec.ts).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
PY=${SINTESIS_PYTHON:-/opt/sintesis-venv/bin/python}
cd "$DIR"

cat > sample.md <<'MD'
# Informe de prueba

Este documento se usa para comprobar las herramientas de Síntesis. Incluye acentos, ñandú y textos
suficientes para que la comparación, el resumen y la revisión ortográfica tengan contenido.

## Datos

El contrato entra en vigor el primer día del mes siguiente a la firma. La entrega se realiza en la oficina central.
MD
pandoc sample.md -o sample.docx
pandoc sample.md -o sample.epub --metadata title="Informe de prueba"

$PY - <<'PY'
from PIL import Image, ImageDraw, ImageFont
from pdf_fixture import make_pdf, make_scan_pdf
import openpyxl
from pptx import Presentation
from pptx.util import Inches

make_pdf("sample.pdf", pages=3)
make_scan_pdf("scan.pdf")

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "Datos"
for row in [["Producto", "Cantidad", "Precio"], ["Papel", 10, 2.5], ["Tinta", 3, 12.0]]:
    ws.append(row)
wb.save("sample.xlsx")

prs = Presentation()
slide = prs.slides.add_slide(prs.slide_layouts[5])
slide.shapes.title.text = "Presentación de prueba"
prs.save("sample.pptx")

img = Image.new("RGB", (800, 600), "white")
d = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
except OSError:
    f = None
d.text((60, 260), "Foto de prueba", fill=(1, 0, 62), font=f)
img.save("sample.jpg", quality=90)
img.save("sample.png")

sig = Image.new("RGBA", (500, 160), (0, 0, 0, 0))
sd = ImageDraw.Draw(sig)
pts = [(20, 120), (90, 40), (150, 130), (230, 30), (300, 120), (380, 50), (470, 110)]
sd.line(pts, fill=(1, 0, 62, 255), width=8, joint="curve")
sig.save("signature.png")
PY

# DjVu: imagen bitonal con texto, codificada con cjb2.
$PY - <<'PY'
from PIL import Image, ImageDraw, ImageFont
img = Image.new("1", (1200, 800), 1)
d = ImageDraw.Draw(img)
try:
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 48)
except OSError:
    f = None
d.text((80, 300), "Pagina DjVu de prueba", fill=0, font=f)
img.save("sample.pbm")
PY
cjb2 sample.pbm sample.djvu >/dev/null 2>&1
rm -f sample.pbm

espeak-ng -v es -w sample.wav "Esta es una grabación de prueba para Síntesis." 
rm -f sample.md
echo "fixtures ok"
