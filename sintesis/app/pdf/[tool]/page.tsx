import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getPdfTool, PDF_TOOLS, CATEGORIES } from "@/modules/pdf/catalog";
import { ToolWorkspace } from "@/components/pdf/ToolWorkspace";

type Props = { params: Promise<{ tool: string }> };

export function generateStaticParams() {
  return PDF_TOOLS.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const t = getPdfTool(tool);
  return { title: t ? `${t.name} · PDF` : "PDF" };
}

export default async function PdfToolPage({ params }: Props) {
  const { tool: slug } = await params;
  const tool = getPdfTool(slug);
  if (!tool) notFound();
  const category = CATEGORIES.find((c) => c.id === tool.category);
  return (
    <div className="space-y-6">
      <Link href={`/pdf#${tool.category}`} className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {category?.label ?? "Todas las herramientas"}
      </Link>
      <ToolWorkspace key={tool.slug} tool={tool} />
    </div>
  );
}
