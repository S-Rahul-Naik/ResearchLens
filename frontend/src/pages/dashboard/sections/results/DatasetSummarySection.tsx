import type { RunAllResult } from '../../../../lib/api';
import type { AnalysisRun } from '../../../../hooks/useAnalysisHistory';

export default function DatasetSummarySection({ run }: { run?: AnalysisRun | null }) {
  const br = run?.backendResult;
  const papersCount = br?.papersCount ?? run?.papers ?? 0;
  const topics = br?.modules.module2.topics ?? [];
  const topicsCount = topics.length || (run?.topics ?? 0);
  const gaps = br?.modules.module3.gaps ?? [];
  const gapsCount = gaps.length || (run?.gaps ?? 0);

  const allYears = br
    ? br.modules.module4.trends.flatMap(t => t.yearlyCounts.map(yc => yc.year))
    : run
      ? [run.yearRange.start, run.yearRange.end]
      : [];
  const yearRange = allYears.length > 0
    ? { start: Math.min(...allYears), end: Math.max(...allYears) }
    : { start: new Date().getFullYear(), end: new Date().getFullYear() };

  const risingTopics = br
    ? br.modules.module4.trends.filter(t => t.trend === 'rising').length
    : 0;

  const zeroCoocc = br ? gaps.filter(g => g.coOccurrence === 0).length : 0;

  const avgCoherence = br && topics.length > 0
    ? topics.reduce((s, t) => s + t.coherence, 0) / topics.length
    : 0;
  const topicCoverage = br && papersCount > 0
    ? Math.min(1, topics.reduce((s, t) => s + t.paperIds.length, 0) / papersCount)
    : 0;
  const gapNovelty = br && gapsCount > 0
    ? Math.min(1, gaps.reduce((s, g) => s + g.gapScore, 0) / gapsCount)
    : 0;
  const modelQuality = br
    ? +((avgCoherence * 0.4 + topicCoverage * 0.3 + gapNovelty * 0.3)).toFixed(2)
    : run?.qualityScore ?? 0;

  const processingTimeMs = 0;
  const avgPapersPerTopic = topics.length > 0
    ? +(topics.reduce((s, t) => s + t.paperIds.length, 0) / topics.length).toFixed(1)
    : 0;
  const highConfGaps = gaps.filter(g => g.gapScore > 0.5).length;

  const qualityMetrics = [
    { label: 'Topic Coherence', value: avgCoherence, color: '#0d9488' },
    { label: 'Topic Coverage', value: topicCoverage, color: '#f59e0b' },
    { label: 'Gap Novelty', value: gapNovelty, color: '#e11d48' },
    { label: 'Model Quality', value: modelQuality, color: '#8b5cf6' },
  ];

  const stats = [
    {
      icon: 'ri-file-paper-2-line',
      label: 'Total Papers',
      value: papersCount,
      sub: `${yearRange.start} – ${yearRange.end}`,
      color: 'text-slate-700',
      bg: 'bg-slate-50',
      border: 'border-slate-100',
      iconColor: 'text-slate-500',
    },
    {
      icon: 'ri-price-tag-3-line',
      label: 'Topics Detected',
      value: topicsCount,
      sub: `${risingTopics} rising`,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-100',
      iconColor: 'text-teal-600',
    },
    {
      icon: 'ri-radar-line',
      label: 'Gaps Identified',
      value: gapsCount,
      sub: `${zeroCoocc} zero co-occurrence`,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      iconColor: 'text-rose-500',
    },
    {
      icon: 'ri-calendar-line',
      label: 'Year Range',
      value: `${yearRange.start}–${yearRange.end}`,
      sub: `${yearRange.end - yearRange.start + 1} year span`,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      iconColor: 'text-amber-500',
    },
  ];

  return (
    <section id="result-dataset" className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
          <i className="ri-database-2-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 1</p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Dataset Summary</h2>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} px-5 py-5`}>
            <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-white mb-3 ${s.iconColor}`}>
              <i className={`${s.icon} text-base`} />
            </div>
            <div className={`text-2xl font-bold ${s.color} mb-0.5`}>{s.value}</div>
            <div className="text-xs font-semibold text-gray-700">{s.label}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Quality metrics */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Analysis Quality Scores</p>
        <div className="grid grid-cols-4 gap-6">
          {qualityMetrics.map(m => (
            <div key={m.label}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-600">{m.label}</span>
                <span className="text-xs font-bold text-gray-800">{(m.value * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${m.value * 100}%`, backgroundColor: m.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
          Processing completed in <strong className="text-gray-600">{br ? 'live' : `${(processingTimeMs / 1000).toFixed(2)}s`}</strong> &middot;
          Average <strong className="text-gray-600">{avgPapersPerTopic.toFixed ? avgPapersPerTopic.toFixed(1) : avgPapersPerTopic} papers per topic</strong> &middot;
          <strong className="text-gray-600"> {highConfGaps} high-confidence gaps</strong> detected (score &gt; 0.5)
        </p>
      </div>
    </section>
  );
}
