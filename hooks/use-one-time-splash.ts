"use client";

import { useEffect, useState } from "react";

type UseOneTimeSplashOptions = {
  key?: string;
  durationMs?: number;
};

export function useOneTimeSplash(options?: UseOneTimeSplashOptions) {
  const storageKey = options?.key ?? "pdf_workflow_splash_seen_v1";
  const durationMs = options?.durationMs ?? 1700;

  const [hydrated, setHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    setHydrated(true);

    const seen = window.localStorage.getItem(storageKey) === "1";

    if (seen) {
      setShowSplash(false);
      setAppReady(true);
      return;
    }

    setShowSplash(true);

    const timerId = window.setTimeout(() => {
      setShowSplash(false);
      setAppReady(true);
      window.localStorage.setItem(storageKey, "1");
    }, durationMs);

    return () => window.clearTimeout(timerId);
  }, [durationMs, storageKey]);

  return {
    showSplash: !hydrated || showSplash,
    appReady: hydrated && appReady,
  };
}
