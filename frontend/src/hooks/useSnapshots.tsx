import { useState, useCallback } from 'react';

export interface Snapshot {
  id: string;
  name: string;
  timestamp: number;
  stats: {
    papers: number;
    topics: number;
    gaps: number;
    yearRange: { start: number; end: number };
  };
  notes?: string;
}

const STORAGE_KEY = 'rl_snapshots';

function load(): Snapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Snapshot[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function useSnapshots() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>(load);

  const addSnapshot = useCallback(
    (name: string, stats: Snapshot['stats'], notes?: string): Snapshot => {
      const snap: Snapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || `Snapshot ${new Date().toLocaleDateString()}`,
        timestamp: Date.now(),
        stats,
        notes,
      };
      setSnapshots(prev => {
        const updated = [snap, ...prev];
        persist(updated);
        return updated;
      });
      return snap;
    },
    []
  );

  const removeSnapshot = useCallback((id: string) => {
    setSnapshots(prev => {
      const updated = prev.filter(s => s.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSnapshots([]);
    persist([]);
  }, []);

  return { snapshots, addSnapshot, removeSnapshot, clearAll };
}
