import { Layers, Scissors, RotateCw, ListOrdered, ImageIcon, Droplets, type LucideIcon } from "lucide-react";
import type { PdfTool } from "@/modules/pdf/tools";

const MAP: Record<PdfTool["icon"], LucideIcon> = {
  merge: Layers,
  split: Scissors,
  rotate: RotateCw,
  organize: ListOrdered,
  image: ImageIcon,
  watermark: Droplets,
};

export function ToolIcon({ icon, className = "h-6 w-6" }: { icon: PdfTool["icon"]; className?: string }) {
  const Icon = MAP[icon];
  return <Icon className={className} aria-hidden="true" />;
}
