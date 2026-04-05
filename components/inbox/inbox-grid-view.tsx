"use client";

import { Fax } from "@/types";
import { InboxGridCard } from "./inbox-grid-card";
import { CheckCircle2 } from "lucide-react";

interface InboxGridViewProps {
  faxes: Fax[];
}

export function InboxGridView({ faxes }: InboxGridViewProps) {
  if (faxes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-500" />
        <p className="text-sm font-medium">All caught up</p>
        <p className="text-xs text-gray-400">No faxes match your filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {faxes.map((fax) => (
        <InboxGridCard key={fax.id} fax={fax} />
      ))}
    </div>
  );
}
