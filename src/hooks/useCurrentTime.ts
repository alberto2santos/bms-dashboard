"use client";

import { useEffect, useState } from "react";

export function useCurrentTime(intervalMs: number) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    const initialUpdate = window.setTimeout(() => setNow(Date.now()), 0);
    const interval = window.setInterval(() => setNow(Date.now()), intervalMs);

    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(interval);
    };
  }, [intervalMs]);

  return now;
}
