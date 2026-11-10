# Kit Digital

Plataforma de herramientas digitales sencillas, organizada en **servicios por pestañas**.
Cada servicio es una sección independiente: hoy está disponible **PDF**, y están previstos
**Grabación de pantalla** y **Transcripción**.

- Frontend: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4.
- Backend: rutas de API de Next.js (Node.js), validación con Zod.
- Base de datos: PostgreSQL 16 con Prisma 6.
- Procesamiento PDF: pdf-lib (en el propio servidor, sin servicios externos).
- Autenticación: contraseñas con bcrypt (coste 12), sesiones en cookie httpOnly, token guardado solo como hash SHA-256.
- Pruebas: Vitest (unitarias) y Playwright (API, interfaz y responsive).

Estado detallado de lo verificado y lo pendiente: [docs/ESTADO.md](docs/ESTADO.md).

## Estructura

```
app/                  Páginas y rutas de API (App Router)
  page.tsx            Inicio con los servicios
  pdf/                Servicio PDF (índice y una página por herramienta)
  [module]/           Servicios aún no disponibles (muestran aviso "Próximamente")
  cuenta/             Acceso, registro e historial del usuario
  recuperar/          Recuperación de contraseña
  admin/              Panel de administración (solo ADMIN)
  api/                API REST (auth, pdf, jobs, admin)
components/           Componentes de interfaz (shell, pdf, auth, account, admin)
modules/
  registry.ts         Registro de servicios (pestañas). Único lugar donde se añade un servicio.
  pdf/tools.ts        Catálogo de herramientas PDF (interfaz y API comparten esta definición)
lib/                  Lógica de servidor: db, auth, sesiones, contraseñas, PDF, ZIP, validación
prisma/               Esquema, migraciones y semilla (administrador inicial)
tests/unit/           Pruebas unitarias
tests/e2e/            Pruebas de API, interfaz y responsive
```

## Añadir un nuevo servicio (por ejemplo, grabación de pantalla)

1. Crea `modules/grabacion/` con su lógica y su catálogo de acciones.
2. Añade una entrada en `modules/registry.ts` con `status: "available"`. Aparecerá como pestaña automáticamente.
3. Crea sus páginas en `app/grabacion/` (si necesita rutas propias) y sus endpoints en `app/api/grabacion/`.
4. Si guarda operaciones, reutiliza el modelo `Job` con `module: "grabacion"`.

## Requisitos

- Node.js 22 o superior
- PostgreSQL 16 (o usa `docker compose up db`)

## Instalación y ejecución local

```bash
cp .env.example .env          # ajusta DATABASE_URL, ADMIN_EMAIL y ADMIN_PASSWORD
npm install
npx prisma migrate deploy     # crea las tablas
npm run db:seed               # crea el administrador inicial desde .env
npm run dev                   # http://localhost:3000
```

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión a PostgreSQL. |
| `APP_URL` | No | URL pública (enlaces de recuperación). Por defecto `http://localhost:3000`. |
| `MAX_UPLOAD_MB` | No | Tamaño máximo por archivo en MB (25 por defecto). |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | No | Mismo límite para la interfaz (debe coincidir con `MAX_UPLOAD_MB`). |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Para sembrar | Administrador inicial. La contraseña debe tener 12+ caracteres. |
| `RATE_LIMIT_FACTOR` | No | Multiplicador de los límites de tasa (solo para pruebas automatizadas). |
| `MAIL_DRIVER` | No | Sin valor, los correos de recuperación se escriben en la consola del servidor. |

No guardes `.env` en el repositorio. `.gitignore` ya lo excluye.

## Pruebas

```bash
npm run typecheck             # tipos TypeScript
npm run lint                  # ESLint
npm test                      # unitarias (Vitest)
npm run build && npm start &  # servidor en el puerto 3000
npx playwright test           # API, interfaz de escritorio y responsive
```

Para Playwright con un Chromium ya instalado, define `CHROMIUM_PATH=/ruta/al/chromium`.

## Despliegue

`Dockerfile` y `docker-compose.yml` incluidos. El contenedor aplica las migraciones al arrancar.

```bash
docker compose up --build
docker compose exec app npm run db:seed   # crea el administrador (con ADMIN_* en .env)
```

> La imagen Docker no se ha construido en el entorno donde se desarrolló (no había daemon de Docker).
> Verifica el build en tu máquina o CI antes de desplegar.

## Seguridad aplicada

- Validación de entradas en cliente y, sobre todo, en servidor (Zod).
- Detección del tipo real de archivo por firma binaria (`%PDF-`, JPEG, PNG), no por extensión.
- Límite de tamaño por archivo y de número de archivos por herramienta.
- Autorización en servidor en cada endpoint privado; el panel de administración se protege en el servidor, no en el cliente.
- Un administrador no puede quitarse sus propios permisos ni desactivarse.
- Desactivar una cuenta revoca sus sesiones.
- Respuestas genéricas en registro, acceso y recuperación para no revelar qué correos existen.
- Límites de tasa por IP y por correo en acceso, registro y recuperación; límite en la API de PDF.
- Cabeceras: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, política de permisos restrictiva.
- Auditoría de acciones sensibles (`AuditLog`) con IP almacenada solo como hash.
- Los archivos subidos no se guardan en disco ni en base de datos: se procesan en memoria y se descartan.

Límites de tasa: el contador vive en memoria del proceso. Con varias instancias
hay que moverlo a Redis u otro almacén compartido.
