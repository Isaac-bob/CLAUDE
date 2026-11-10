import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPdfTool, PDF_TOOLS } from "@/modules/pdf/tools";
import { ToolWorkspace } from "@/components/pdf/ToolWorkspace";
import { PdfToolTabs } from "@/components/pdf/PdfToolTabs";

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
  return (
    <div className="space-y-6">
      <PdfToolTabs />
      <ToolWorkspace key={tool.slug} tool={tool} />
    </div>
  );
}
