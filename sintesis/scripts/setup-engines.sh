#!/usr/bin/env bash
# Instala los motores que usan las herramientas PDF en Ubuntu/Debian.
# Uso: sudo bash scripts/setup-engines.sh
set -euo pipefail
VENV="${SINTESIS_VENV:-/opt/sintesis-venv}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
  qpdf ghostscript poppler-utils djvulibre-bin espeak-ng ffmpeg pandoc \
  tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng \
  hunspell hunspell-es fonts-dejavu-core \
  libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui \
  python3-venv

python3 -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install -r "$(dirname "$0")/../python/requirements.txt"

echo "Motores instalados. Define en .env: SINTESIS_PYTHON=$VENV/bin/python y SINTESIS_OCRMYPDF=$VENV/bin/ocrmypdf"
echo "Para «Página web a PDF» instala Chromium: npx playwright install chromium (y define CHROMIUM_PATH)."
