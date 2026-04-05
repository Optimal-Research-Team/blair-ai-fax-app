"use client";

import { FaxPage } from "@/types";
import { cn } from "@/lib/utils";
import { DOC_SIM_COLORS } from "@/lib/constants";

interface PageThumbnailProps {
  page: FaxPage;
  isActive: boolean;
  onClick: () => void;
}

export function PageThumbnail({ page, isActive, onClick }: PageThumbnailProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full aspect-[8.5/11] rounded-sm border-2 overflow-hidden transition-all",
        "bg-white hover:border-primary/50",
        isActive ? "border-primary ring-2 ring-primary/20" : "border-border"
      )}
    >
      {/* Simulated fax content */}
      <div className="p-2 space-y-1.5">
        <div className={`h-1.5 ${DOC_SIM_COLORS.subheading} rounded w-3/4`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-full`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-5/6`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-full`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-2/3`} />
        <div className={`h-1.5 ${DOC_SIM_COLORS.subheading} rounded w-1/2 mt-2`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-full`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-4/5`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-full`} />
        <div className={`h-1 ${DOC_SIM_COLORS.bodyLine} rounded w-3/4`} />
      </div>

      {/* Page number */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
        {page.pageNumber}
      </div>

      {/* Doc type tag */}
      {page.detectedDocType && (
        <div className="absolute top-1 right-1 bg-primary/90 text-white text-[7px] px-1 py-0.5 rounded max-w-[60px] truncate">
          {page.detectedDocType}
        </div>
      )}
    </button>
  );
}
