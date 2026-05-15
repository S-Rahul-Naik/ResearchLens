import type { DashboardSection } from '../components/Sidebar';
import type { AnalysisRun } from '../../../hooks/useAnalysisHistory';
import { useEffect, useState } from 'react';
import { apiGetAnalysisReports, apiGetUserUploads } from '../../../lib/api';

interface OverviewSectionProps {
  onNavigate: (section: DashboardSection) => void;
  latestRun?: AnalysisRun | null;
}

export default function OverviewSection({ onNavigate, latestRun }: OverviewSectionProps) {
  const [loadedReport, setLoadedReport] = useState<AnalysisRun | null>(null);
  const [currentPaperCount, setCurrentPaperCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [rawReport, setRawReport] = useState<any | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  // Load reports from database and current paper count
  useEffect(() => {
    setLoading(true);
    
    Promise.all([
      apiGetAnalysisReports(),
      apiGetUserUploads(),
    ])
      .then(([reports, uploads]) => {
        if (reports.reports && reports.reports.length > 0) {
          setLoadedReport(reports.reports[0] as any);
        }
        setCurrentPaperCount(uploads.count);
      })
      .catch(() => {
        setLoadedReport(null);
        setCurrentPaperCount(0);
      })
      .finally(() => setLoading(false));
  }, [latestRun]);

  const run = latestRun || loadedReport;
  // Normalize counts from either backend AnalysisReport or local AnalysisRun
  const runPaperCount = (run as any)?.paperCount ?? (run as any)?.papers ?? (run as any)?.papersCount ?? 0;
  const runTopicCount = (run as any)?.topicCount ?? (run as any)?.topics ?? 0;
  const runGapCount = (run as any)?.gapCount ?? (run as any)?.gaps ?? 0;
  const runYearRange = (run as any)?.yearRange ?? { start: undefined, end: undefined };
    
  const analysisIsStale = run && currentPaperCount !== runPaperCount;
    
  // Use real data from run if available (support both backend report shape and client run shape)
  const realTopics = (run as any)?.module2?.topics ?? (run as any)?.backendResult?.modules?.module2?.topics ?? [];
  const realGaps = (run as any)?.module3?.gaps ?? (run as any)?.backendResult?.modules?.module3?.gaps ?? [];
  const realPapers = (run as any)?.module1?.summaries ?? (run as any)?.backendResult?.modules?.module1?.summaries ?? (run as any)?.backendPapers ?? [];
  // Get processed papers (backendPapers contains only papers from the latest run)
  const processedPapers = (run as any)?.backendPapers ?? [];

  const topGaps = realGaps.length > 0 ? realGaps.slice(0, 3) : [];
  const recentPapers = processedPapers.length > 0 ? processedPapers.slice(0, 5) : [];

  // Build stats from real data if available
  const stats = run
    ? [
        { label: 'Total Papers', value: runPaperCount || 0, icon: 'ri-file-text-line', color: 'bg-teal-50 text-teal-700', change: 'analyzed in latest run' },
        { label: 'Topics Detected', value: runTopicCount || 0, icon: 'ri-price-tag-3-line', color: 'bg-amber-50 text-amber-700', change: 'BERTopic clusters' },
        { label: 'Research Gaps', value: runGapCount || 0, icon: 'ri-radar-line', color: 'bg-rose-50 text-rose-600', change: `${realGaps.filter((g) => g.gapScore > 0.5).length} high-confidence` },
        { label: 'Avg Gap Score', value: ((run as any).qualityScore || 0).toFixed(2), icon: 'ri-bar-chart-2-line', color: 'bg-violet-50 text-violet-700', change: 'Computed score' },
      ]
    : [];

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="text-center">
          <i className="ri-loader-4-line animate-spin text-4xl text-teal-600 mb-4 block" />
          <p className="text-gray-500">Loading analysis data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {analysisIsStale && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <i className="ri-alert-line text-amber-600 text-xl flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">Analysis is out of date</p>
            <p className="text-xs text-amber-700 mt-1">
              Your dataset has changed since the last analysis ({currentPaperCount} papers now vs {(run as any).paperCount} analyzed). 
              Run a new analysis to update results.
            </p>
          </div>
          <button
            onClick={() => onNavigate('datasets')}
            className="whitespace-nowrap px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded-lg hover:bg-amber-700 transition-colors flex-shrink-0 mt-0.5"
          >
            Re-analyze
          </button>
        </div>
      )}

      {run ? (
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-5 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 flex-shrink-0">
              <i className="ri-file-chart-line text-base" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">Latest Run</p>
              <p className="text-sm font-semibold truncate">{(run as any).name}</p>
              <p className="text-xs text-white/60 mt-0.5">
                {runPaperCount} papers analyzed · {runTopicCount} topics · {runGapCount} gaps · {runYearRange?.start}–{runYearRange?.end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {[
              { label: 'Papers', val: runPaperCount, icon: 'ri-file-text-line' },
              { label: 'Topics', val: runTopicCount, icon: 'ri-price-tag-3-line' },
              { label: 'Gaps', val: runGapCount, icon: 'ri-radar-line' },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/10 rounded-xl px-4 py-2">
                <div className="text-lg font-bold">{s.val}</div>
                <div className="text-[10px] text-white/70">{s.label}</div>
              </div>
            ))}
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <div className="text-lg font-bold">{(((run as any).qualityScore || 0) * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-white/70">Quality</div>
            </div>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const reports = await apiGetAnalysisReports();
                  if (reports.reports && reports.reports.length > 0) {
                    const id = reports.reports[0].id || (reports.reports[0] as any)._id;
                    const full = await (await import('../../../lib/api')).apiGetAnalysisReport(id);
                    setRawReport(full);
                    setShowRaw(true);
                  }
                } catch (e) {
                  setRawReport({ error: 'Could not fetch report JSON' });
                  setShowRaw(true);
                } finally { setLoading(false); }
              }}
              className="ml-2 whitespace-nowrap text-xs bg-white/10 text-white px-3 py-1 rounded-lg hover:bg-white/20"
            >
              Show report JSON
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-100 to-gray-50 rounded-2xl p-8 text-center border border-gray-200">
          <i className="ri-file-chart-line text-4xl text-gray-400 block mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Analysis Results Yet</h3>
          <p className="text-gray-500 mb-6">Upload papers and run analysis to see results here</p>
          <button
            onClick={() => onNavigate('datasets')}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            <i className="ri-upload-cloud-2-line" />
            Get Started
          </button>
        </div>
      )}

      {stats.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${s.color} mb-4`}>
                <i className={`${s.icon} text-lg`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.change}</div>
            </div>
          ))}
        </div>
      )}

      {run && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-gray-900">Top Research Gaps</h3>
                <button
                  onClick={() => onNavigate('gaps')}
                  className="whitespace-nowrap text-xs text-teal-600 hover:underline cursor-pointer font-medium"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-4">
                {topGaps.length > 0 ? (
                  topGaps.map((gap, i) => (
                    <div key={gap.gapId || i} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">{gap.topicALabel || gap.topicAName}</span>
                          <span className="text-xs text-gray-400 self-center">↔</span>
                          <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">{gap.topicBLabel || gap.topicBName}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Similarity: <strong className="text-gray-800">{(gap.similarity || gap.similarityScore || 0).toFixed(2)}</strong></span>
                          <span>Co-occ: <strong className="text-gray-800">{gap.coOccurrence || gap.coOccurrenceCount || 0}</strong></span>
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded font-semibold">Gap: {gap.gapScore.toFixed(3)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No gaps detected in this analysis.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-sm font-semibold text-gray-900">Recent Papers</h3>
                <button
                  onClick={() => onNavigate('datasets')}
                  className="whitespace-nowrap text-xs text-teal-600 hover:underline cursor-pointer font-medium"
                >
                  View all →
                </button>
              </div>
              <div className="space-y-3">
                {recentPapers.length > 0 ? (
                  recentPapers.map((paper, idx) => (
                    <div key={paper.paperId || idx} className="flex items-start gap-3">
                      <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                        <i className="ri-file-pdf-line text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{paper.title}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No papers in this analysis.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">Topic Distribution</h3>
            {realTopics.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {realTopics.map((topic, idx) => {
                  const colors = ['#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#ec4899', '#6366f1'];
                  const color = colors[idx % colors.length];
                  return (
                    <div key={topic.topicId || idx} className="p-4 rounded-xl border border-gray-100" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                      <div className="text-sm font-semibold text-gray-800 mb-1">{topic.name}</div>
                      <div className="text-xs text-gray-400">{topic.paperIds?.length || 0} papers</div>
                      <div className="flex items-center gap-1 mt-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ backgroundColor: color, width: `${Math.min(100, ((topic.paperIds?.length || 0) / Math.max(1, (run as any).paperCount || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
                          {topic.trend ? (topic.trend === 'rising' ? '↑' : topic.trend === 'declining' ? '↓' : '→') : '→'} {topic.trend || 'stable'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">No topics detected in this analysis.</p>
              </div>
            )}
          </div>
        </>
      )}
      {showRaw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white w-full max-w-4xl max-h-[90vh] overflow-auto rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Raw Analysis Report JSON</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowRaw(false); setRawReport(null); }} className="text-xs px-3 py-1 rounded bg-gray-100">Close</button>
              </div>
            </div>
            <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{JSON.stringify(rawReport, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
