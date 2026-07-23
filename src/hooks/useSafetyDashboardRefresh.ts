import { useEffect, useState } from "react";

const MINIMUM_SKELETON_MS = 500;

export const useSafetyDashboardRefresh = (
  refreshSubmissions: () => Promise<void>,
  isLoading: boolean,
) => {
  const [isPageRefreshing, setIsPageRefreshing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const startedAt = Date.now();

    const refresh = async () => {
      try {
        await refreshSubmissions();
      } finally {
        const remaining = Math.max(0, MINIMUM_SKELETON_MS - (Date.now() - startedAt));
        timer = window.setTimeout(() => {
          if (!cancelled) setIsPageRefreshing(false);
        }, remaining);
      }
    };

    void refresh();

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [refreshSubmissions]);

  return isLoading || isPageRefreshing;
};
