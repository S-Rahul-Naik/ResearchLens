import { mockTrends } from '../../../../mocks/trends';
import type { RunAllResult } from '../../../../lib/api';

const TOPIC_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#3b82f6', '#ec4899', '#10b981', '#f97316'];

const TREND_CONFIG = {
  rising: { label: 'Rising', icon: 'ri-arrow-right-up-line', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  stable: { label: 'Stable', icon: 'ri-arrow-right-line', color: 'text-amber-600', bg: 'bg-amber-50' },
  declining: { label: 'Declining', icon: 'ri-arrow-right-down-line', color: 'text-rose-600', bg: 'bg-rose-50' },
  insufficient_data: { label: 'Insufficient', icon: 'ri-alert-line', color: 'text-slate-600', bg: 'bg-slate-50' },
};

export default function TrendAnalysisSection({ backendResult }: { backendResult?: RunAllResult | null }) {
  const br = backendResult;

  // Normalize to a common display type
  interface DisplayTrend {
    topicId: string; topicName: string; color: string;
    trend: 'rising' | 'stable' | 'declining' | 'insufficient_data';
    growthRate: number; peakYear: number;
    dataPoints: { year: number; count: number }[];
    trendMessage?: string;
    temporalConfidence?: number;
    reliability?: number;
    llmTrendSummary?: string;
    llmParadigmShifts?: string[];
    llmReliabilityExplanation?: string;
    llmConfidence?: number;
  }

  const trends: DisplayTrend[] = br
    ? br.modules.module4.trends.map((t, i) => {
        const color = TOPIC_COLORS[i % TOPIC_COLORS.length];
        const peak = t.yearlyCounts.reduce((best, yc) => yc.count > best.count ? yc : best, t.yearlyCounts[0] ?? { year: 0, count: 0 });
        const maxC = Math.max(...t.yearlyCounts.map(yc => yc.count), 1);
        const minC = Math.min(...t.yearlyCounts.map(yc => yc.count), 0);
        const growthRate = maxC > 0 ? (maxC - minC) / maxC : 0;
        return {
          topicId: t.topicId,
          topicName: t.topicName,
          color,
          trend: t.trend,
          growthRate,
          peakYear: peak.year,
          dataPoints: t.yearlyCounts,
          trendMessage: (t as any).trendMessage,
          temporalConfidence: (t as any).temporalConfidence,
          reliability: (t as any).reliability,
          llmTrendSummary: (t as any).llm_trend_summary,
          llmParadigmShifts: (t as any).llm_paradigm_shifts,
          llmReliabilityExplanation: (t as any).llm_reliability_explanation,
          llmConfidence: (t as any).llm_confidence,
        };
      })
    : mockTrends.map(t => ({ ...t, dataPoints: t.dataPoints }));

  const allYears = Array.from(new Set(trends.flatMap(t => t.dataPoints.map(d => d.year)))).sort();
  const maxCount = Math.max(...trends.flatMap(t => t.dataPoints.map(d => d.count)), 1);

  return (
    <section id="result-trends" className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
          <i className="ri-line-chart-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 4</p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Trend Analysis Results</h2>
        </div>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Rising Topics', value: trends.filter(t => t.trend === 'rising').length, icon: 'ri-arrow-right-up-line', color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'Stable Topics', value: trends.filter(t => t.trend === 'stable').length, icon: 'ri-arrow-right-line', color: 'text-amber-700', bg: 'bg-amber-50' },
          { label: 'Fastest Growing', value: trends.length > 0 ? [...trends].sort((a, b) => b.growthRate - a.growthRate)[0].topicName : '—', icon: 'ri-rocket-line', color: 'text-teal-700', bg: 'bg-teal-50', small: true },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-gray-100 ${s.bg} px-5 py-4 flex items-center gap-3`}>
            <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-white ${s.color}`}>
              <i className={`${s.icon} text-base`} />
            </div>
            <div>
              <div className={`${s.small ? 'text-sm' : 'text-2xl'} font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Per-topic bars */}
      <div className="space-y-4">
        {[...trends].sort((a, b) => b.growthRate - a.growthRate).map(topic => {
          const trend = TREND_CONFIG[topic.trend] ?? TREND_CONFIG.stable;

          return (
            <div key={topic.topicId} className="bg-white rounded-xl border border-gray-100 p-5">
              {/* Topic header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: topic.color }} />
                <span className="text-sm font-semibold text-gray-900">{topic.topicName}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.bg} ${trend.color} flex items-center gap-1`}>
                  <i className={`${trend.icon} text-[10px]`} />
                  {trend.label}
                </span>
                <span className="text-xs text-gray-400 ml-auto"></span>
                <span className="text-xs text-gray-400">Peak: <strong className="text-gray-700">{topic.peakYear}</strong></span>
              </div>

              {(topic.llmTrendSummary || topic.llmParadigmShifts?.length || topic.llmReliabilityExplanation) && (
                <div className="mb-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2 text-[11px] text-teal-900 leading-relaxed space-y-1.5">
                  {topic.llmTrendSummary && <p>{topic.llmTrendSummary}</p>}
                  {topic.llmParadigmShifts && topic.llmParadigmShifts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {topic.llmParadigmShifts.map((shift) => (
                        <span key={shift} className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-teal-700 border border-teal-100">
                          {shift}
                        </span>
                      ))}
                    </div>
                  )}
                  {typeof topic.llmConfidence === 'number' && (
                    <p className="text-[10px] text-teal-700">LLM confidence: {Math.round(topic.llmConfidence * 100)}%</p>
                  )}
                  {topic.llmReliabilityExplanation && (
                    <p className="text-[10px] text-teal-700">{topic.llmReliabilityExplanation}</p>
                  )}
                </div>
              )}

                  {topic.trend === 'insufficient_data' && topic.trendMessage && (
                    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 leading-relaxed">
                      {topic.trendMessage}
                    </div>
                  )}

              {/* Year bar chart */}
              <div className="flex items-end gap-2">
                {allYears.map(year => {
                  const dp = topic.dataPoints.find(d => d.year === year);
                  const count = dp?.count ?? 0;
                  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;

                  return (
                    <div key={year} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-gray-600">{count > 0 ? count : ''}</span>
                      <div className="w-full rounded-t-sm transition-all duration-500 min-h-[3px]"
                        style={{
                          height: `${Math.max(pct * 0.8, count > 0 ? 3 : 0)}px`,
                          backgroundColor: count > 0 ? topic.color : 'transparent',
                          opacity: count > 0 ? 0.85 : 0,
                        }}
                      />
                      <span className="text-[9px] text-gray-400">{year}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
