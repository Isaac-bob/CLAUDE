"""Imágenes a PowerPoint (.pptx): una diapositiva 16:9 por imagen.
Uso: images_to_pptx.py <salida.pptx> <imagen1> [imagen2 ...]"""
import sys
from pptx import Presentation
from pptx.util import Emu
from PIL import Image

dst, images = sys.argv[1], sys.argv[2:]
prs = Presentation()
prs.slide_width = Emu(12192000)
prs.slide_height = Emu(6858000)
blank = prs.slide_layouts[6]
SW, SH = prs.slide_width, prs.slide_height

for path in images:
    slide = prs.slides.add_slide(blank)
    with Image.open(path) as im:
        w, h = im.size
    scale = min(SW / w, SH / h)
    pw, ph = int(w * scale), int(h * scale)
    left, top = int((SW - pw) / 2), int((SH - ph) / 2)
    slide.shapes.add_picture(path, Emu(left), Emu(top), Emu(pw), Emu(ph))
prs.save(dst)
