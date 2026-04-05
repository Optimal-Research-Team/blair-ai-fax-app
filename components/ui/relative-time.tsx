"use client";

import { useEffect, useState } from "react";
import { formatRelativeTime } from "@/lib/format";

interface RelativeTimeProps {
  date: string;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const [text, setText] = useState(() => formatRelativeTime(date));

  useEffect(() => {
    setText(formatRelativeTime(date));
    const interval = setInterval(() => {
      setText(formatRelativeTime(date));
    }, 60_000);
    return () => clearInterval(interval);
  }, [date]);

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
