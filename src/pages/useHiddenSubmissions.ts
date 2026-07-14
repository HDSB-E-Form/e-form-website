import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const useHiddenSubmissions = () => {
  const { user } = useAuth();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const storageKey = user ? `hdsb_hidden_submissions_${user.id}` : null;

  useEffect(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setHiddenIds(new Set(JSON.parse(stored)));
      }
    }
  }, [storageKey]);

  const hideSubmissions = useCallback((idsToHide: Set<string>) => {
    if (storageKey) {
      const newHiddenIds = new Set([...hiddenIds, ...idsToHide]);
      setHiddenIds(newHiddenIds);
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newHiddenIds)));
    }
  }, [hiddenIds, storageKey]);

  return {
    hiddenIds,
    hideSubmissions,
  };
};