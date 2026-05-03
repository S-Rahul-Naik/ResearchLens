import { useState } from 'react';
import type { AnalysisRun } from '../../../hooks/useAnalysisHistory';

interface Props {
  open: boolean;
  onClose: () => void;
  onViewRun?: (run: AnalysisRun) => void;
  runs: AnalysisRun[];
  removeRun: (id: string) => void;
  clearAll: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function QualityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-emerald-400' : score >= 0.7 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-bold text-gray-500 w-7 text-right">{pct}%</span>
    </div>
  );
}

function RunCard({ run, onDelete, onViewRun }: { run: AnalysisRun; onDelete: () => void; onViewRun?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:border-gray-200 transition-all">
      {/* Timeline connector */}
      <div className="flex">
        <div className="w-10 flex-shrink-0 flex flex-col items-center pt-4 pb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400 flex-shrink-0 ring-2 ring-teal-100 z-10" />
          <div className="w-px flex-1 bg-gray-100 mt-1" />
        </div>
        <div className="flex-1 min-w-0 pt-3 pb-3 pr-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-gray-800 truncate">{run.name}</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">{formatDate(run.timestamp)} · <span className="font-medium text-teal-600">{timeAgo(run.timestamp)}</span></p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {onViewRun && (
                <button
                  onClick={onViewRun}
                  title="View full results"
                  className="whitespace-nowrap flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 text-teal-700 text-[10px] font-semibold hover:bg-teal-100 transition-colors cursor-pointer"
                >
                  <i className="ri-eye-line text-[10px]" />
                  View
                </button>
              )}
              <button
                onClick={() => setExpanded(e => !e)}
                className="whitespace-nowrap w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <i className={`ri-arrow-${expanded ? 'up' : 'down'}-s-line text-xs`} />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button onClick={onDelete} className="whitespace-nowrap text-[9px] bg-rose-500 text-white px-1.5 py-1 rounded-md cursor-pointer hover:bg-rose-600">Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="whitespace-nowrap text-[9px] text-gray-500 px-1.5 py-1 rounded-md cursor-pointer hover:bg-gray-100">Cancel</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="whitespace-nowrap w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-50 text-gray-300 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <i className="ri-delete-bin-6-line text-xs" />
                </button>
              )}
            </div>
          </div>

          {/* Core stats */}
          <div className="flex flex-wrap gap-2 mb-2">
            {[
              { icon: 'ri-file-text-line', val: run.papers, label: 'papers', color: 'text-teal-600 bg-teal-50' },
              { icon: 'ri-price-tag-3-line', val: run.topics, label: 'topics', color: 'text-violet-600 bg-violet-50' },
              { icon: 'ri-radar-line', val: run.gaps, label: 'gaps', color: 'text-amber-600 bg-amber-50' },
            ].map(s => (
              <span key={s.label} className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
                <i className={`${s.icon} text-[9px]`} />
                {s.val} {s.label}
              </span>
            ))}
            <span className="text-[10px] text-gray-400 font-medium">{run.yearRange.start}–{run.yearRange.end}</span>
          </div>

          {/* Quality bar */}
          <div className="mb-1">
            <span className="text-[10px] text-gray-400 block mb-1">Quality score</span>
            <QualityBar score={run.qualityScore} />
          </div>

          {/* Top gap badge */}
          <div className="mt-2 flex items-start gap-1.5">
            <i className="ri-arrow-right-s-line text-amber-400 text-xs flex-shrink-0 mt-0.5" />
            <span className="text-[10px] text-gray-500">Top gap: <strong className="text-gray-700">{run.topGap}</strong></span>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Top Topics</p>
                <div className="flex flex-wrap gap-1.5">
                  {run.topTopics.map(t => (
                    <span key={t} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-gray-500">
                <span><i className="ri-time-line mr-1 text-gray-400" />{run.processingTime} processing</span>
                <span><i className="ri-calendar-line mr-1 text-gray-400" />{run.papers} papers</span>
              </div>
              {run.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-amber-700 italic">&ldquo;{run.notes}&rdquo;</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AnalysisHistoryPanel({ open, onClose, onViewRun, runs = [], removeRun, clearAll }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = runs.filter(r =>
    !searchQuery.trim() ||
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.topGap.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.topTopics.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-[420px] bg-[#f8f9fb] shadow-2xl flex flex-col">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <i className="ri-history-line text-base" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Analysis History</h3>
              <p className="text-[10px] text-gray-400">{runs.length} pipeline run{runs.length !== 1 ? 's' : ''} recorded</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {runs.length > 0 && (
              confirmClear ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => { clearAll(); setConfirmClear(false); }} className="whitespace-nowrap text-[10px] bg-rose-500 text-white px-2 py-1 rounded-md cursor-pointer hover:bg-rose-600">Clear all</button>
                  <button onClick={() => setConfirmClear(false)} className="whitespace-nowrap text-[10px] text-gray-500 px-2 py-1 rounded-md cursor-pointer hover:bg-gray-100">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} className="whitespace-nowrap text-[10px] text-gray-400 hover:text-rose-500 px-2 py-1 rounded-md cursor-pointer transition-colors">
                  Clear all
                </button>
              )
            )}
            <button onClick={onClose} className="whitespace-nowrap w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
              <i className="ri-close-line text-sm" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white border-b border-gray-100 px-5 py-3 flex-shrink-0">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search runs, topics, gaps…"
              className="w-full pl-9 pr-4 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 bg-gray-50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="whitespace-nowrap absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 cursor-pointer">
                <i className="ri-close-line text-[10px] text-gray-500" />
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <i className="ri-history-line text-4xl text-gray-200 block mb-3" />
              <p className="text-sm font-medium text-gray-400">
                {searchQuery ? 'No runs match your search' : 'No analysis runs yet'}
              </p>
              <p className="text-xs text-gray-300 mt-1">
                {searchQuery ? 'Try a different query' : 'Run a pipeline to record it here'}
              </p>
            </div>
          ) : (
            <>
              {searchQuery && (
                <p className="text-[10px] text-gray-400 px-1 mb-1">
                  {filtered.length} of {runs.length} runs
                </p>
              )}
              {filtered.map(run => (
                <RunCard
                  key={run.id}
                  run={run}
                  onDelete={() => removeRun(run.id)}
                  onViewRun={onViewRun ? () => { onViewRun(run); onClose(); } : undefined}
                />
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-gray-100 px-5 py-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-[10px] text-gray-400">
            <i className="ri-information-line text-gray-300" />
            <span>History is stored locally in your browser. Runs are recorded automatically after each pipeline completes.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
