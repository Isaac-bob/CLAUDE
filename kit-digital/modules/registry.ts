// Registro central de servicios de la plataforma. Cada servicio es una pestaña.
// Para añadir un servicio nuevo: crear su carpeta en /modules y añadir una entrada aquí.
export type ModuleIcon = "file" | "mic" | "monitor" | "languages" | "sparkles";

export type PlatformModule = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: ModuleIcon;
  status: "available" | "soon";
  color: string; // color de acento de la pestaña
};

export const MODULES: PlatformModule[] = [
  {
    slug: "pdf",
    name: "PDF",
    tagline: "Une, divide, gira y organiza tus PDF",
    description:
      "Herramientas para trabajar con documentos PDF directamente en tu navegador. Tus archivos se procesan y se borran al terminar.",
    icon: "file",
    status: "available",
    color: "#e11d48",
  },
  {
    slug: "grabacion",
    name: "Grabación de pantalla",
    tagline: "Graba tu pantalla con un clic",
    description: "Graba la pantalla, una ventana o una pestaña con audio opcional.",
    icon: "monitor",
    status: "soon",
    color: "#7c3aed",
  },
  {
    slug: "transcripcion",
    name: "Transcripción",
    tagline: "Convierte audio y video en texto",
    description: "Transcribe grabaciones de voz o video a texto editable.",
    icon: "mic",
    status: "soon",
    color: "#0891b2",
  },
];

export function getModule(slug: string): PlatformModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}
