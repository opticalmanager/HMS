"use client";

import { useState, useEffect } from "react";

/**
 * Hook to track hospital workstation connectivity status in real-time.
 * Synchronizes with browser navigator.onLine and triggers cache sync events.
 */
export function useOfflineStatus() {
  const [isOffline, setIsOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOffline };
}
