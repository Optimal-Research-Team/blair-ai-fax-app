"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CompletenessItem } from "@/types/referral";
import { cn } from "@/lib/utils";
import { COMPLETENESS_COLORS, CALLOUT_COLORS, getConfidenceTextColor, CONFIDENCE_THRESHOLD_MEDIUM } from "@/lib/constants";
import { Callout } from "@/components/shared/callout";
import {
  ChevronDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  Eye,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface CompletenessPanelProps {
  items: CompletenessItem[];
  score: number;
  aiConfidence: number;
  pageCount?: number;
  onViewPage?: (pageNumber: number) => void;
  onRequestItem?: (item: CompletenessItem) => void;
  onRequestMissingItems?: () => void;
  onMarkFound?: (itemId: string, pageNumber?: number) => void;
  onMarkMissing?: (itemId: string) => void;
  onUnmarkFound?: (itemId: string) => void;
}

export function CompletenessPanel({
  items,
  score,
  aiConfidence,
  pageCount = 1,
  onViewPage,
  onRequestItem,
  onRequestMissingItems,
  onMarkFound,
  onMarkMissing,
  onUnmarkFound,
}: CompletenessPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedPages, setSelectedPages] = useState<Record<string, string>>({});

  const foundItems = items.filter((i) => i.status === "found");
  const missingItems = items.filter((i) => i.status === "missing");
  const uncertainItems = items.filter((i) => i.status === "uncertain");

  const needsManualReview = aiConfidence < CONFIDENCE_THRESHOLD_MEDIUM || uncertainItems.length > 0;

  const getStatusIcon = (status: CompletenessItem["status"]) => {
    switch (status) {
      case "found":
        return <CheckCircle2 className={`h-3.5 w-3.5 flex-shrink-0 ${COMPLETENESS_COLORS.found.icon}`} />;
      case "missing":
        return <XCircle className={`h-3.5 w-3.5 flex-shrink-0 ${COMPLETENESS_COLORS.missing.icon}`} />;
      case "uncertain":
        return <HelpCircle className={`h-3.5 w-3.5 flex-shrink-0 ${COMPLETENESS_COLORS.uncertain.icon}`} />;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center justify-between w-full p-3 hover:bg-muted/50 rounded-sm transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-medium">Completeness</span>
            {needsManualReview && (
              <Badge variant="outline" className={`${CALLOUT_COLORS.warning.bg} ${CALLOUT_COLORS.warning.body} ${CALLOUT_COLORS.warning.border}`}>
                <AlertTriangle className="h-3 w-3 mr-1" />
                Manual Review
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("text-sm font-medium", getConfidenceTextColor(score))} aria-live="polite" aria-label={`Completeness score: ${score}%`}>
              {score}%
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="px-2 pb-3">
        {/* AI Confidence indicator */}
        {aiConfidence < CONFIDENCE_THRESHOLD_MEDIUM && (
          <Callout
            variant="warning"
            heading={`AI Confidence: ${aiConfidence}%`}
            body="Please verify the items below. The AI wasn't confident in its assessment."
            className="mb-4"
          />
        )}

        {/* Progress bar */}
        <div className="mb-4">
          <Progress value={score} className="h-2" aria-label={`Completeness: ${score}%`} />
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>{foundItems.length} found</span>
            <span>{missingItems.length} missing</span>
          </div>
        </div>

        {/* Found items */}
        {foundItems.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Found ({foundItems.length})</p>
            <div className="space-y-0.5">
              {foundItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-1.5 py-1 px-1.5 ${COMPLETENESS_COLORS.found.bg} rounded group`}
                >
                  {getStatusIcon(item.status)}
                  <span className="text-xs truncate min-w-0 flex-1">{item.label}</span>
                  {item.required && (
                    <span className="border rounded px-1 py-px text-[9px] font-medium leading-none text-muted-foreground">Req</span>
                  )}
                  <span className={cn("text-[10px] tabular-nums", getConfidenceTextColor(item.confidence))}>
                    {item.confidence}%
                  </span>
                  {item.pageNumber && (
                    <button
                      className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => onViewPage?.(item.pageNumber!)}
                    >
                      <Eye className="h-2.5 w-2.5" />
                      p{item.pageNumber}
                    </button>
                  )}
                  <button
                    className={`flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:${COMPLETENESS_COLORS.missing.text}`}
                    onClick={() => {
                      onUnmarkFound?.(item.id);
                      toast.info(`"${item.label}" moved to missing items`);
                    }}
                    title="Move to missing items"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uncertain items (AI suggests, human confirms) */}
        {uncertainItems.length > 0 && (
          <div className="mb-3">
            <p className={`text-xs font-medium ${COMPLETENESS_COLORS.uncertain.text} mb-1`}>
              Verify ({uncertainItems.length})
            </p>
            <div className="space-y-0.5">
              {uncertainItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-1.5 py-1 px-1.5 ${COMPLETENESS_COLORS.uncertain.bg} rounded group`}
                >
                  {getStatusIcon(item.status)}
                  <span className="text-xs truncate min-w-0 flex-1">{item.label}</span>
                  {item.required && (
                    <span className={`border rounded px-1 py-px text-[9px] font-medium leading-none ${COMPLETENESS_COLORS.uncertain.badge}`}>Req</span>
                  )}
                  <span className={`text-[10px] tabular-nums ${COMPLETENESS_COLORS.uncertain.text}`}>
                    {item.confidence}%
                  </span>
                  <button
                    className={`flex items-center gap-0.5 text-[10px] ${COMPLETENESS_COLORS.found.text} hover:opacity-70`}
                    onClick={() => onMarkFound?.(item.id)}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Found
                  </button>
                  <button
                    className={`flex items-center gap-0.5 text-[10px] ${COMPLETENESS_COLORS.missing.text} hover:opacity-70`}
                    onClick={() => onMarkMissing?.(item.id)}
                  >
                    <XCircle className="h-3 w-3" />
                    Missing
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing items */}
        {missingItems.length > 0 && (
          <div className="mb-3">
            <p className={`text-xs font-medium ${COMPLETENESS_COLORS.missing.text} mb-1`}>
              Missing ({missingItems.length})
            </p>
            <div className="space-y-0.5">
              {missingItems.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-1.5 py-1 px-1.5 ${COMPLETENESS_COLORS.missing.bg} rounded group`}
                >
                  {getStatusIcon(item.status)}
                  <span className="text-xs truncate min-w-0 flex-1">{item.label}</span>
                  {item.required && (
                    <span className={`border rounded px-1 py-px text-[9px] font-medium leading-none ${COMPLETENESS_COLORS.missing.badge}`}>Req</span>
                  )}
                  {item.requestedAt ? (
                    <span className={`text-[10px] ${CALLOUT_COLORS.warning.body}`}>Requested</span>
                  ) : (
                    <>
                      <select
                        value={selectedPages[item.id] || ""}
                        onChange={(e) => setSelectedPages((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="h-4 text-[10px] bg-transparent border rounded px-0.5 text-muted-foreground"
                      >
                        <option value="">pg</option>
                        {Array.from({ length: pageCount }, (_, i) => (
                          <option key={i + 1} value={String(i + 1)}>
                            {i + 1}
                          </option>
                        ))}
                      </select>
                      <button
                        className={`flex items-center gap-0.5 text-[10px] ${COMPLETENESS_COLORS.found.text} hover:opacity-70 disabled:opacity-40`}
                        disabled={!selectedPages[item.id]}
                        onClick={() => {
                          onMarkFound?.(item.id, Number(selectedPages[item.id]));
                          setSelectedPages((prev) => {
                            const next = { ...prev };
                            delete next[item.id];
                            return next;
                          });
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Found
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
            {/* Request all missing items button */}
            {missingItems.filter(i => !i.requestedAt).length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className={`w-full mt-2 h-7 text-[11px] ${COMPLETENESS_COLORS.missing.border} ${COMPLETENESS_COLORS.missing.badge} hover:${COMPLETENESS_COLORS.missing.bg}`}
                onClick={onRequestMissingItems}
              >
                <Send className="h-3 w-3 mr-1" />
                Request Missing ({missingItems.filter(i => !i.requestedAt).length})
              </Button>
            )}
          </div>
        )}

      </CollapsibleContent>
    </Collapsible>
  );
}
