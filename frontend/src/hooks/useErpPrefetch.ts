import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePermission } from '../features/auth/usePermission';
import { ERP_PREFETCH_ITEMS, type ErpPrefetchItem } from '../routes/erpRouteLoaders';

interface NetworkInformation {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/**
 * Verifies whether the client's network environment allows background prefetching.
 * Aborts if user enabled Data Saver or is on a 2G / slow connection.
 */
function isNetworkFavorable(): boolean {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & { connection?: NetworkInformation };
  if (nav.connection) {
    if (nav.connection.saveData) {
      return false;
    }
    const type = nav.connection.effectiveType;
    if (type === '2g' || type === 'slow-2g') {
      return false;
    }
  }

  return true;
}

/**
 * Schedules work during browser idle periods with a safe timer fallback.
 * Returns a cancel function.
 */
function scheduleIdleTask(callback: () => void): () => void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    const handle = (
      window as unknown as {
        requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => number;
      }
    ).requestIdleCallback(callback, { timeout: 2000 });

    return () => {
      (
        window as unknown as {
          cancelIdleCallback: (h: number) => void;
        }
      ).cancelIdleCallback(handle);
    };
  }

  const timer = setTimeout(callback, 800);
  return () => clearTimeout(timer);
}

/**
 * Custom hook to prefetch permitted ERP route JavaScript chunks in the background.
 *
 * Rules:
 * - Must only be invoked inside MainLayout (guaranteed authenticated ERP context).
 * - Delays initial batch by 1500ms to allow Dashboard rendering and initial API calls to complete.
 * - Processes 2 modules per batch during browser idle periods.
 * - Filters strictly by user permission (can(moduleKey, 'voir')).
 * - Pauses if tab is hidden; aborts if Data Saver / 2G is detected.
 * - Stops cleanly if MainLayout unmounts (e.g. on logout).
 */
export function useErpPrefetch(): void {
  const { can } = usePermission();
  const location = useLocation();

  // Reference to track loaded items across component renders within the session
  const loadedIdsRef = useRef<Set<string>>(new Set());

  // Keep latest permission checker in a ref to avoid recreating the effect
  const canRef = useRef(can);
  canRef.current = can;

  // Keep latest pathname in a ref so the queue can skip the current route
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  useEffect(() => {
    let isCancelled = false;
    let cancelCurrentTask: (() => void) | null = null;
    let initialTimer: ReturnType<typeof setTimeout> | null = null;
    let visibilityListener: (() => void) | null = null;

    if (!isNetworkFavorable()) {
      return;
    }

    // Build list of allowed items that have not yet been fetched
    const queue: ErpPrefetchItem[] = ERP_PREFETCH_ITEMS.filter((item) => {
      if (loadedIdsRef.current.has(item.id)) {
        return false;
      }
      if (item.moduleKey && !canRef.current(item.moduleKey, 'voir')) {
        return false;
      }
      return true;
    });

    if (queue.length === 0) {
      return;
    }

    const BATCH_SIZE = 2;

    const processNextBatch = () => {
      if (isCancelled) return;

      // Defer processing if the tab is hidden
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        visibilityListener = () => {
          if (document.visibilityState === 'visible') {
            if (visibilityListener) {
              document.removeEventListener('visibilitychange', visibilityListener);
              visibilityListener = null;
            }
            if (!isCancelled) {
              cancelCurrentTask = scheduleIdleTask(processNextBatch);
            }
          }
        };
        document.addEventListener('visibilitychange', visibilityListener);
        return;
      }

      if (queue.length === 0) {
        return;
      }

      // Extract up to BATCH_SIZE items, skipping the currently active route if matching
      const currentBatch: ErpPrefetchItem[] = [];
      while (queue.length > 0 && currentBatch.length < BATCH_SIZE) {
        const item = queue.shift();
        if (!item) break;

        const currentPath = pathnameRef.current;
        if (item.path && currentPath.startsWith(item.path)) {
          // Already actively on this route; skip prefetching
          loadedIdsRef.current.add(item.id);
          continue;
        }

        if (!loadedIdsRef.current.has(item.id)) {
          loadedIdsRef.current.add(item.id);
          currentBatch.push(item);
        }
      }

      // Execute dynamic import loaders silently
      for (const item of currentBatch) {
        try {
          item.load().catch(() => {
            // Silently ignore chunk network failures in the background
          });
        } catch {
          // Prevent any sync error from propagating
        }
      }

      // If more items remain, schedule the next batch
      if (queue.length > 0 && !isCancelled) {
        cancelCurrentTask = scheduleIdleTask(processNextBatch);
      }
    };

    // Initial delay of ~1500ms after MainLayout mounts
    initialTimer = setTimeout(() => {
      if (!isCancelled) {
        cancelCurrentTask = scheduleIdleTask(processNextBatch);
      }
    }, 1500);

    return () => {
      isCancelled = true;
      if (initialTimer) {
        clearTimeout(initialTimer);
      }
      if (cancelCurrentTask) {
        cancelCurrentTask();
      }
      if (visibilityListener && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityListener);
      }
    };
  }, []);
}

