import { useState, useCallback, useRef } from 'react';
import { normalizeRunAllResult, type BackendPaper, type RunAllResult } from '../lib/api';

export interface AnalysisRun {
  id: string;
  name: string;
  timestamp: number;
  papers: number;
  topics: number;
  gaps: number;
  yearRange: { start: number; end: number };
  topTopics: string[];
  topGap: string;
  qualityScore: number;
  processingTime: string;
  notes?: string;
  backendResult?: RunAllResult | null;
  backendPapers?: BackendPaper[];
}

const STORAGE_KEY = 'rl_analysis_history';

function load(): AnalysisRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return (JSON.parse(raw) as AnalysisRun[]).map((run) => ({
        ...run,
        backendResult: run.backendResult ? normalizeRunAllResult(run.backendResult) : run.backendResult,
      }));
    }
    return [];
  } catch {
    return [];
  }
}

function persist(runs: AnalysisRun[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (error) {
    console.warn('Unable to persist analysis history to localStorage:', error);
  }
}

export function useAnalysisHistory() {
  const [runs, setRuns] = useState<AnalysisRun[]>(load);
  const sessionCount = useRef(0);
  const [sessionRunCount, setSessionRunCount] = useState(0);

  const addRun = useCallback(
    (run: Omit<AnalysisRun, 'id' | 'timestamp'>): AnalysisRun => {
      const entry: AnalysisRun = {
        ...run,
        backendResult: run.backendResult ? normalizeRunAllResult(run.backendResult) : run.backendResult,
        id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: Date.now(),
      };
      setRuns(prev => {
        const updated = [entry, ...prev].slice(0, 50);
        persist(updated);
        return updated;
      });
      sessionCount.current += 1;
      setSessionRunCount(sessionCount.current);
      return entry;
    },
    []
  );

  const removeRun = useCallback((id: string) => {
    setRuns(prev => {
      const updated = prev.filter(r => r.id !== id);
      persist(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRuns([]);
    persist([]);
  }, []);

  return { runs, addRun, removeRun, clearAll, sessionRunCount };
}
