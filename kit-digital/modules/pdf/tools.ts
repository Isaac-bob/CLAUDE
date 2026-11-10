// Catálogo de herramientas PDF. Única fuente de verdad para la interfaz y la API.
export type ToolOption =
  | { key: string; label: string; type: "text"; placeholder: string; help: string; required?: boolean }
  | { key: string; label: string; type: "select"; choices: { value: string; label: string }[]; help: string }
  | { key: string; label: string; type: "range"; min: number; max: number; step: number; defaultValue: number; help: string };

export type PdfTool = {
  slug: string;
  name: string;
  summary: string;
  icon: "merge" | "split" | "rotate" | "organize" | "image" | "watermark";
  accept: "pdf" | "image";
  minFiles: number;
  maxFiles: number;
  options: ToolOption[];
  outputLabel: string;
};

export const PDF_TOOLS: PdfTool[] = [
  {
    slug: "merge",
    name: "Unir PDF",
    summary: "Combina varios archivos en uno solo. Arrastra para cambiar el orden.",
    icon: "merge",
    accept: "pdf",
    minFiles: 2,
    maxFiles: 20,
    options: [],
    outputLabel: "PDF unido",
  },
  {
    slug: "split",
    name: "Dividir PDF",
    summary: "Extrae rangos de páginas o separa cada página en su propio archivo.",
    icon: "split",
    accept: "pdf",
    minFiles: 1,
    maxFiles: 1,
    options: [
      {
        key: "mode",
        label: "Cómo dividir",
        type: "select",
        choices: [
          { value: "ranges", label: "Por rangos (1-3, 5, 8-10)" },
          { value: "each", label: "Cada página por separado" },
        ],
        help: "Con rangos, cada grupo separado por comas se convierte en un PDF.",
      },
      {
        key: "ranges",
        label: "Rangos de páginas",
        type: "text",
        placeholder: "1-3, 5, 8-10",
        help: "Solo se usa si eliges «Por rangos».",
      },
    ],
    outputLabel: "Archivos divididos (ZIP)",
  },
  {
    slug: "rotate",
    name: "Rotar PDF",
    summary: "Gira todas las páginas o solo algunas, en pasos de 90°.",
    icon: "rotate",
    accept: "pdf",
    minFiles: 1,
    maxFiles: 1,
    options: [
      {
        key: "angle",
        label: "Giro",
        type: "select",
        choices: [
          { value: "90", label: "90° a la derecha" },
          { value: "180", label: "180°" },
          { value: "270", label: "90° a la izquierda" },
        ],
        help: "Se suma a la rotación que ya tenga la página.",
      },
      {
        key: "pages",
        label: "Páginas (vacío = todas)",
        type: "text",
        placeholder: "2, 4-6",
        help: "Déjalo vacío para girar todo el documento.",
      },
    ],
    outputLabel: "PDF girado",
  },
  {
    slug: "organize",
    name: "Organizar páginas",
    summary: "Reordena o elimina páginas escribiendo el orden final.",
    icon: "organize",
    accept: "pdf",
    minFiles: 1,
    maxFiles: 1,
    options: [
      {
        key: "order",
        label: "Orden final de las páginas",
        type: "text",
        placeholder: "3, 1, 2",
        help: "Las páginas que no escribas se eliminarán. Puedes repetir páginas.",
        required: true,
      },
    ],
    outputLabel: "PDF organizado",
  },
  {
    slug: "images-to-pdf",
    name: "Imagen a PDF",
    summary: "Convierte fotos JPG o PNG en un PDF, una imagen por página.",
    icon: "image",
    accept: "image",
    minFiles: 1,
    maxFiles: 30,
    options: [
      {
        key: "fit",
        label: "Tamaño de página",
        type: "select",
        choices: [
          { value: "page", label: "A4 con márgenes" },
          { value: "image", label: "Igual que la imagen" },
        ],
        help: "A4 centra cada imagen en una hoja estándar.",
      },
    ],
    outputLabel: "PDF de imágenes",
  },
  {
    slug: "watermark",
    name: "Marca de agua",
    summary: "Añade un texto diagonal semitransparente en cada página.",
    icon: "watermark",
    accept: "pdf",
    minFiles: 1,
    maxFiles: 1,
    options: [
      {
        key: "text",
        label: "Texto",
        type: "text",
        placeholder: "CONFIDENCIAL",
        help: "Hasta 60 caracteres.",
        required: true,
      },
      {
        key: "opacity",
        label: "Opacidad",
        type: "range",
        min: 5,
        max: 100,
        step: 5,
        defaultValue: 30,
        help: "Porcentaje de transparencia de la marca.",
      },
    ],
    outputLabel: "PDF con marca de agua",
  },
];

export function getPdfTool(slug: string): PdfTool | undefined {
  return PDF_TOOLS.find((t) => t.slug === slug);
}
