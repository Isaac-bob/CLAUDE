import {
  Pencil, PenTool, EyeOff, Droplets, Eraser, Crop, FilePlus, GitCompare, Layers, Scissors, ListOrdered, RotateCw,
  LayoutGrid, BookOpen, Maximize2, Scaling, Images, Minimize2, Gauge, Wrench, ScanText, Archive, BadgeCheck, Lock,
  LockOpen, Share2, FileText, Image as ImageIcon, Table, Presentation, Volume2, Database, Globe, MessageSquare,
  Languages, Sparkles, SpellCheck, Mic, File as FileIcon, type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  edit: Pencil, sign: PenTool, redact: EyeOff, watermark: Droplets, clean: Eraser, crop: Crop, create: FilePlus,
  compare: GitCompare, merge: Layers, split: Scissors, organize: ListOrdered, rotate: RotateCw, layout: LayoutGrid,
  booklet: BookOpen, poster: Maximize2, resize: Scaling, extract: Images, compress: Minimize2, optimize: Gauge,
  repair: Wrench, ocr: ScanText, archive: Archive, check: BadgeCheck, lock: Lock, unlock: LockOpen, share: Share2,
  word: FileText, image: ImageIcon, table: Table, slides: Presentation, text: FileText, book: BookOpen, voice: Volume2,
  data: Database, web: Globe, chat: MessageSquare, translate: Languages, summary: Sparkles, spell: SpellCheck, mic: Mic,
  file: FileIcon,
};

export function ToolIcon({ icon, className = "h-6 w-6" }: { icon: string; className?: string }) {
  const Icon = MAP[icon] ?? FileIcon;
  return <Icon className={className} aria-hidden="true" />;
}
