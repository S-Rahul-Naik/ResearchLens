import { useState, useCallback, useRef } from 'react';

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
}

const STORAGE_KEY = 'rl_analysis_history';

const SEED_HISTORY: AnalysisRun[] = [
  {
    id: 'run_seed_001',
    name: 'AI Safety Literature Sweep',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 14,
    papers: 12,
    topics: 5,
    gaps: 4,
    yearRange: { start: 2019, end: 2023 },
    topTopics: ['Federated Learning', 'Reinforcement Learning', 'Knowledge Graphs'],
    topGap: 'Federated Learning ↔ Medical Imaging',
    qualityScore: 0.74,
    processingTime: '1m 23s',
    notes: 'Initial sweep before adding robotics corpus.',
  },
  {
    id: 'run_seed_002',
    name: 'NLP + Healthcare Batch',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 9,
    papers: 16,
    topics: 6,
    gaps: 5,
    yearRange: { start: 2020, end: 2024 },
    topTopics: ['Large Language Models', 'Clinical AI & Health', 'Computer Vision'],
    topGap: 'Large Language Models ↔ Robotics & Embodied AI',
    qualityScore: 0.81,
    processingTime: '1m 52s',
    notes: 'Added 4 clinical AI papers from PubMed.',
  },
  {
    id: 'run_seed_003',
    name: 'Full Dataset v1.0',
    timestamp: Date.now() - 1000 * 60 * 60 * 24 * 3,
    papers: 20,
    topics: 8,
    gaps: 7,
    yearRange: { start: 2019, end: 2024 },
    topTopics: ['Large Language Models', 'Robotics & Embodied AI', 'Federated Learning'],
    topGap: 'Robotics & Embodied AI ↔ Clinical AI & Health',
    qualityScore: 0.85,
    processingTime: '2m 08s',
  },
];

function load(): AnalysisRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AnalysisRun[];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_HISTORY));
    return SEED_HISTORY;
  } catch {
    return SEED_HISTORY;
  }
}

function persist(runs: AnalysisRun[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
}

export function useAnalysisHistory() {
  const [runs, setRuns] = useState<AnalysisRun[]>(load);
  const sessionCount = useRef(0);
  const [sessionRunCount, setSessionRunCount] = useState(0);

  const addRun = useCallback(
    (run: Omit<AnalysisRun, 'id' | 'timestamp'>): AnalysisRun => {
      const entry: AnalysisRun = {
        ...run,
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
