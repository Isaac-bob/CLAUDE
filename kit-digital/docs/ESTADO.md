# Estado del proyecto: verificado, implementado y pendiente

Este documento separa tres categorías, como se pidió: lo **verificado** en ejecución, lo
**implementado como alternativa propia** y lo **pendiente**. No se declara ninguna fidelidad
al sitio original sin evidencia.

## 1. Sobre la referencia original (pdf2go.com/es)

**Verificado por observación (navegador headless, sin crear cuentas ni enviar formularios):**

- Página de inicio y página de la herramienta «Unir PDF» cargan correctamente (HTTP 200).
- Estructura de navegación: Aplicaciones, Editar, Comprimir, Unir, Dividir, Espacio de trabajo,
  Iniciar sesión, Registrarse; y un catálogo de más de 40 herramientas (editar, convertir,
  proteger, OCR, firmar, traducir, resumir, etc.).
- Gestión de idioma (más de 30 idiomas), modo oscuro y enlace a apps de navegador y a un
  escritorio de la plataforma.
- Garantías declaradas: cifrado TLS, cifrado en reposo, cumplimiento RGPD, pagos mediante proveedores externos.
- La interfaz de la herramienta usa una zona de subida, una lista de archivos y un botón de acción.

**No verificado:**

- Flujos de registro, inicio de sesión, recuperación, pagos, planes, historial, panel de usuario
  y administración: no se enviaron formularios ni se crearon cuentas, a propósito.
- Procesos internos de cada herramienta (límites exactos, tiempos, formatos de salida).
- Interfaz completa con archivos reales en la web original.

**Nota de diseño:** el encargo cambió a una plataforma propia, amable y fácil de entender, con
pestañas por servicio. Por eso **no se copia** el logotipo, la paleta ni los textos de la web
original; se usa una identidad propia («Kit Digital»). La comparación visual píxel a píxel con
la referencia **no es un objetivo** de esta versión.

## 2. Funcionalidades implementadas y verificadas

| Área | Funcionalidad | Cómo se verificó |
|---|---|---|
| Navegación | Pestañas de servicios, estado activo, servicios «Próximamente», 404 amigable | E2E (`ui.spec.ts`) |
| PDF | Unir (con orden ajustable), dividir por rangos o por página (ZIP), rotar, organizar/eliminar páginas, imagen a PDF, marca de agua de texto | Unitarias (`operations.test.ts`) + API E2E + UI E2E |
| PDF | Mensajes de error claros (páginas fuera de rango, tipo de archivo, texto vacío) | API E2E y UI E2E |
| Cuenta | Registro, inicio de sesión, cierre de sesión, sesiones con caducidad de 14 días | API E2E y UI E2E |
| Cuenta | Historial propio de operaciones; nadie ve el historial de otro | API E2E (aislamiento) |
| Recuperación | Solicitud con respuesta genérica, cambio con token de un solo uso y 30 min de validez | API E2E (casos negativos). **Flujo completo con correo real: pendiente** (ver §4) |
| Administración | Panel con indicadores, búsqueda de usuarios, cambio de rol y activación, listado de operaciones | API E2E y UI E2E |
| Seguridad | Autorización en servidor, protección de auto-bloqueo del admin, revocación al desactivar, cabeceras | API E2E |
| Responsive | Sin desplazamiento horizontal en 8 pantallas en móvil (Pixel 5) | E2E móvil |
| Datos | Esquema Prisma, migración inicial, semilla de administrador, auditoría | `migrate deploy` y `db:seed` ejecutados |

**Resultado de las pruebas en el último ciclo:** typecheck OK, ESLint sin errores, build de producción
OK, pruebas unitarias (35), API E2E (20), interfaz de escritorio y móvil (20 entre ambos proyectos).

## 3. Implementado como alternativa propia

- **Procesamiento PDF** con pdf-lib en el propio servidor, en lugar de servicios externos. Ventaja:
  sin dependencias de pago ni envío de archivos a terceros. Limitación: no hace conversiones que
  requieren motor de render o OCR.
- **Empaquetado ZIP** propio, sin compresión, para las salidas múltiples (los PDF ya están comprimidos).
- **Correo**: interfaz `lib/mailer` con driver de consola. Sustituirlo por SMTP o un proveedor transaccional.
- **Límites de tasa** en memoria del proceso (válido para una instancia). Para varias instancias, usar Redis.
- **Archivos**: se procesan en memoria y se descartan; no hay almacenamiento persistente de contenido.
  Esto cumple «no guardamos tu contenido», pero impide funciones como «continuar más tarde».

## 4. Pendiente (no implementado)

Herramientas PDF que aparecen como próximas en la interfaz y no están hechas:

- Comprimir PDF (requiere optimización de imágenes, no solo reescritura de PDF).
- PDF a Word, PDF a JPG, PDF a Excel, PDF a PowerPoint (requieren conversión de formato real).
- Proteger con contraseña y desbloquear (pdf-lib no cifra PDF; requiere otra librería o motor).
- Eliminar páginas en blanco, OCR, firma electrónica, reparación de PDF.

Otros pendientes de la plataforma:

- Envío real de correos de recuperación (hoy: consola del servidor en desarrollo).
- Verificación de correo al registrarse.
- Límites diferenciados por plan (cuenta gratuita vs. premium) y pagos. Hoy todo es gratuito y sin límite de cuenta.
- Servicios de grabación de pantalla y transcripción: solo existen como pestañas «Próximamente».
- Imagen Docker: definida pero no construida en el entorno de desarrollo.
- Lectura de la web original desde el navegador de pruebas: depende de que `www.pdf2go.com` esté permitido en la red de la sesión.
