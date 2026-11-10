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
    tagline: "48 herramientas para tus documentos PDF",
    description:
      "Une, divide, comprime, firma, convierte, protege y traduce tus PDF desde el navegador. Tus archivos se procesan y se eliminan al terminar.",
    icon: "file",
    status: "available",
    color: "#01003e",
  },
  {
    slug: "grabacion",
    name: "Grabación de pantalla",
    tagline: "Graba tu pantalla con un clic",
    description: "Graba la pantalla, una ventana o una pestaña con audio opcional.",
    icon: "monitor",
    status: "soon",
    color: "#c9a03a",
  },
  {
    slug: "transcripcion",
    name: "Transcripción",
    tagline: "Convierte audio y video en texto",
    description: "Transcribe grabaciones de voz o video a texto editable.",
    icon: "mic",
    status: "soon",
    color: "#3a3a85",
  },
];

export function getModule(slug: string): PlatformModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}
