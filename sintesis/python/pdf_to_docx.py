"""PDF a Word (.docx) con pdf2docx. Uso: pdf_to_docx.py <entrada.pdf> <salida.docx>"""
import sys
from pdf2docx import Converter

src, dst = sys.argv[1], sys.argv[2]
cv = Converter(src)
try:
    cv.convert(dst, start=0, end=None)
finally:
    cv.close()
