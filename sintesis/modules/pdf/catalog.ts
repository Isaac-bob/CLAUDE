// Catálogo completo de herramientas PDF de Síntesis (48 aplicaciones).
// Es la única fuente de verdad: la interfaz y la API leen este archivo.
// `engine` apunta a una función de lib/engines/index.ts.

export type Category = "editar" | "organizar" | "optimizar" | "convertir-desde-pdf" | "convertir-a-pdf" | "ia";

export const CATEGORIES: { id: Category; label: string; blurb: string }[] = [
  { id: "editar", label: "Editar", blurb: "Cambia el contenido de tu PDF: texto, firmas, censura y más." },
  { id: "organizar", label: "Organizar", blurb: "Une, separa, gira y distribuye las páginas." },
  { id: "optimizar", label: "Optimizar y seguridad", blurb: "Reduce el tamaño, protege con contraseña y prepara archivos oficiales." },
  { id: "convertir-desde-pdf", label: "Convertir desde PDF", blurb: "Pasa tu PDF a Word, Excel, PowerPoint, imágenes y más." },
  { id: "convertir-a-pdf", label: "Convertir a PDF", blurb: "Convierte Word, Excel, imágenes, páginas web y otros formatos a PDF." },
  { id: "ia", label: "IA y lenguaje", blurb: "Resume, traduce, pregunta al documento y revisa la ortografía." },
];

export type InputKind = "pdf" | "jpg" | "png" | "docx" | "xlsx" | "pptx" | "epub" | "djvu" | "audio";

export type Slot = { key: string; label: string; accept: InputKind[]; min: number; max: number };

// requiredWhen: el campo solo es obligatorio (y solo está activo) cuando otro campo tiene ese valor.
export type Condition = { key: string; value: string };

export type FieldOption =
  | { key: string; label: string; type: "text" | "password" | "url" | "pages"; placeholder?: string; help?: string; required?: boolean; requiredWhen?: Condition; maxLength?: number }
  | { key: string; label: string; type: "textarea"; placeholder?: string; help?: string; required?: boolean; maxLength?: number }
  | { key: string; label: string; type: "select"; choices: { value: string; label: string }[]; default: string; help?: string }
  | { key: string; label: string; type: "number"; default: number; min: number; max: number; step?: number; help?: string }
  | { key: string; label: string; type: "boolean"; default: boolean; help?: string };

// Paneles especiales de la interfaz (vista previa de página, firma, censura, edición…).
export type SpecialPanel = "signature" | "redact" | "text-overlays" | "share";

export type PdfTool = {
  slug: string;
  name: string;
  summary: string;
  category: Category;
  icon: string; // nombre de icono (ver components/pdf/ToolIcon.tsx)
  slots: Slot[];
  options: FieldOption[];
  panel?: SpecialPanel;
  engine: string;
  output: "archivo" | "texto" | "enlace" | "archivo-o-texto";
  requires?: "ia" | "voz" | "chromium" | "servidor";
  requiresNote?: string;
};

const PDF = (key: string, label = "Documento PDF", min = 1, max = 1): Slot => ({ key, label, accept: ["pdf"], min, max });

export const PDF_TOOLS: PdfTool[] = [
  // ───────── Editar ─────────
  { slug: "editar", name: "Editar PDF", summary: "Añade textos y recuadros donde quieras. Haz clic en la página para colocarlos.", category: "editar", icon: "edit", slots: [PDF("documento")], options: [], panel: "text-overlays", engine: "editar", output: "archivo" },
  { slug: "firmar", name: "Firmar PDF", summary: "Coloca tu firma en la página que elijas. Dibújala o sube una imagen.", category: "editar", icon: "sign", slots: [PDF("documento"), { key: "firma", label: "Firma (dibujada o imagen PNG/JPG)", accept: ["png", "jpg"], min: 1, max: 1 }], options: [], panel: "signature", engine: "firmar", output: "archivo" },
  { slug: "censurar", name: "Censurar PDF", summary: "Tapa datos sensibles. El texto bajo la zona se elimina de verdad, no solo se tapa.", category: "editar", icon: "redact", slots: [PDF("documento")], options: [], panel: "redact", engine: "censurar", output: "archivo" },
  { slug: "marca-de-agua", name: "Marca de agua", summary: "Añade un texto diagonal semitransparente en cada página.", category: "editar", icon: "watermark", slots: [PDF("documento")], options: [
    { key: "text", label: "Texto", type: "text", placeholder: "CONFIDENCIAL", help: "Hasta 60 caracteres.", required: true, maxLength: 60 },
    { key: "opacity", label: "Opacidad (%)", type: "number", default: 30, min: 5, max: 100, step: 5 },
  ], engine: "marca-de-agua", output: "archivo" },
  { slug: "limpiar", name: "Limpiar PDF", summary: "Quita metadatos, anotaciones, adjuntos y scripts ocultos antes de compartir.", category: "editar", icon: "clean", slots: [PDF("documento")], options: [
    { key: "metadata", label: "Quitar metadatos (autor, título…)", type: "boolean", default: true },
    { key: "annotations", label: "Quitar anotaciones y comentarios", type: "boolean", default: true },
    { key: "attachments", label: "Quitar archivos adjuntos", type: "boolean", default: true },
    { key: "scripts", label: "Quitar JavaScript y acciones automáticas", type: "boolean", default: true },
  ], engine: "limpiar", output: "archivo" },
  { slug: "recortar", name: "Recortar PDF", summary: "Quita márgenes en puntos (72 puntos = 1 pulgada).", category: "editar", icon: "crop", slots: [PDF("documento")], options: [
    { key: "top", label: "Arriba (pt)", type: "number", default: 0, min: 0, max: 500 },
    { key: "right", label: "Derecha (pt)", type: "number", default: 0, min: 0, max: 500 },
    { key: "bottom", label: "Abajo (pt)", type: "number", default: 0, min: 0, max: 500 },
    { key: "left", label: "Izquierda (pt)", type: "number", default: 0, min: 0, max: 500 },
  ], engine: "recortar", output: "archivo" },
  { slug: "crear-pdf", name: "Creador de PDF", summary: "Escribe o pega tu texto y obtén un PDF bien maquetado. Usa «# » para títulos.", category: "editar", icon: "create", slots: [], options: [
    { key: "title", label: "Título (opcional)", type: "text", maxLength: 120 },
    { key: "text", label: "Contenido", type: "textarea", placeholder: "# Mi documento\n\nEscribe aquí el texto…", required: true, maxLength: 200000 },
    { key: "pageSize", label: "Tamaño de página", type: "select", choices: [{ value: "A4", label: "A4" }, { value: "Carta", label: "Carta" }], default: "A4" },
    { key: "size", label: "Tamaño de letra", type: "number", default: 11, min: 6, max: 36 },
  ], engine: "crear-pdf", output: "archivo" },
  { slug: "comparar", name: "Comparar PDF", summary: "Compara el texto de dos PDF y genera un informe con lo añadido y lo eliminado.", category: "editar", icon: "compare", slots: [PDF("original", "PDF original"), PDF("modificado", "PDF modificado")], options: [], engine: "comparar", output: "archivo-o-texto" },

  // ───────── Organizar ─────────
  { slug: "unir", name: "Unir PDF", summary: "Combina varios archivos en uno solo. Arrastra para cambiar el orden.", category: "organizar", icon: "merge", slots: [PDF("archivos", "Archivos PDF", 2, 20)], options: [], engine: "unir", output: "archivo" },
  { slug: "dividir", name: "Dividir PDF", summary: "Extrae rangos de páginas o separa cada página en su propio archivo.", category: "organizar", icon: "split", slots: [PDF("archivos")], options: [
    { key: "mode", label: "Cómo dividir", type: "select", choices: [{ value: "ranges", label: "Por rangos (1-3, 5, 8-10)" }, { value: "each", label: "Cada página por separado" }], default: "ranges" },
    { key: "ranges", label: "Rangos de páginas", type: "pages", placeholder: "1-3, 5, 8-10", help: "Cada grupo separado por comas se convierte en un PDF.", requiredWhen: { key: "mode", value: "ranges" } },
  ], engine: "dividir", output: "archivo" },
  { slug: "organizar", name: "Organizar páginas", summary: "Reordena o elimina páginas escribiendo el orden final.", category: "organizar", icon: "organize", slots: [PDF("archivos")], options: [
    { key: "order", label: "Orden final de las páginas", type: "pages", placeholder: "3, 1, 2", help: "Las páginas que no escribas se eliminan. Puedes repetir páginas.", required: true },
  ], engine: "organizar", output: "archivo" },
  { slug: "rotar", name: "Rotar PDF", summary: "Gira todas las páginas o solo algunas, en pasos de 90°.", category: "organizar", icon: "rotate", slots: [PDF("archivos")], options: [
    { key: "angle", label: "Giro", type: "select", choices: [{ value: "90", label: "90° a la derecha" }, { value: "180", label: "180°" }, { value: "270", label: "90° a la izquierda" }], default: "90" },
    { key: "pages", label: "Páginas (vacío = todas)", type: "pages", placeholder: "2, 4-6" },
  ], engine: "rotar", output: "archivo" },
  { slug: "distribucion", name: "Distribución de páginas", summary: "Pon varias páginas en cada hoja (2, 4, 6 o 9) para ahorrar papel.", category: "organizar", icon: "layout", slots: [PDF("archivos")], options: [
    { key: "perSheet", label: "Páginas por hoja", type: "select", choices: [{ value: "2", label: "2" }, { value: "4", label: "4" }, { value: "6", label: "6" }, { value: "9", label: "9" }], default: "2" },
  ], engine: "distribucion", output: "archivo" },
  { slug: "folleto", name: "Crear folleto", summary: "Reordena las páginas para imprimir un cuadernillo que se dobla y grapa.", category: "organizar", icon: "booklet", slots: [PDF("archivos")], options: [], engine: "folleto", output: "archivo" },
  { slug: "poster", name: "Imprimir póster", summary: "Reparte cada página en varias hojas A4 para armar un póster grande.", category: "organizar", icon: "poster", slots: [PDF("archivos")], options: [
    { key: "cols", label: "Hojas a lo ancho", type: "number", default: 2, min: 1, max: 6 },
    { key: "rows", label: "Hojas a lo alto", type: "number", default: 2, min: 1, max: 6 },
  ], engine: "poster", output: "archivo" },
  { slug: "cambiar-tamano", name: "Cambiar tamaño de página", summary: "Pasa tu PDF a A4, Carta, A3, A5, Oficio u otro tamaño.", category: "organizar", icon: "resize", slots: [PDF("archivos")], options: [
    { key: "size", label: "Tamaño", type: "select", choices: ["A4", "Carta", "A3", "A5", "Oficio"].map((v) => ({ value: v, label: v })), default: "A4" },
    { key: "fit", label: "Ajuste", type: "select", choices: [{ value: "contain", label: "Mostrar todo el contenido" }, { value: "cover", label: "Llenar la página (puede recortar)" }], default: "contain" },
  ], engine: "cambiar-tamano", output: "archivo" },
  { slug: "extraer-recursos", name: "Extraer PDF", summary: "Saca las imágenes incrustadas en el PDF y las descarga en un ZIP.", category: "organizar", icon: "extract", slots: [PDF("archivos")], options: [], engine: "extraer-recursos", output: "archivo" },

  // ───────── Optimizar y seguridad ─────────
  { slug: "comprimir", name: "Comprimir PDF", summary: "Reduce el tamaño del archivo. Elige cuánta calidad estás dispuesto a cambiar.", category: "optimizar", icon: "compress", slots: [PDF("archivos")], options: [
    { key: "level", label: "Nivel de compresión", type: "select", choices: [{ value: "baja", label: "Baja (máxima calidad)" }, { value: "media", label: "Media (recomendado)" }, { value: "alta", label: "Alta (archivo más pequeño)" }], default: "media" },
  ], engine: "comprimir", output: "archivo-o-texto" },
  { slug: "optimizar", name: "Optimizar PDF", summary: "Mejora la estructura del archivo sin perder calidad y lo prepara para web.", category: "optimizar", icon: "optimize", slots: [PDF("archivos")], options: [
    { key: "linearize", label: "Preparar para vista web (carga por partes)", type: "boolean", default: true },
  ], engine: "optimizar", output: "archivo" },
  { slug: "reparar", name: "Reparar PDF", summary: "Intenta recuperar un PDF dañado o que no abre bien.", category: "optimizar", icon: "repair", slots: [PDF("archivos")], options: [], engine: "reparar", output: "archivo-o-texto" },
  { slug: "ocr", name: "OCR de PDF", summary: "Convierte escaneos en PDF con texto que se puede buscar y copiar.", category: "optimizar", icon: "ocr", slots: [PDF("archivos")], options: [
    { key: "language", label: "Idioma del documento", type: "select", choices: [{ value: "spa+eng", label: "Español e inglés" }, { value: "spa", label: "Español" }, { value: "eng", label: "Inglés" }], default: "spa+eng" },
  ], engine: "ocr", output: "archivo" },
  { slug: "convertir-a-pdfa", name: "De PDF a PDF/A", summary: "Convierte el archivo a PDF/A, el formato pensado para archivar a largo plazo.", category: "optimizar", icon: "archive", slots: [PDF("archivos")], options: [], engine: "pdfa", output: "archivo" },
  { slug: "validar-pdfa", name: "Validar PDF/A", summary: "Comprueba los requisitos básicos de PDF/A y te dice qué falla.", category: "optimizar", icon: "check", slots: [PDF("archivos")], options: [], engine: "validar-pdfa", output: "texto", requiresNote: "Validación básica. Para certificación oficial se necesita veraPDF." },
  { slug: "proteger", name: "Proteger PDF", summary: "Pon una contraseña para abrirlo y elige qué pueden hacer otros con él.", category: "optimizar", icon: "lock", slots: [PDF("archivos")], options: [
    { key: "userPassword", label: "Contraseña para abrir (mín. 4 caracteres)", type: "password", required: true },
    { key: "ownerPassword", label: "Contraseña de propietario (opcional)", type: "password", help: "Si la dejas vacía se genera una y se muestra al terminar." },
    { key: "allowPrint", label: "Permitir imprimir", type: "boolean", default: true },
    { key: "allowCopy", label: "Permitir copiar texto", type: "boolean", default: false },
    { key: "allowModify", label: "Permitir modificar", type: "boolean", default: false },
  ], engine: "proteger", output: "archivo-o-texto" },
  { slug: "desbloquear", name: "Desbloquear PDF", summary: "Quita la contraseña de un PDF cuando la conoces.", category: "optimizar", icon: "unlock", slots: [PDF("archivos")], options: [
    { key: "password", label: "Contraseña actual", type: "password", required: true },
  ], engine: "desbloquear", output: "archivo" },
  { slug: "compartir", name: "Compartir PDF", summary: "Sube el PDF y obtén un enlace para compartirlo. El enlace caduca solo.", category: "optimizar", icon: "share", slots: [PDF("archivos")], options: [
    { key: "days", label: "Días de validez", type: "number", default: 7, min: 1, max: 30 },
  ], panel: "share", engine: "compartir", output: "enlace", requiresNote: "Guardamos este archivo solo para el enlace y lo borramos al caducar." },

  // ───────── Convertir desde PDF ─────────
  { slug: "pdf-a-word", name: "PDF a Word", summary: "Convierte tu PDF a un documento de Word editable (.docx).", category: "convertir-desde-pdf", icon: "word", slots: [PDF("archivos")], options: [], engine: "pdf-a-word", output: "archivo" },
  { slug: "pdf-a-jpg", name: "PDF a JPG", summary: "Obtén una imagen JPG por cada página.", category: "convertir-desde-pdf", icon: "image", slots: [PDF("archivos")], options: [
    { key: "dpi", label: "Resolución (ppp)", type: "select", choices: [{ value: "100", label: "100 (ligera)" }, { value: "150", label: "150 (recomendada)" }, { value: "300", label: "300 (impresión)" }], default: "150" },
  ], engine: "pdf-a-jpg", output: "archivo" },
  { slug: "pdf-a-excel", name: "PDF a Excel", summary: "Extrae las tablas del PDF a hojas de cálculo (.xlsx).", category: "convertir-desde-pdf", icon: "table", slots: [PDF("archivos")], options: [], engine: "pdf-a-excel", output: "archivo" },
  { slug: "pdf-a-powerpoint", name: "PDF a PowerPoint", summary: "Crea una diapositiva por página (.pptx).", category: "convertir-desde-pdf", icon: "slides", slots: [PDF("archivos")], options: [], engine: "pdf-a-powerpoint", output: "archivo" },
  { slug: "pdf-a-texto", name: "PDF a texto", summary: "Extrae el texto del PDF en un archivo .txt.", category: "convertir-desde-pdf", icon: "text", slots: [PDF("archivos")], options: [], engine: "pdf-a-texto", output: "archivo" },
  { slug: "pdf-a-epub", name: "PDF a EPUB", summary: "Convierte el texto a un libro electrónico EPUB. Los diseños complejos se simplifican.", category: "convertir-desde-pdf", icon: "book", slots: [PDF("archivos")], options: [], engine: "pdf-a-epub", output: "archivo", requiresNote: "Conserva el texto; el diseño de páginas se simplifica." },
  { slug: "pdf-a-voz", name: "PDF a voz", summary: "Escucha el texto del PDF como audio (MP3).", category: "convertir-desde-pdf", icon: "voice", slots: [PDF("archivos")], options: [
    { key: "language", label: "Idioma de la voz", type: "select", choices: [{ value: "es", label: "Español" }, { value: "en", label: "Inglés" }, { value: "fr", label: "Francés" }, { value: "de", label: "Alemán" }, { value: "it", label: "Italiano" }, { value: "pt", label: "Portugués" }], default: "es" },
  ], engine: "pdf-a-voz", output: "archivo", requiresNote: "Voz sintética local: calidad básica." },
  { slug: "extraer-datos", name: "Extraer datos de un PDF", summary: "Localiza tablas y datos del PDF y los pone en una hoja de cálculo.", category: "convertir-desde-pdf", icon: "data", slots: [PDF("archivos")], options: [], engine: "extraer-datos", output: "archivo" },

  // ───────── Convertir a PDF ─────────
  { slug: "word-a-pdf", name: "Word a PDF", summary: "Convierte documentos de Word (.docx) a PDF.", category: "convertir-a-pdf", icon: "word", slots: [{ key: "archivos", label: "Documento Word (.docx)", accept: ["docx"], min: 1, max: 1 }], options: [], engine: "office-a-pdf", output: "archivo" },
  { slug: "excel-a-pdf", name: "Excel a PDF", summary: "Convierte hojas de cálculo (.xlsx) a PDF.", category: "convertir-a-pdf", icon: "table", slots: [{ key: "archivos", label: "Hoja de cálculo (.xlsx)", accept: ["xlsx"], min: 1, max: 1 }], options: [], engine: "office-a-pdf", output: "archivo" },
  { slug: "powerpoint-a-pdf", name: "PowerPoint a PDF", summary: "Convierte presentaciones (.pptx) a PDF.", category: "convertir-a-pdf", icon: "slides", slots: [{ key: "archivos", label: "Presentación (.pptx)", accept: ["pptx"], min: 1, max: 1 }], options: [], engine: "office-a-pdf", output: "archivo" },
  { slug: "epub-a-pdf", name: "EPUB a PDF", summary: "Convierte libros electrónicos (.epub) a PDF.", category: "convertir-a-pdf", icon: "book", slots: [{ key: "archivos", label: "Libro (.epub)", accept: ["epub"], min: 1, max: 1 }], options: [], engine: "epub-a-pdf", output: "archivo" },
  { slug: "jpg-a-pdf", name: "JPG a PDF", summary: "Une tus fotos JPG en un PDF, una imagen por página.", category: "convertir-a-pdf", icon: "image", slots: [{ key: "archivos", label: "Imágenes JPG", accept: ["jpg"], min: 1, max: 30 }], options: [
    { key: "fit", label: "Tamaño de página", type: "select", choices: [{ value: "page", label: "A4 con márgenes" }, { value: "image", label: "Igual que la imagen" }], default: "page" },
  ], engine: "imagenes-a-pdf", output: "archivo" },
  { slug: "png-a-pdf", name: "PNG a PDF", summary: "Convierte imágenes PNG en un PDF.", category: "convertir-a-pdf", icon: "image", slots: [{ key: "archivos", label: "Imágenes PNG", accept: ["png"], min: 1, max: 30 }], options: [
    { key: "fit", label: "Tamaño de página", type: "select", choices: [{ value: "page", label: "A4 con márgenes" }, { value: "image", label: "Igual que la imagen" }], default: "page" },
  ], engine: "imagenes-a-pdf", output: "archivo" },
  { slug: "imagen-a-pdf", name: "Imagen a PDF", summary: "Convierte fotos JPG o PNG en un PDF, una imagen por página.", category: "convertir-a-pdf", icon: "image", slots: [{ key: "archivos", label: "Imágenes JPG o PNG", accept: ["jpg", "png"], min: 1, max: 30 }], options: [
    { key: "fit", label: "Tamaño de página", type: "select", choices: [{ value: "page", label: "A4 con márgenes" }, { value: "image", label: "Igual que la imagen" }], default: "page" },
  ], engine: "imagenes-a-pdf", output: "archivo" },
  { slug: "djvu-a-pdf", name: "DJVU a PDF", summary: "Convierte archivos DjVu (.djvu) a PDF.", category: "convertir-a-pdf", icon: "file", slots: [{ key: "archivos", label: "Archivo DjVu", accept: ["djvu"], min: 1, max: 1 }], options: [], engine: "djvu-a-pdf", output: "archivo" },
  { slug: "pagina-web-a-pdf", name: "Página web a PDF", summary: "Pega la dirección de una página pública y guárdala como PDF.", category: "convertir-a-pdf", icon: "web", slots: [], options: [
    { key: "url", label: "Dirección web (https://…)", type: "url", placeholder: "https://ejemplo.org/articulo", required: true },
  ], engine: "pagina-web-a-pdf", output: "archivo", requires: "chromium", requiresNote: "Solo páginas públicas. Las redes privadas están bloqueadas." },

  // ───────── IA y lenguaje ─────────
  { slug: "chat", name: "Chatear con PDF", summary: "Haz preguntas sobre tu documento y recibe respuestas basadas en su contenido.", category: "ia", icon: "chat", slots: [PDF("archivos")], options: [
    { key: "question", label: "Tu pregunta", type: "textarea", placeholder: "¿Cuál es el plazo de entrega?", required: true, maxLength: 1000 },
  ], engine: "chat", output: "texto", requires: "ia", requiresNote: "Requiere configurar ANTHROPIC_API_KEY en el servidor." },
  { slug: "traducir", name: "Traducir PDF", summary: "Traduce el texto del documento y te devuelve un PDF nuevo.", category: "ia", icon: "translate", slots: [PDF("archivos")], options: [
    { key: "target", label: "Idioma de destino", type: "select", choices: [{ value: "español", label: "Español" }, { value: "inglés", label: "Inglés" }, { value: "francés", label: "Francés" }, { value: "alemán", label: "Alemán" }, { value: "portugués", label: "Portugués" }, { value: "italiano", label: "Italiano" }], default: "español" },
  ], engine: "traducir", output: "archivo", requires: "ia", requiresNote: "Requiere configurar ANTHROPIC_API_KEY en el servidor." },
  { slug: "resumir", name: "Resumir PDF", summary: "Obtén los puntos principales del documento.", category: "ia", icon: "summary", slots: [PDF("archivos")], options: [], engine: "resumir", output: "texto", requiresNote: "Con IA configurada, el resumen es más completo. Sin ella se usa un resumen automático local." },
  { slug: "corregir-ortografia", name: "Corregir ortografía de PDF", summary: "Revisa el texto y te muestra posibles errores con sugerencias.", category: "ia", icon: "spell", slots: [PDF("archivos")], options: [
    { key: "language", label: "Idioma", type: "select", choices: [{ value: "es_ES", label: "Español" }, { value: "en_US", label: "Inglés" }], default: "es_ES" },
  ], engine: "corregir-ortografia", output: "texto" },
  { slug: "audio-a-texto", name: "Audio a texto", summary: "Transcribe una grabación de voz a texto.", category: "ia", icon: "mic", slots: [{ key: "archivos", label: "Audio (MP3, WAV, M4A, OGG)", accept: ["audio"], min: 1, max: 1 }], options: [
    { key: "language", label: "Idioma del audio", type: "select", choices: [{ value: "es", label: "Español" }, { value: "en", label: "Inglés" }], default: "es" },
  ], engine: "audio-a-texto", output: "texto", requires: "voz", requiresNote: "Requiere configurar SINTESIS_STT_API_KEY (proveedor de voz a texto)." },
];

export function getPdfTool(slug: string): PdfTool | undefined {
  return PDF_TOOLS.find((t) => t.slug === slug);
}

export function toolsByCategory(cat: Category): PdfTool[] {
  return PDF_TOOLS.filter((t) => t.category === cat);
}
