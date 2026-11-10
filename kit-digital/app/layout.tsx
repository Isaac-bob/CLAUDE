import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/shell/Header";
import { ModuleTabs } from "@/components/shell/ModuleTabs";
import { Footer } from "@/components/shell/Footer";

export const metadata: Metadata = {
  title: { default: "Kit Digital — herramientas sencillas para tus documentos", template: "%s · Kit Digital" },
  description:
    "Plataforma con herramientas digitales fáciles de usar: trabaja con PDF, y pronto con grabación de pantalla y transcripción. Sin instalar nada.",
  applicationName: "Kit Digital",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Saltar al contenido
        </a>
        <Header />
        <ModuleTabs />
        <main id="contenido" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
