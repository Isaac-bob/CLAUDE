# Síntesis

Plataforma de herramientas digitales claras, organizada en **servicios por pestañas**. Hoy está disponible el servicio **PDF** con 48 herramientas. Están previstos **Grabación de pantalla** y **Transcripción**.

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- **Backend:** rutas de API de Next.js (Node.js), validación con Zod.
- **Base de datos:** PostgreSQL 16 con Prisma 6.
- **Motores PDF:** pdf-lib (edición), qpdf, Ghostscript, OCRmyPDF, Poppler, LibreOffice, Pandoc, DjVuLibre, espeak-ng, Hunspell, y scripts Python (pdf2docx, pdfplumber, python-pptx, PyMuPDF). Chromium para páginas web.
- **Identidad:** logotipo y manual de marca en [`/marca`](#manual-de-marca) (PDF en `public/brand/manual-de-marca.pdf`).

Estado detallado de cada herramienta, qué está verificado y qué depende de configuración: **[docs/ESTADO.md](docs/ESTADO.md)**.

## Estructura

```
app/                  Páginas y rutas de API
  page.tsx            Inicio con los servicios
  pdf/                Sección PDF: hub por categorías y una página por herramienta
  marca/              Manual de marca (página y exportación a PDF)
  s/[id]/             Descarga pública de archivos compartidos (caducan)
  [module]/           Servicios aún no disponibles
  cuenta/ recuperar/ admin/
  api/pdf/[tool]/     Ejecuta cualquiera de las 48 herramientas
  api/pdf/preview/    Vista previa de una página (firma, censura, edición)
  api/admin/          Estadísticas, usuarios, operaciones y estado de motores
components/           Interfaz (shell, pdf, auth, account, admin)
modules/
  registry.ts         Servicios (pestañas). Único lugar donde se añade un servicio.
  pdf/catalog.ts      Catálogo de las 48 herramientas: categorías, archivos aceptados, opciones y motor
lib/
  engines/            Motores: ejecución sin shell, espacios temporales, IA, SSRF, concurrencia
  pdf/                Operaciones PDF con pdf-lib, validación por contenido, opciones
python/               Scripts de conversión (Word, Excel, PowerPoint, censura)
scripts/              Instalación de motores y exportación del manual de marca
tests/unit/           Pruebas unitarias (Vitest)
tests/e2e/            API, motores, contenido, interfaz y responsive (Playwright)
tests/fixtures/       Archivos de prueba y su generador
```

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 (o `docker compose up db`)
- Motores de sistema y Python: `sudo bash scripts/setup-engines.sh` (Ubuntu/Debian)

## Instalación local

```bash
cp .env.example .env          # ajusta DATABASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD
npm install
npx prisma migrate deploy     # crea las tablas
npm run db:seed               # crea el administrador desde .env
sudo bash scripts/setup-engines.sh
npm run build && npm start    # http://localhost:3000
```

En `.env` define `SINTESIS_PYTHON` y `SINTESIS_OCRMYPDF` apuntando al entorno que cree el script
(por defecto, `/opt/sintesis-venv`).

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | PostgreSQL. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Para sembrar | Administrador inicial (contraseña de 12+ caracteres). |
| `APP_URL` | No | URL pública (enlaces de recuperación y de compartir). |
| `MAX_UPLOAD_MB` / `NEXT_PUBLIC_MAX_UPLOAD_MB` | No | Límite por archivo (25 por defecto). Deben coincidir. |
| `SINTESIS_MAX_JOBS` | No | Operaciones pesadas simultáneas (2 por defecto). |
| `SINTESIS_PYTHON`, `SINTESIS_OCRMYPDF`, `CHROMIUM_PATH` | No | Rutas de motores. |
| `SINTESIS_STORAGE_DIR` | No | Carpeta de archivos compartidos (`./storage` por defecto). |
| `ANTHROPIC_API_KEY`, `SINTESIS_AI_MODEL` | No | Activa Chatear y Traducir (y mejora Resumir). |
| `SINTESIS_STT_API_KEY`, `SINTESIS_STT_URL`, `SINTESIS_STT_MODEL` | No | Activa Audio a texto. |
| `RATE_LIMIT_FACTOR` | No | Multiplica los límites de tasa (solo para pruebas). |

Nunca subas `.env` al repositorio. `.gitignore` ya lo excluye.

## Añadir un servicio nuevo (grabación de pantalla, transcripción…)

1. Crea su carpeta en `modules/` con su catálogo de acciones, igual que `modules/pdf/catalog.ts`.
2. Añade una entrada en `modules/registry.ts` con `status: "available"`. Aparecerá como pestaña.
3. Crea sus páginas en `app/<servicio>/` y sus endpoints en `app/api/<servicio>/`.
4. Si guarda operaciones, reutiliza el modelo `Job` con `module: "<servicio>"`.

## Herramientas PDF: cómo añadir una

1. Añade la entrada en `modules/pdf/catalog.ts` (ranuras de archivo, opciones y `engine`).
2. Implementa la función en `lib/engines/index.ts` y regístrala en `ENGINES`.
3. Añade su fila a la matriz (`tests/e2e/engines.spec.ts` la recorre sola) y, si tiene contenido verificable, una prueba en `content.spec.ts`.

## Pruebas

```bash
npm run typecheck
npm run lint
npm test                              # unitarias (Vitest)
npx playwright test                   # API, motores, contenido, escritorio y móvil
```

`npx playwright test` arranca `next start` en el puerto 3000 si no está en marcha.
Para usar otro Chromium: `CHROMIUM_PATH=/ruta/chromium`. Las pruebas regeneran la
matriz en `test-results/engines-matrix.json`.

Los archivos de prueba se generan con `bash tests/fixtures/make-fixtures.sh`.

## Manual de marca

- Página: `/marca` (también enlazada desde el pie).
- PDF: `node scripts/export-brand-manual.mjs` (necesita la aplicación en marcha) → `public/brand/manual-de-marca.pdf`.

## Despliegue

`Dockerfile` instala todos los motores y el entorno Python. `docker compose up --build` levanta
la base de datos y la aplicación; el contenedor aplica las migraciones al arrancar.

> La imagen no se ha construido en el entorno de desarrollo (no hay daemon de Docker). Verifícala
> en tu máquina o en CI antes de desplegar.

## Seguridad aplicada

- Validación de entradas en cliente y servidor (Zod y catálogo de opciones).
- **Tipo de archivo por contenido** (firma binaria), nunca por la extensión.
- Límites de tamaño y de número de archivos por herramienta.
- **Ejecución sin shell:** los argumentos de los motores nunca se interpretan como comandos. Las contraseñas se pasan por fichero temporal con permisos 0600.
- **Protección SSRF** en «Página web a PDF»: bloquea redes privadas, loopback, metadatos de nube y redirecciones hacia ellas.
- **Censura real:** elimina el texto e imágenes bajo cada zona, no solo la tapa.
- Los archivos se procesan en un espacio temporal que se borra siempre al terminar.
- Autorización en servidor en cada endpoint privado; el panel de administración se protege en servidor.
- Límites de tasa por IP y por correo; cola de operaciones pesadas.
- Cabeceras de seguridad (`X-Frame-Options: DENY`, `nosniff`, política de permisos restrictiva).
- Auditoría de acciones sensibles; la IP se guarda solo como hash.
