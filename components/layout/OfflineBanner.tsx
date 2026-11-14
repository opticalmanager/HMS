"use client";

import * as React from "react";
import { WifiOff, RefreshCw, AlertCircle, Database } from "lucide-react";

interface OfflineBannerProps {
  isOffline: boolean;
  pendingCount?: number;
  onSync?: () => Promise<void>;
}

export function OfflineBanner({
  isOffline,
  pendingCount = 0,
  onSync,
}: OfflineBannerProps) {
  const [isSyncing, setIsSyncing] = React.useState(false);

  if (!isOffline && pendingCount === 0) {
    return null;
  }

  const handleSync = async () => {
    if (!onSync || isSyncing) return;
    setIsSyncing(true);
    try {
      await onSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-xs sticky top-16 z-20">
      <div className="flex items-center gap-2">
        {isOffline ? (
          <>
            <WifiOff className="h-4 w-4 shrink-0 animate-pulse" />
            <span>
              <strong>Hospital LAN Offline:</strong> Working from local Dexie.js cache. Consultations & vitals will queue locally.
            </span>
          </>
        ) : (
          <>
            <Database className="h-4 w-4 shrink-0" />
            <span>
              Online restored. <strong>{pendingCount}</strong> queued clinical transaction(s) pending Supabase sync.
            </span>
          </>
        )}
      </div>

      {!isOffline && pendingCount > 0 && (
        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white text-amber-700 font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
          <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
        </button>
      )}
    </div>
  );
}
