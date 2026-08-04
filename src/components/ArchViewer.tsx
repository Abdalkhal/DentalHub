import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export const ARCH_ZOOM_MIN = 0.5;
export const ARCH_ZOOM_MAX = 2;

export function ArchViewer({
  children,
  zoom,
  onZoomChange,
  height,
  className,
}: {
  children: ReactNode;
  zoom: number;
  onZoomChange: (z: number) => void;
  height?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-end gap-1 mb-2">
        <button onClick={() => onZoomChange(Math.max(ARCH_ZOOM_MIN, zoom - 0.25))} className="size-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"><ZoomOut className="size-3" /></button>
        <span className="text-[10px] text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={() => onZoomChange(Math.min(ARCH_ZOOM_MAX, zoom + 0.25))} className="size-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200"><ZoomIn className="size-3" /></button>
      </div>
      <div style={{ height: height || "auto", overflow: "hidden" }}>
        <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
