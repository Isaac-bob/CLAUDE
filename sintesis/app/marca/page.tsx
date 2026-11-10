import type { Metadata } from "next";
import { Logo } from "@/components/shell/Logo";

export const metadata: Metadata = { title: "Manual de marca" };

const COLORS = [
  { name: "Azul Síntesis", role: "Color principal. Logotipo, títulos y botones.", hex: "#01003E", rgb: "1 · 0 · 62", cmyk: "98 · 100 · 0 · 76", ratio: "19,6:1 sobre blanco", swatch: "bg-navy-900 text-white" },
  { name: "Azul profundo", role: "Hover y fondos de cabecera.", hex: "#0A0A4D", rgb: "10 · 10 · 77", cmyk: "—", ratio: "18,1:1 sobre blanco", swatch: "bg-navy-800 text-white" },
  { name: "Azul medio", role: "Iconos secundarios y bordes activos.", hex: "#3A3A85", rgb: "58 · 58 · 133", cmyk: "56 · 56 · 0 · 48", ratio: "9,2:1 sobre blanco", swatch: "bg-navy-500 text-white" },
  { name: "Azul suave", role: "Texto secundario sobre blanco.", hex: "#5F5FA3", rgb: "95 · 95 · 163", cmyk: "—", ratio: "5,8:1 sobre blanco", swatch: "bg-navy-400 text-white" },
  { name: "Lavanda pálida", role: "Fondos de sección y estados activos.", hex: "#F2F2F9", rgb: "242 · 242 · 249", cmyk: "3 · 3 · 0 · 2", ratio: "Fondo", swatch: "bg-navy-50 text-navy-900" },
  { name: "Dorado Síntesis", role: "Acento. Solo decorativo o sobre azul marino.", hex: "#C9A03A", rgb: "201 · 160 · 58", cmyk: "0 · 20 · 71 · 21", ratio: "8,0:1 sobre azul · 2,5:1 sobre blanco", swatch: "bg-gold-500 text-navy-900" },
  { name: "Crema dorada", role: "Insignias y fondos de aviso suaves.", hex: "#F6EEDB", rgb: "246 · 238 · 219", cmyk: "—", ratio: "Fondo", swatch: "bg-gold-100 text-navy-900" },
  { name: "Texto", role: "Texto principal.", hex: "#14142B", rgb: "20 · 20 · 43", cmyk: "—", ratio: "16,9:1 sobre canvas", swatch: "bg-ink text-white" },
  { name: "Gris de apoyo", role: "Textos auxiliares y pies.", hex: "#5C5E78", rgb: "92 · 94 · 120", cmyk: "—", ratio: "6,3:1 sobre blanco", swatch: "bg-muted text-white" },
  { name: "Éxito", role: "Confirmaciones.", hex: "#1E7B4F", rgb: "30 · 123 · 79", cmyk: "—", ratio: "5,3:1 sobre blanco", swatch: "bg-success-700 text-white" },
  { name: "Error", role: "Errores y acciones destructivas.", hex: "#B3261E", rgb: "179 · 38 · 30", cmyk: "—", ratio: "6,5:1 sobre blanco", swatch: "bg-danger-600 text-white" },
];

function Section({ n, title, children, id }: { n: string; title: string; children: React.ReactNode; id: string }) {
  return (
    <section id={id} className="brand-section scroll-mt-24 border-t border-navy-900/10 pt-10">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-navy-500">{n}</p>
      <h2 className="mt-1 font-serif text-3xl font-bold text-navy-900">{title}</h2>
      <div className="mt-6 space-y-6 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export default function BrandManualPage() {
  return (
    <article className="brand-manual mx-auto max-w-4xl space-y-16 pb-10">
      <header className="brand-cover relative overflow-hidden rounded-[2rem] bg-navy-900 px-8 py-14 text-white sm:px-14">
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full border border-gold-500/30" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full border border-gold-500/20" />
        <Logo className="h-24 w-24 rounded-full bg-white p-1" />
        <p className="mt-10 text-xs font-bold uppercase tracking-[0.25em] text-gold-300">Manual de marca · versión 1.0 · 2026</p>
        <h1 className="mt-3 font-serif text-5xl font-bold tracking-tight sm:text-6xl">Síntesis</h1>
        <p className="mt-4 max-w-xl text-lg text-navy-100">
          Herramientas digitales claras para cualquier persona. Este manual explica cómo mostrar la marca con coherencia en pantallas,
          documentos y redes.
        </p>
        <nav aria-label="Contenido" className="mt-10 grid gap-2 text-sm sm:grid-cols-2">
          {[["#esencia", "1 · Esencia y voz"], ["#logotipo", "2 · Logotipo"], ["#color", "3 · Color"], ["#tipografia", "4 · Tipografía"], ["#componentes", "5 · Componentes"], ["#accesibilidad", "6 · Accesibilidad"]].map(([href, label]) => (
            <a key={href} href={href} className="rounded-xl bg-white/5 px-4 py-2.5 text-navy-100 ring-1 ring-white/10 transition hover:bg-white/10">{label}</a>
          ))}
        </nav>
      </header>

      <Section id="esencia" n="01" title="Esencia y voz">
        <p>
          <strong>Síntesis</strong> reduce lo complejo a lo esencial. Sus herramientas hacen tareas técnicas con documentos (unir, firmar, convertir,
          proteger) de forma sencilla y confiable.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Claridad", "Frases cortas, un mensaje por pantalla y palabras de uso diario."],
            ["Confianza", "Explicamos qué pasa con cada archivo y no pedimos más datos de los necesarios."],
            ["Precisión", "Las cifras, plazos y mensajes de error son exactos. Nada se presenta como hecho si no lo es."],
            ["Cercanía", "Hablamos de tú, sin tecnicismos. Si hace falta un término técnico, lo explicamos."],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-5 ring-1 ring-navy-900/10">
              <p className="font-serif text-xl font-bold text-navy-900">{t}</p>
              <p className="mt-1 text-muted">{d}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-success-50 p-5 ring-1 ring-success-200">
            <p className="font-bold text-success-900">Sí</p>
            <p className="mt-1">«Tu PDF está listo. Descárgalo cuando quieras.»</p>
          </div>
          <div className="rounded-2xl bg-danger-50 p-5 ring-1 ring-danger-200">
            <p className="font-bold text-danger-800">No</p>
            <p className="mt-1">«Operación completada satisfactoriamente con código 0x1F.»</p>
          </div>
        </div>
      </Section>

      <Section id="logotipo" n="02" title="Logotipo">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="grid place-items-center rounded-3xl bg-white p-10 ring-1 ring-navy-900/10">
            <Logo className="h-44 w-44 rounded-full" />
            <p className="mt-4 text-sm text-muted">Versión principal sobre blanco</p>
          </div>
          <div className="grid place-items-center rounded-3xl bg-navy-900 p-10">
            <Logo className="h-44 w-44 rounded-full" />
            <p className="mt-4 text-sm text-navy-200">Sobre azul marino: el círculo blanco conserva el contraste</p>
          </div>
        </div>
        <h3 className="font-serif text-xl font-bold text-navy-900">Construcción</h3>
        <p>
          El símbolo es una <em>S</em> de trazo contrastado, inscrita en un círculo. La línea vertical central sugiere la idea de
          <em> síntesis</em>: dos partes que se encuentran en un punto. El círculo es parte del símbolo: no lo recortes.
        </p>
        <h3 className="font-serif text-xl font-bold text-navy-900">Área de protección</h3>
        <p>Deja libre alrededor del logotipo un espacio igual a la mitad de su altura. Ningún texto ni borde entra en esa zona.</p>
        <h3 className="font-serif text-xl font-bold text-navy-900">Tamaño mínimo</h3>
        <p>Digital: 32 px de alto. Impreso: 8 mm. Por debajo de ese tamaño, usa solo el símbolo sin el nombre.</p>
        <h3 className="font-serif text-xl font-bold text-navy-900">Usos incorrectos</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {["Estirar o deformar", "Girar o inclinar", "Cambiar los colores del símbolo", "Añadir sombras o efectos", "Colocarlo sobre fotos sin fondo de contraste", "Recortar el círculo"].map((x) => (
            <li key={x} className="flex items-center gap-2 rounded-xl bg-danger-50 px-4 py-2.5 text-sm text-danger-800 ring-1 ring-danger-200">
              <span aria-hidden="true">✕</span> {x}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="color" n="03" title="Color">
        <p>Azul Síntesis es el color de la marca. El dorado es un acento: úsalo con moderación, como un detalle.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {COLORS.map((c) => (
            <div key={c.hex} className="overflow-hidden rounded-2xl ring-1 ring-navy-900/10">
              <div className={`flex h-24 items-end justify-between p-4 ${c.swatch}`}>
                <span className="font-bold">{c.name}</span>
                <span className="font-mono text-sm">{c.hex}</span>
              </div>
              <div className="space-y-1 bg-white p-4 text-sm">
                <p className="text-muted">{c.role}</p>
                <p className="font-mono text-xs text-muted">RGB {c.rgb} · CMYK {c.cmyk}</p>
                <p className="text-xs font-semibold text-navy-900">Contraste: {c.ratio}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted">
          Los valores CMYK son aproximados, calculados a partir del HEX. Para impresión profesional, pide una prueba de color con tu imprenta.
        </p>
      </Section>

      <Section id="tipografia" n="04" title="Tipografía">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-900/10">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-500">Títulos · serif</p>
            <p className="mt-3 font-serif text-4xl font-bold text-navy-900">Aa Síntesis</p>
            <p className="mt-2 text-sm text-muted">Georgia, Times New Roman, serif. Evoca la S del logotipo.</p>
          </div>
          <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-900/10">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-500">Texto · sans</p>
            <p className="mt-3 text-4xl font-semibold text-ink">Aa Texto</p>
            <p className="mt-2 text-sm text-muted">Fuentes del sistema (ui-sans-serif, Segoe UI, Roboto…). Carga rápida y muy legibles.</p>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr><th className="py-2">Nivel</th><th className="py-2">Tamaño</th><th className="py-2">Uso</th></tr>
          </thead>
          <tbody className="divide-y divide-navy-900/10">
            <tr><td className="py-2">Título principal</td><td>32–48 px, serif, negrita</td><td>Portada y secciones</td></tr>
            <tr><td className="py-2">Subtítulo</td><td>20–24 px, serif</td><td>Bloques y tarjetas</td></tr>
            <tr><td className="py-2">Cuerpo</td><td>16 px, sans, interlineado 1,5</td><td>Textos y formularios</td></tr>
            <tr><td className="py-2">Auxiliar</td><td>12–13 px, gris de apoyo</td><td>Pies y ayudas</td></tr>
          </tbody>
        </table>
      </Section>

      <Section id="componentes" n="05" title="Componentes">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-navy-900/10">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-500">Botón principal</p>
            <span className="inline-flex rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-navy-900/25">Descargar</span>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-navy-900/10">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-500">Botón secundario</p>
            <span className="inline-flex rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink ring-1 ring-navy-900/10">Empezar de nuevo</span>
          </div>
          <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-navy-900/10">
            <p className="text-xs font-bold uppercase tracking-widest text-navy-500">Insignia</p>
            <span className="inline-flex rounded-full bg-gold-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-navy-900">Configuración</span>
          </div>
        </div>
        <p>
          <strong>Tarjetas:</strong> esquinas de 20 px, sombra suave con tinte azul y borde de 1 px muy claro. <strong>Iconos:</strong> trazo
          de 2 px, estilo lineal (Lucide). <strong>Movimiento:</strong> transiciones de 200 ms; respeta la preferencia «reducir movimiento».
        </p>
      </Section>

      <Section id="accesibilidad" n="06" title="Accesibilidad">
        <ul className="list-disc space-y-2 pl-6">
          <li>Texto normal: contraste mínimo 4,5:1 (WCAG AA). Usa el azul principal o el gris de apoyo sobre blanco.</li>
          <li>El dorado no se usa como texto sobre blanco (2,5:1). Sí sobre azul marino (8:1).</li>
          <li>El foco de teclado es un contorno dorado de 3 px, visible en todos los elementos interactivos.</li>
          <li>Áreas táctiles de al menos 44 × 44 px.</li>
          <li>Todo mensaje de error explica qué pasó y cómo solucionarlo, sin códigos internos.</li>
        </ul>
      </Section>

      <footer className="border-t border-navy-900/10 pt-8 text-sm text-muted">
        <p>Síntesis · Manual de marca v1.0. Revísalo cuando cambien el logotipo, la paleta o la tipografía.</p>
      </footer>
    </article>
  );
}
