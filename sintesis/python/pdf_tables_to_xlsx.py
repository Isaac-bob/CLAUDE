"""PDF a Excel (.xlsx). Cada página produce una hoja con sus tablas; si no hay tablas, su texto.
Uso: pdf_tables_to_xlsx.py <entrada.pdf> <salida.xlsx>"""
import sys
import pdfplumber
from openpyxl import Workbook
from openpyxl.utils import get_column_letter

src, dst = sys.argv[1], sys.argv[2]
wb = Workbook()
wb.remove(wb.active)
found = 0

with pdfplumber.open(src) as pdf:
    for index, page in enumerate(pdf.pages, start=1):
        ws = wb.create_sheet(title=f"Página {index}"[:31])
        row = 1
        tables = page.extract_tables() or []
        for table in tables:
            for line in table:
                for col, cell in enumerate(line, start=1):
                    ws.cell(row=row, column=col, value=(cell or "").strip() if isinstance(cell, str) else cell)
                row += 1
            row += 1
            found += 1
        if not tables:
            for line in (page.extract_text() or "").splitlines():
                ws.cell(row=row, column=1, value=line)
                row += 1
        ws.column_dimensions[get_column_letter(1)].width = 28

if not wb.worksheets:
    wb.create_sheet("Vacío")
wb.save(dst)
print(f"tables={found}")
