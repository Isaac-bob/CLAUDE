# Imagen de Síntesis con todos los motores de las herramientas PDF.
# No se ha construido en el entorno de desarrollo (sin daemon de Docker): verifícala antes de desplegar.
FROM node:22-bookworm AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:22-bookworm AS run
ENV DEBIAN_FRONTEND=noninteractive NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 \
    SINTESIS_PYTHON=/opt/sintesis-venv/bin/python SINTESIS_OCRMYPDF=/opt/sintesis-venv/bin/ocrmypdf \
    SINTESIS_STORAGE_DIR=/app/storage
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends \
      qpdf ghostscript poppler-utils djvulibre-bin espeak-ng ffmpeg pandoc \
      tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng hunspell hunspell-es fonts-dejavu-core \
      libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui python3-venv \
    && rm -rf /var/lib/apt/lists/*
COPY python /app/python
RUN python3 -m venv /opt/sintesis-venv && /opt/sintesis-venv/bin/pip install --no-cache-dir -r /app/python/requirements.txt
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
RUN useradd --system --create-home sintesis && mkdir -p /app/storage && chown -R sintesis /app/storage
USER sintesis
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
