"""Genera PDF de prueba con texto real y un PDF escaneado (solo imagen)."""
import pymupdf
from PIL import Image, ImageDraw, ImageFont
import io


def make_pdf(path, pages=3):
    doc = pymupdf.open()
    for i in range(1, pages + 1):
        page = doc.new_page(width=595, height=842)
        page.insert_text((60, 90), f"Documento de prueba - página {i}", fontsize=18)
        page.insert_text((60, 130), "Texto normal con acentos: canción, señal, ñandú.", fontsize=12)
        page.insert_text((60, 160), "Importe: 1.250,00 EUR   Fecha: 10/11/2026", fontsize=12)
    doc.save(path)
    doc.close()


def make_scan_pdf(path):
    img = Image.new("RGB", (1240, 1754), "white")
    d = ImageDraw.Draw(img)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 44)
    except OSError:
        f = None
    d.text((120, 200), "Texto escaneado de prueba", fill="black", font=f)
    d.text((120, 300), "La reunión será el jueves a las diez.", fill="black", font=f)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=70)
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    page.insert_image(page.rect, stream=buf.getvalue())
    doc.save(path)
    doc.close()
