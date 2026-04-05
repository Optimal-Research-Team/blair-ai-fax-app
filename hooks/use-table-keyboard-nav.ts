"use client";

import { useState, useEffect, useCallback } from "react";

interface UseTableKeyboardNavOptions {
  /** Total number of rows in the table */
  rowCount: number;
  /** Called when Enter is pressed on a highlighted row */
  onSelect: (index: number) => void;
  /** Whether keyboard nav is active */
  enabled: boolean;
  /** Called when nav should deactivate (click outside, etc.) */
  onDeactivate?: () => void;
}

export function useTableKeyboardNav({
  rowCount,
  onSelect,
  enabled,
  onDeactivate,
}: UseTableKeyboardNavOptions) {
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Clamp highlight if row count shrinks
  useEffect(() => {
    setHighlightedIndex((prev) => (prev >= rowCount ? -1 : prev));
  }, [rowCount]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled || rowCount === 0) return;

      // Don't intercept when a dialog, select, or dropdown is open
      const target = e.target as HTMLElement;
      if (
        target.closest("[role='dialog']") ||
        target.closest("[role='listbox']") ||
        target.closest("[data-radix-select-viewport]")
      ) {
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < rowCount - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        onSelect(highlightedIndex);
      } else if (e.key === "Escape") {
        setHighlightedIndex(-1);
        onDeactivate?.();
      }
    },
    [enabled, rowCount, highlightedIndex, onSelect, onDeactivate]
  );

  // Click anywhere deactivates keyboard nav
  const handleClick = useCallback(() => {
    if (enabled) {
      setHighlightedIndex(-1);
      onDeactivate?.();
    }
  }, [enabled, onDeactivate]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClick);
    };
  }, [handleKeyDown, handleClick]);

  return { highlightedIndex, setHighlightedIndex };
}
