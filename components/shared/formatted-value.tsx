"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FormattedValueProps {
  raw: string;
  formatted: string;
  className?: string;
}

export function FormattedValue({ raw, formatted, className }: FormattedValueProps) {
  const failed = raw === formatted;

  if (!failed) {
    return <span className={className}>{formatted}</span>;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`border-b border-dashed border-amber-400 cursor-help ${className ?? ""}`}
          >
            {formatted}
          </span>
        </TooltipTrigger>
        <TooltipContent>Could not format this value</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
