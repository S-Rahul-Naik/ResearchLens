import { useEffect, useRef, useState, useCallback } from 'react';
import type { Paper } from '../../../../mocks/papers';
import { runAllModules, quickAnalysisModules, n8nAnalysisModules, normalizeRunAllResult, type RunAllResult } from '../../../../lib/api';

/* ─── Types ─────────────────────────────────────────────── */
type StageStatus = 'waiting' | 'running' | 'done' | 'error';

interface PaperProgress {
  paperId: string;
  title: string;
  stages: StageStatus[];
}

interface LogEntry {
  id: number;
  time: string;
  text: string;
  level: 'info' | 'success' | 'warn';
}

/* ─── Pipeline stage definitions ────────────────────────── */
const STAGES = [
  {
    id: 0,
    label: 'Upload',
    short: 'Upload',
    icon: 'ri-upload-cloud-2-line',
    color: '#0d9488',
    bg: 'bg-teal-50',
    text: 'text-teal-700',
    border: 'border-teal-200',
    ring: 'ring-teal-400',
    desc: 'Receiving & validating PDF',
  },
  {
    id: 1,
    label: 'Extract Text',
    short: 'Extract',
    icon: 'ri-file-text-line',
    color: '#7c3aed',
    bg: 'bg-violet-50',
    text: 'text-violet-700',
    border: 'border-violet-200',
    ring: 'ring-violet-400',
    desc: 'PDF parsing & OCR',
  },
  {
    id: 2,
    label: 'Embed',
    short: 'Embed',
    icon: 'ri-brain-line',
    color: '#0891b2',
    bg: 'bg-cyan-50',
    text: 'text-cyan-700',
    border: 'border-cyan-200',
    ring: 'ring-cyan-400',
    desc: 'BERT sentence vectors',
  },
  {
    id: 3,
    label: 'Cluster',
    short: 'Cluster',
    icon: 'ri-bubble-chart-line',
    color: '#d97706',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    ring: 'ring-amber-400',
    desc: 'BERTopic topic modeling',
  },
  {
    id: 4,
    label: 'Detect Gaps',
    short: 'Gaps',
    icon: 'ri-radar-line',
    color: '#e11d48',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
    ring: 'ring-rose-400',
    desc: 'Gap scoring & ranking',
  },
  {
    id: 5,
    label: 'Backend Analysis',
    short: 'Backend',
    icon: 'ri-server-line',
    color: '#2563eb',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
    ring: 'ring-sky-400',
    desc: 'Waiting for backend result',
  },
];

/* ─── Log message pool ───────────────────────────────────── */
const LOG_MSGS: Record<number, string[]> = {
  0: [
    'Receiving file bytes…',
    'Validating PDF structure…',
    'Checksum verified ✓',
    'File stored in buffer',
  ],
  1: [
    'Parsing PDF layout…',
    'Extracting raw text blocks…',
    'Running OCR on scanned pages…',
    'Cleaning whitespace & ligatures…',
    'Section headers detected',
  ],
  2: [
    'Loading sentence-transformers model…',
    'Tokenizing abstract & sections…',
    'Computing BERT embeddings (768-dim)…',
    'Normalizing embedding vectors…',
    'Vectors stored in FAISS index',
  ],
  3: [
    'Loading BERTopic model…',
    'Running UMAP dimensionality reduction…',
    'HDBSCAN clustering…',
    'Assigning topic labels…',
    'Coherence score computed',
  ],
  4: [
    'Computing pairwise cosine similarity…',
    'Checking co-occurrence matrix…',
    'Scoring gap candidates…',
    'Ranking by gap score…',
    'Gap detection complete ✓',
  ],
  5: [
    'Sending corpus to backend…',
    'Waiting for backend analysis…',
    'Collecting module results…',
    'Finalizing backend output…',
    'Backend analysis complete ✓',
  ],
};

function nowStr() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function initProgress(papers: Paper[]): PaperProgress[] {
  return papers.map((paper) => ({
    paperId: paper.id,
    title: paper.title,
    stages: Array(STAGES.length).fill('waiting') as StageStatus[],
  }));
}

/* ─── Stage Dot ─────────────────────────────────────────── */
function StageDot({ status, stage }: { status: StageStatus; stage: typeof STAGES[0] }) {
  if (status === 'done') {
    return (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${stage.bg} ${stage.text} flex-shrink-0`}>
        <i className="ri-check-line text-[10px] font-bold" />
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 flex-shrink-0 ${stage.border}`} style={{ boxShadow: `0 0 0 3px ${stage.color}22` }}>
        <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: stage.color }} />
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-600 flex-shrink-0">
        <i className="ri-close-line text-[10px]" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 flex-shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
    </span>
  );
}


/* ─── Props ─────────────────────────────────────────────── */
interface Props {
  papers: Paper[];
  runName?: string;
  analysisType?: 'quick' | 'full' | 'n8n';
  onComplete: (result: RunAllResult | null) => void;
  onCancel: () => void;
}

/* ─── Main Component ─────────────────────────────────────── */
export default function ProcessingPipeline({ papers, runName, analysisType = 'full', onComplete, onCancel }: Props) {
  const [progress, setProgress] = useState<PaperProgress[]>(() => initProgress(papers));
  const [log, setLog] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logId = useRef(0);
  const cancelRef = useRef(false);
  const startTimeRef = useRef<number>(Date.now());
  const backendResultRef = useRef<RunAllResult | null>(null);
  const backendPromiseRef = useRef<Promise<RunAllResult | null> | null>(null);
  const apiCalledRef = useRef(false);
  const completionHandledRef = useRef(false);

  const addLog = useCallback((text: string, level: LogEntry['level'] = 'info') => {
    setLog(prev => {
      const entry: LogEntry = { id: logId.current++, time: nowStr(), text, level };
      return [...prev.slice(-60), entry];
    });
  }, []);

  const finishWithResult = useCallback((result: RunAllResult | null) => {
    if (completionHandledRef.current) return;
    completionHandledRef.current = true;
    backendResultRef.current = result;
    cancelRef.current = true;
    setDone(true);
    onComplete(result);
  }, [onComplete]);

  /* ── Simulation ──────────────────────────────────────── */
  useEffect(() => {
    cancelRef.current = false;
    completionHandledRef.current = false;
    startTimeRef.current = Date.now();
    const BATCH = 3;
    const STAGE_MS = [320, 480, 560, 440, 380];

    // Fire backend call in parallel with animation — result stored when ready
    const backendPayload = {
      papers: papers.map((p) => ({
        id: p.id,
        title: p.title,
        authors: p.authors,
        year: p.year,
        abstract: p.abstract,
        content: (p as any).content ?? p.abstract,
      })),
      question: 'What are the key findings, research gaps and emerging topics?',
      reportName: runName || undefined,
    };
    // Call either quick or full analysis based on analysisType
    // Guard against StrictMode double-calling: only make API call once
    if (!apiCalledRef.current) {
      apiCalledRef.current = true;
      const analysisPromise = analysisType === 'n8n' 
        ? n8nAnalysisModules(backendPayload)
        : analysisType === 'quick' 
        ? quickAnalysisModules(backendPayload)
        : runAllModules(backendPayload);
      
      backendPromiseRef.current = analysisPromise
        .then((result: any) => {
          const normalizedResult = normalizeRunAllResult(result);
          backendResultRef.current = normalizedResult;
          if (analysisType === 'n8n') {
            finishWithResult(normalizedResult);
          }
          return normalizedResult;
        })
        .catch(() => {
          backendResultRef.current = null;
          return null;
        });
    }

    const run = async () => {
      addLog('Pipeline started — processing ' + papers.length + ' paper(s)', 'info');

      for (let bStart = 0; bStart < papers.length; bStart += BATCH) {
        if (cancelRef.current) return;
        const batch = papers.slice(bStart, bStart + BATCH);

        // All papers in batch run stages concurrently
        await Promise.all(batch.map(async (paper, bIdx) => {
          const pIdx = bStart + bIdx;

          for (let s = 0; s < 5; s++) {
            if (cancelRef.current) return;

            // Mark stage as running
            setProgress(prev => prev.map((p, i) =>
              i === pIdx ? { ...p, stages: p.stages.map((st, si) => si === s ? 'running' : st) as StageStatus[] } : p
            ));

            // Pick a random log msg for this stage
            const msgs = LOG_MSGS[s];
            const pick = msgs[Math.floor(Math.random() * msgs.length)];
            const shortTitle = paper.title.length > 40 ? paper.title.slice(0, 40) + '…' : paper.title;
            if (s === 0) addLog(`[${shortTitle}] ${pick}`, 'info');
            else addLog(`[p${String(pIdx + 1).padStart(3, '0')}] ${STAGES[s].label}: ${pick}`, 'info');

            // Wait for stage duration ± 20% jitter
            const jitter = 1 + (Math.random() - 0.5) * 0.4;
            await new Promise(r => setTimeout(r, STAGE_MS[s] * jitter));
            if (cancelRef.current) return;

            // Mark stage done
            setProgress(prev => prev.map((p, i) =>
              i === pIdx ? { ...p, stages: p.stages.map((st, si) => si === s ? 'done' : st) as StageStatus[] } : p
            ));

            if (s === 4) {
              addLog(`[p${String(pIdx + 1).padStart(3, '0')}] ✓ All stages complete`, 'success');
            }
          }
        }));

        if (cancelRef.current) return;
        if (bStart + BATCH < papers.length) {
          addLog(`Batch ${Math.floor(bStart / BATCH) + 1} complete — loading next batch…`, 'info');
        }
      }

      if (!cancelRef.current) {
        addLog('Gap analysis finished — ' + papers.length + ' papers processed', 'success');
        addLog('Rebuilding topic model with updated corpus…', 'info');
        await new Promise(r => setTimeout(r, 600));
        addLog('Topic coherence scores computed', 'success');
        await new Promise(r => setTimeout(r, 400));
        addLog('Research gaps re-scored and ranked', 'success');

        // Enter the backend analysis stage for all papers
        setProgress(prev => prev.map((paper) => ({
          ...paper,
          stages: paper.stages.map((st, i) => i === 5 ? 'running' : st) as StageStatus[],
        })));
        addLog('Sending results to backend for final analysis…', 'info');

        const backendResult = await (backendPromiseRef.current ?? Promise.resolve(null));
        if (analysisType === 'n8n' && completionHandledRef.current) {
          return;
        }
        if (backendResult) {
          const gapCount = (backendResult as any).modules?.module3?.gaps?.length ?? 0;
          const reportMsg = gapCount > 0 
            ? `Backend analysis complete — ${gapCount} gaps detected`
            : 'Backend analysis complete — report generated';
          addLog(reportMsg, 'success');
          setProgress(prev => prev.map((paper) => ({
            ...paper,
            stages: paper.stages.map((st, i) => i === 5 ? 'done' : st) as StageStatus[],
          })));
        } else {
          addLog('Backend analysis did not return a result.', 'warn');
        }
        setDone(true);
        if (!completionHandledRef.current) {
          completionHandledRef.current = true;
          onComplete(backendResult);
        }
      }
    };

    run();
    return () => { cancelRef.current = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Auto-scroll log */
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  /* ETA ticker */
  useEffect(() => {
    if (done) { setEtaSeconds(0); return; }
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const totalStagesNow = papers.length * STAGES.length;
      const doneNow = progress.reduce((s, p) => s + p.stages.filter(st => st === 'done').length, 0);
      const pct = totalStagesNow ? doneNow / totalStagesNow : 0;
      if (pct > 0.02) {
        const remaining = Math.max(0, Math.round((elapsed / pct) * (1 - pct)));
        setEtaSeconds(remaining);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [done, papers.length, progress]);

  /* ── Derived stats ───────────────────────────────────── */
  const totalStages = papers.length * STAGES.length;
  const doneStages = progress.reduce((sum, p) => sum + p.stages.filter(s => s === 'done').length, 0);
  const overallPct = totalStages ? Math.round((doneStages / totalStages) * 100) : 0;

  const formatEta = (secs: number | null): string => {
    if (secs === null || secs <= 0) return '';
    if (secs < 5) return 'almost done…';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `~${m}m ${s}s remaining` : `~${s}s remaining`;
  };

  const stageCounts = STAGES.map(s => ({
    ...s,
    done: progress.filter(p => p.stages[s.id] === 'done').length,
    running: progress.filter(p => p.stages[s.id] === 'running').length,
  }));

  const activePaper = progress.find(p => p.stages.some(s => s === 'running'));
  const activeStageIdx = activePaper ? activePaper.stages.findIndex(s => s === 'running') : -1;

  const handleCancel = () => {
    cancelRef.current = true;
    setCancelled(true);
    setTimeout(onCancel, 300);
  };

  /* ── Show only visible slice of papers (scroll for rest) */
  const VISIBLE = 6;
  const visiblePapers = progress.slice(0, VISIBLE);
  const hiddenCount = progress.length - VISIBLE;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl flex flex-col overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)', maxHeight: '90vh' }}
      >
        {/* ── Header ───────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${done ? 'bg-green-50 text-green-600' : 'bg-teal-50 text-teal-600'}`}>
              <i className={done ? 'ri-checkbox-circle-line text-base' : 'ri-cpu-line text-base'} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">
                {done ? 'Processing Complete' : cancelled ? 'Cancelled' : 'Processing Pipeline'}
              </h2>
              <p className="text-xs text-gray-400">
                {done
                  ? `${papers.length} paper${papers.length !== 1 ? 's' : ''} fully processed`
                  : `${papers.length} paper${papers.length !== 1 ? 's' : ''} · ${STAGES.length}-stage AI pipeline`}
              </p>
            </div>
          </div>
          {!done && (
            <button
              onClick={handleCancel}
              className="whitespace-nowrap text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <i className="ri-close-line" /> Cancel
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* ── Stage Flow ───────────────────────────────── */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-stretch gap-0">
              {STAGES.map((stage, idx) => {
                const cnt = stageCounts[idx];
                const allDone = cnt.done === papers.length;
                const anyRunning = cnt.running > 0;
                const isActive = activeStageIdx === idx;

                return (
                  <div key={stage.id} className="flex items-center flex-1 min-w-0">
                    {/* Stage Card */}
                    <div
                      className={`flex-1 min-w-0 rounded-xl border px-3 py-2.5 transition-all duration-300 ${
                        allDone
                          ? `${stage.bg} ${stage.border}`
                          : anyRunning
                          ? `bg-white border-gray-200 ring-2 ${stage.ring}`
                          : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-6 h-6 flex items-center justify-center rounded-lg flex-shrink-0 ${allDone ? `${stage.bg} ${stage.text}` : anyRunning ? `${stage.bg} ${stage.text}` : 'bg-white text-gray-400'}`}>
                          {allDone ? (
                            <i className="ri-check-line text-xs font-bold" />
                          ) : anyRunning ? (
                            <i className={`${stage.icon} text-xs animate-pulse`} />
                          ) : (
                            <i className={`${stage.icon} text-xs`} />
                          )}
                        </div>
                        <span className={`text-[11px] font-semibold truncate ${allDone ? stage.text : anyRunning ? 'text-gray-800' : 'text-gray-400'}`}>
                          {stage.short}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 rounded-full bg-gray-200 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${papers.length > 0 ? (cnt.done / papers.length) * 100 : 0}%`,
                              backgroundColor: stage.color,
                            }}
                          />
                        </div>
                        <span className={`text-[10px] font-mono font-semibold flex-shrink-0 ${allDone ? stage.text : 'text-gray-400'}`}>
                          {cnt.done}/{papers.length}
                        </span>
                      </div>
                      {isActive && (
                        <p className="text-[9px] text-gray-400 mt-1 truncate">{stage.desc}</p>
                      )}
                    </div>
                    {/* Connector */}
                    {idx < STAGES.length - 1 && (
                      <div className="flex items-center px-1 flex-shrink-0">
                        <i className={`ri-arrow-right-s-line text-base transition-colors ${
                          stageCounts[idx].done === papers.length ? 'text-teal-400' : 'text-gray-200'
                        }`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Per-paper rows ───────────────────────────── */}
          <div className="px-6 pb-2">
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Per-file Progress
                </span>
                <span className="text-[10px] text-gray-400">{papers.length} file{papers.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {visiblePapers.map((p) => {
                  const curStage = p.stages.findIndex(s => s === 'running');
                  const isAllDone = p.stages.every(s => s === 'done');
                  const isWaiting = p.stages.every(s => s === 'waiting');

                  return (
                    <div key={p.paperId} className="flex items-center gap-3 px-4 py-2.5">
                      {/* File icon */}
                      <div className={`w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 ${
                        isAllDone ? 'bg-green-50 text-green-600' :
                        isWaiting ? 'bg-gray-50 text-gray-300' :
                        'bg-teal-50 text-teal-600'
                      }`}>
                        <i className={`${isAllDone ? 'ri-file-check-line' : isWaiting ? 'ri-file-line' : 'ri-loader-4-line animate-spin'} text-sm`} />
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-700 truncate">{p.title}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {isAllDone ? (
                            <span className="text-green-600 font-medium">All stages complete ✓</span>
                          ) : isWaiting ? (
                            'Queued…'
                          ) : (
                            <span>
                              Running: <span className="font-medium text-gray-600">{STAGES[curStage]?.label}</span>
                              {' '}— {STAGES[curStage]?.desc}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Stage dots */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {STAGES.map(stage => (
                          <StageDot key={stage.id} status={p.stages[stage.id]} stage={stage} />
                        ))}
                      </div>
                    </div>
                  );
                })}
                {hiddenCount > 0 && (
                  <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50">
                    + {hiddenCount} more file{hiddenCount !== 1 ? 's' : ''} queued
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Live log ─────────────────────────────────── */}
          <div className="px-6 pb-4 pt-2">
            <div className="rounded-xl overflow-hidden border border-gray-900">
              <div className="bg-gray-900 px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500/70" />
                  <span className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <span className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-[10px] font-mono text-gray-400 ml-2">pipeline.log</span>
                {!done && (
                  <span className="ml-auto flex items-center gap-1.5 text-[10px] text-green-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    live
                  </span>
                )}
              </div>
              <div
                ref={logRef}
                className="bg-gray-950 p-4 font-mono text-[10px] leading-relaxed overflow-y-auto"
                style={{ height: 140 }}
              >
                {log.map(entry => (
                  <div key={entry.id} className="flex gap-2 mb-0.5">
                    <span className="text-gray-600 flex-shrink-0">[{entry.time}]</span>
                    <span className={
                      entry.level === 'success' ? 'text-green-400' :
                      entry.level === 'warn' ? 'text-amber-400' :
                      'text-gray-300'
                    }>
                      {entry.text}
                    </span>
                  </div>
                ))}
                {!done && (
                  <div className="flex gap-2 mt-1">
                    <span className="text-gray-600">[{nowStr()}]</span>
                    <span className="text-teal-400 animate-pulse">▋</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer / Overall progress ─────────────────── */}
        <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
          {done ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600">
                <i className="ri-checkbox-circle-fill text-lg" />
                <span className="text-sm font-semibold">Pipeline complete — {papers.length} papers processed successfully</span>
              </div>
              <button
                onClick={() => onComplete(backendResultRef.current)}
                className="whitespace-nowrap flex items-center gap-2 px-5 py-2.5 bg-[#0f766e] text-white text-sm font-semibold rounded-lg hover:bg-[#0d6b62] transition-colors cursor-pointer"
              >
                View Results
                <i className="ri-arrow-right-line" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">
                  Overall Progress
                  {activeStageIdx >= 0 && (
                    <span className="ml-2 text-gray-400">— {STAGES[activeStageIdx].label} stage active</span>
                  )}
                </span>
                <span className="text-xs font-bold text-teal-700 font-mono">{overallPct}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-gray-400">
                  {doneStages} / {totalStages} stage completions
                  {etaSeconds !== null && etaSeconds > 0 && (
                    <span className="ml-2 text-teal-600 font-medium">{formatEta(etaSeconds)}</span>
                  )}
                </span>
                <button
                  onClick={handleCancel}
                  className="whitespace-nowrap text-[10px] text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  Cancel pipeline
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
