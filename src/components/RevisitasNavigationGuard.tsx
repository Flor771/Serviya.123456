import { useEffect } from 'react';

/** Keeps Revisitas as a modal-only destination; closing it must never leave App on a nonexistent tab. */
export function RevisitasNavigationGuard({ activeTab, onFallback }: { activeTab: string; onFallback: () => void }) {
  useEffect(() => {
    if (activeTab === 'revisitas') onFallback();
  }, [activeTab, onFallback]);
  return null;
}
