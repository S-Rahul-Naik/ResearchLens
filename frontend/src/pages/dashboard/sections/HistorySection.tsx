import { useMemo, useState } from 'react';
import type { AnalysisRun } from '../../../hooks/useAnalysisHistory';

interface HistorySectionProps {
  runs: AnalysisRun[];
  onViewRun?: (run: AnalysisRun) => void;
  removeRun: (id: string) => void;
  clearAll: () => void;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function timeAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return 'just now';
}

function QualityBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.8 ? 'bg-emerald-400' : score >= 0.7 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-500 w-10 text-right">{pct}%</span>
    </div>
  );
}

export default function HistorySection({ runs, onViewRun, removeRun, clearAll }: HistorySectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRuns = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return runs;
    return runs.filter((run) =>
      run.name.toLowerCase().includes(query) ||
      run.topGap.toLowerCase().includes(query) ||
      run.topTopics.some((topic) => topic.toLowerCase().includes(query)) ||
      run.yearRange.start.toString().includes(query) ||
      run.yearRange.end.toString().includes(query)
    );
  }, [runs, searchQuery]);

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 mb-2">Analysis History</p>
          <h1 className="text-2xl font-bold text-slate-900">Saved analysis reports</h1>
          <p className="mt-2 text-sm text-slate-500 max-w-2xl">
            Every analysis run is stored here with the report name, timestamp, quality score, and uploaded paper details.
            Click a run to inspect it again or review the papers that were analyzed.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-slate-700">
            <div className="text-xs text-gray-400 uppercase tracking-[0.24em] mb-1">Saved runs</div>
            <div className="text-xl font-semibold">{runs.length}</div>
          </div>
          <button
            onClick={() => clearAll()}
            className="inline-flex items-center justify-center rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            Clear history
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search run name, topics, or gaps..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-10 py-3 text-sm text-slate-700 shadow-sm focus:border-teal-400 focus:outline-none"
          />
        </div>
      </div>

      {filteredRuns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm text-slate-500">
          No analysis reports found. Run a pipeline to record a new report.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRuns.map((run) => {
            const isExpanded = expandedId === run.id;
            return (
              <div key={run.id} className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col xl:flex-row gap-4 xl:items-start xl:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mb-2">
                      <span>{formatDate(run.timestamp)}</span>
                      <span className="inline-flex h-1 w-1 rounded-full bg-slate-300" />
                      <span>{timeAgo(run.timestamp)}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 truncate">{run.name}</h2>
                    <p className="mt-2 text-sm text-slate-600 max-w-2xl">Top gap: <span className="font-semibold text-slate-900">{run.topGap}</span></p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {onViewRun && (
                      <button
                        onClick={() => onViewRun(run)}
                        className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100"
                      >
                        View report
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : run.id)}
                      className="rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isExpanded ? 'Hide details' : 'Show details'}
                    </button>
                    <button
                      onClick={() => removeRun(run.id)}
                      className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Stats</div>
                    <div className="space-y-3 text-sm text-slate-600">
                      <div className="flex justify-between gap-2"><span>Papers</span><strong>{run.papers}</strong></div>
                      <div className="flex justify-between gap-2"><span>Topics</span><strong>{run.topics}</strong></div>
                      <div className="flex justify-between gap-2"><span>Gaps</span><strong>{run.gaps}</strong></div>
                      <div className="flex justify-between gap-2"><span>Years</span><strong>{run.yearRange.start}–{run.yearRange.end}</strong></div>
                    </div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Quality</div>
                    <QualityBar score={run.qualityScore} />
                    <div className="mt-3 text-xs text-slate-500">Processing time: {run.processingTime}</div>
                  </div>
                  <div className="rounded-3xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-2">Top topics</div>
                    <div className="flex flex-wrap gap-2">
                      {run.topTopics.map((topic) => (
                        <span key={topic} className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-600 border border-slate-200">{topic}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-6 rounded-3xl border border-gray-100 bg-slate-50 p-5">
                    <div className="grid gap-5 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-3">Uploaded papers</p>
                        {run.backendPapers && run.backendPapers.length > 0 ? (
                          <div className="space-y-3">
                            {run.backendPapers.slice(0, 6).map((paper) => (
                              <div key={paper.id} className="rounded-2xl bg-white p-3 border border-gray-100">
                                <p className="text-sm font-semibold text-slate-900 truncate">{paper.title}</p>
                                <p className="mt-1 text-[10px] text-slate-500">{paper.authors?.slice(0, 2).join(', ')}{paper.authors && paper.authors.length > 2 ? '...' : ''} · {paper.year || 'n/a'}</p>
                              </div>
                            ))}
                            {run.backendPapers.length > 6 && (
                              <div className="text-[11px] text-slate-500">+{run.backendPapers.length - 6} more papers</div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No paper details were stored for this run.</p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400 mb-3">Notes</p>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {run.notes || 'No notes were added for this run.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
