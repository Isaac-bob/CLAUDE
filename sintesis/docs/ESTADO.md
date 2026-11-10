# Estado del proyecto Síntesis

Este documento separa lo que está **verificado** en ejecución de lo que está **implementado pero depende de configuración** o de un servicio externo, y lo que está **pendiente**. Cada cifra sale de la matriz de pruebas (`test-results/engines-matrix.json`), no de una estimación.

## Resumen

- **Catálogo:** 48 herramientas PDF, las mismas 48 aplicaciones de la página `/es/apps` de la referencia. Cada una tiene su equivalente indicado en la tabla.
- **Funcionan en el servidor de pruebas:** 44 (respuesta HTTP 200 con archivo o texto válido; las de contenido crítico comprobadas en el contenido, no solo en el código de respuesta).
- **Requieren configuración del servidor:** 3. Responden con un aviso explícito (HTTP 503 `requires-config`) y **no simulan resultados**: IA (Chatear, Traducir) y voz a texto (Audio a texto).
- **Requieren Internet:** 1. Página web a PDF tiene el código y la protección SSRF verificados; la conversión real no se ha podido probar aquí porque este entorno no resuelve dominios públicos.
- **Pruebas:** 55 unitarias (Vitest) y 109 de Playwright (API, motores, contenido real, interfaz de escritorio y móvil). Todas pasan.

## Cómo se verifica cada herramienta

1. **Matriz de motores** (`tests/e2e/engines.spec.ts`): ejecuta las 48 herramientas por la API con archivos de prueba reales (`tests/fixtures/`) y registra el resultado.
2. **Contenido** (`tests/e2e/content.spec.ts`): comprueba que la censura elimina el texto bajo la zona, que el OCR extrae texto de un escaneo, que la protección cifra el PDF, que la limpieza borra el autor, que la marca aparece en el contenido y que la conversión a Word conserva el texto.
3. **Interfaz** (`tests/e2e/ui.spec.ts`): flujos de usuario reales, incluido dibujar un recuadro para censurar y firmar a mano con descarga del resultado.

## Tabla de las 48 herramientas

| # | Herramienta | Pestaña | Estado en el servidor | Verificación | Equivalente en la referencia (/es/apps) |
|---|---|---|---|---|---|
| 1 | Editar PDF | Editar | Funciona (HTTP 200) (59 ms) | Respuesta y tipo de archivo (comprobado)  `editar-pdf` |
| 2 | Firmar PDF | Editar | Funciona (HTTP 200) (63 ms) | Respuesta y tipo de archivo (comprobado)  `firmar-pdf` |
| 3 | Censurar PDF | Editar | Funciona (HTTP 200) (148 ms) | Texto bajo la zona eliminado (comprobado)  `censurar-pdf` |
| 4 | Marca de agua | Editar | Funciona (HTTP 200) (15 ms) | Marca presente en el contenido (comprobado)  `marca-de-agua-pdf` |
| 5 | Limpiar PDF | Editar | Funciona (HTTP 200) (11 ms) | Metadatos eliminados (comprobado)  `eliminar-recursos-pdf` |
| 6 | Recortar PDF | Editar | Funciona (HTTP 200) (11 ms) | Respuesta y tipo de archivo (comprobado)  `recortar-pdf` |
| 7 | Creador de PDF | Editar | Funciona (HTTP 200) (47 ms) | Respuesta y tipo de archivo (comprobado)  `crear-pdf` |
| 8 | Comparar PDF | Editar | Funciona (HTTP 200) (104 ms) | Respuesta y tipo de archivo (comprobado)  `comparar-pdf` |
| 9 | Unir PDF | Organizar | Funciona (HTTP 200) (18 ms) | Respuesta y tipo de archivo (comprobado)  `fusionar-pdf` |
| 10 | Dividir PDF | Organizar | Funciona (HTTP 200) (11 ms) | Respuesta y tipo de archivo (comprobado)  `dividir-pdf` |
| 11 | Organizar páginas | Organizar | Funciona (HTTP 200) (11 ms) | Respuesta y tipo de archivo (comprobado)  `ordenar-eliminar-pdf` |
| 12 | Rotar PDF | Organizar | Funciona (HTTP 200) (10 ms) | Respuesta y tipo de archivo (comprobado)  `rotar-pdf` |
| 13 | Distribución de páginas | Organizar | Funciona (HTTP 200) (15 ms) | Respuesta y tipo de archivo (comprobado)  `diseno-de-pagina-pdf` |
| 14 | Crear folleto | Organizar | Funciona (HTTP 200) (14 ms) | Respuesta y tipo de archivo (comprobado)  `crear-cuadernillo` |
| 15 | Imprimir póster | Organizar | Funciona (HTTP 200) (17 ms) | Respuesta y tipo de archivo (comprobado)  `imprimir-poster` |
| 16 | Cambiar tamaño de página | Organizar | Funciona (HTTP 200) (32 ms) | Respuesta y tipo de archivo (comprobado)  `cambiar-tamano-pdf` |
| 17 | Extraer PDF | Organizar | Funciona (HTTP 200) (23 ms) | Respuesta y tipo de archivo (comprobado)  `extraer-recursos` |
| 18 | Comprimir PDF | Optimizar y seguridad | Funciona (HTTP 200) (58 ms) | Respuesta y tipo de archivo (comprobado)  `comprimir-pdf` |
| 19 | Optimizar PDF | Optimizar y seguridad | Funciona (HTTP 200) (20 ms) | Respuesta y tipo de archivo (comprobado)  `optimizar-pdf` |
| 20 | Reparar PDF | Optimizar y seguridad | Funciona (HTTP 200) (71 ms) | Respuesta y tipo de archivo (comprobado)  `reparar-pdf` |
| 21 | OCR de PDF | Optimizar y seguridad | Funciona (HTTP 200) (1628 ms) | Texto extraído de un escaneo (comprobado)  `hacer-busquedas-pdf` |
| 22 | De PDF a PDF/A | Optimizar y seguridad | Funciona (HTTP 200) (667 ms) | Respuesta y tipo de archivo (comprobado)  `convertir-a-pdfa` |
| 23 | Validar PDF/A | Optimizar y seguridad | Funciona (HTTP 200) (53 ms) | Respuesta y tipo de archivo (comprobado)  `validar-pdfa` |
| 24 | Proteger PDF | Optimizar y seguridad | Funciona (HTTP 200) (28 ms) | Cifrado: no se puede leer sin contraseña (comprobado)  `proteger-pdf` |
| 25 | Desbloquear PDF | Optimizar y seguridad | Funciona (HTTP 200) (20 ms) | Desbloquea tras proteger (comprobado)  `desbloquear-pdf` |
| 26 | Compartir PDF | Optimizar y seguridad | Funciona (HTTP 200) (13 ms) | Enlace descargable hasta caducar (comprobado)  `compartir-documento` |
| 27 | PDF a Word | Convertir desde PDF | Funciona (HTTP 200) (325 ms) | Respuesta y tipo de archivo (comprobado)  `pdf-a-word` |
| 28 | PDF a JPG | Convertir desde PDF | Funciona (HTTP 200) (56 ms) | Respuesta y tipo de archivo (comprobado)  `pdf-a-jpg` |
| 29 | PDF a Excel | Convertir desde PDF | Funciona (HTTP 200) (294 ms) | Respuesta y tipo de archivo (comprobado)  `pdf-a-excel` |
| 30 | PDF a PowerPoint | Convertir desde PDF | Funciona (HTTP 200) (337 ms) | Respuesta y tipo de archivo (comprobado)  `pdf-a-powerpoint` |
| 31 | PDF a texto | Convertir desde PDF | Funciona (HTTP 200) (25 ms) | Texto conservado (comprobado)  `pdf-a-text` |
| 32 | PDF a EPUB | Convertir desde PDF | Funciona (HTTP 200) (54 ms) | Respuesta y tipo de archivo (comprobado)  `pdf-a-epub` |
| 33 | PDF a voz | Convertir desde PDF | Funciona (HTTP 200) (220 ms) | Respuesta y tipo de archivo (comprobado)  `texto-a-voz` |
| 34 | Extraer datos de un PDF | Convertir desde PDF | Funciona (HTTP 200) (274 ms) | Respuesta y tipo de archivo (comprobado)  `extraer-datos-de-pdf` |
| 35 | Word a PDF | Convertir a PDF | Funciona (HTTP 200) (986 ms) | Texto del documento en el PDF (comprobado)  `word-a-pdf` |
| 36 | Excel a PDF | Convertir a PDF | Funciona (HTTP 200) (911 ms) | Respuesta y tipo de archivo (comprobado)  `excel-a-pdf` |
| 37 | PowerPoint a PDF | Convertir a PDF | Funciona (HTTP 200) (1042 ms) | Respuesta y tipo de archivo (comprobado)  `powerpoint-a-pdf` |
| 38 | EPUB a PDF | Convertir a PDF | Funciona (HTTP 200) (1099 ms) | Respuesta y tipo de archivo (comprobado)  `epub-a-pdf` |
| 39 | JPG a PDF | Convertir a PDF | Funciona (HTTP 200) (15 ms) | Respuesta y tipo de archivo (comprobado)  `jpg-a-pdf` |
| 40 | PNG a PDF | Convertir a PDF | Funciona (HTTP 200) (121 ms) | Respuesta y tipo de archivo (comprobado)  `png-a-pdf` |
| 41 | Imagen a PDF | Convertir a PDF | Funciona (HTTP 200) (14 ms) | Respuesta y tipo de archivo (comprobado)  `imagen-a-pdf` |
| 42 | DJVU a PDF | Convertir a PDF | Funciona (HTTP 200) (51 ms) | Respuesta y tipo de archivo (comprobado)  `djvu-a-pdf` |
| 43 | Página web a PDF | Convertir a PDF | Código listo; sin Internet aquí (18 ms) | Bloqueo SSRF comprobado; conversión real no verificada (sin DNS aquí)  `pagina-web-a-pdf` |
| 44 | Chatear con PDF | IA y lenguaje | Requiere configuración (5 ms) | Aviso 503 explícito (comprobado). Ejecución con proveedor: no verificada  `chatear-con-pdf` |
| 45 | Traducir PDF | IA y lenguaje | Requiere configuración (5 ms) | Aviso 503 explícito (comprobado). Ejecución con proveedor: no verificada  `traducir-pdf` |
| 46 | Resumir PDF | IA y lenguaje | Funciona (HTTP 200) (23 ms) | Devuelve texto (comprobado; resumen local sin IA)  `resumir-pdf` |
| 47 | Corregir ortografía de PDF | IA y lenguaje | Funciona (HTTP 200) (175 ms) | Devuelve revisión (comprobado)  `corregir-ortografia-pdf` |
| 48 | Audio a texto | IA y lenguaje | Requiere configuración (6 ms) | Aviso 503 explícito (comprobado). Ejecución con proveedor: no verificada  `voz-a-texto` |

Las herramientas marcadas como «requiere configuración» devuelven ese aviso con HTTP 503. Para activarlas, define las variables indicadas en `.env.example` y reinicia el servidor.

## Lo que depende de configuración

| Función | Variable | Estado en este entorno |
|---|---|---|
| Chatear con PDF, Traducir PDF | `ANTHROPIC_API_KEY` (opcional `SINTESIS_AI_MODEL`) | Aviso 503 comprobado. La llamada real al proveedor **no** está verificada: el entorno no tiene acceso a esa API. |
| Resumir PDF | Opcional (`ANTHROPIC_API_KEY`) | Funciona sin IA con un resumen automático local (frases más representativas). Con IA, el resumen es más completo (no verificado con el proveedor). |
| Audio a texto | `SINTESIS_STT_API_KEY` (y opcional `SINTESIS_STT_URL`, `SINTESIS_STT_MODEL`) | Aviso 503 comprobado. Se intentó usar Whisper local, pero el modelo no se puede descargar desde este entorno (403 del proxy), así que se dejó un proveedor configurable. |
| Página web a PDF | `CHROMIUM_PATH` | El navegador está instalado aquí. La conversión necesita Internet, que este entorno no tiene. |

## Limitaciones conocidas (honestas)

- **Calidad de conversión:** PDF a Word, Excel y PowerPoint dependen del diseño del original. Un escaneo necesita OCR antes de convertirse bien.
- **PDF a EPUB** conserva el texto, no el diseño de página.
- **Compresión** (Ghostscript) reduce calidad según el nivel elegido; el resultado varía mucho según las imágenes del PDF.
- **Validar PDF/A** es una comprobación básica (identificador XMP, fuentes incrustadas, cifrado, JavaScript). Para una certificación oficial se necesita veraPDF.
- **Voz (PDF a voz)** usa espeak-ng: voz sintética de calidad básica.
- **Traducir y resumir con IA** trabajan con el texto del PDF; no conservan el diseño.
- **Censura:** elimina el texto e imágenes bajo cada zona (PyMuPDF). Revisa el resultado antes de compartirlo.
- **Compartir PDF:** el archivo se guarda en disco solo durante el plazo elegido (1 a 30 días) y se borra al caducar. Los enlaces no tienen contraseña propia.
- **Límites de tasa y cola de operaciones** viven en la memoria del proceso. Con varias instancias hay que moverlos a Redis.
- **Concurrencia:** `SINTESIS_MAX_JOBS` (por defecto 2) limita las operaciones pesadas simultáneas; las que esperan más de un minuto reciben un aviso de servidor ocupado.
- **Contraseñas en herramientas:** las de «Proteger» y «Desbloquear» se pasan a qpdf por un fichero temporal con permisos restringidos, no por la línea de comandos.

## Pendiente (fuera del alcance de esta versión)

- Servicios de **grabación de pantalla** y **transcripción** (solo existen como pestañas «Próximamente»).
- Proveedor de correo real para la recuperación de contraseñas (hoy, consola del servidor).
- Verificación de correo al registrarse y planes de pago.
- Validación PDF/A certificada (veraPDF) y OCR con modelos de idioma adicionales.
- Editor de PDF avanzado (arrastrar y redimensionar textos existentes); hoy se añaden textos y recuadros nuevos.
- Verificación de la conversión de páginas web en un entorno con Internet.

## Aspectos legales a revisar antes de un servicio público

Varios motores usan licencias copyleft. Estar en un servicio alojado puede exigir obligaciones adicionales; conviene una revisión legal antes de publicar:

- **AGPL:** Ghostscript y PyMuPDF (usado por la censura y por pdf2docx).
- **GPL:** Poppler (`pdftoppm`, `pdftotext`, `pdfimages`), Pandoc, DjVuLibre, espeak-ng.
- **LGPL/GPL:** FFmpeg (según compilación).
- **MPL:** LibreOffice, OCRmyPDF.
- **Permisivas (MIT/Apache):** pdf-lib, fontkit, pdf2docx, pdfplumber, python-pptx, openpyxl, qpdf (Apache-2.0), Playwright.

El nombre «Síntesis» y el logotipo deben comprobarse frente a registros de marca antes de usarlos comercialmente.
