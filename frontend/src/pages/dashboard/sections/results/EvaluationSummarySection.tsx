import { useMemo } from 'react';
import type { RunAllResult } from '../../../../lib/api';

const TOPIC_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#3b82f6', '#ec4899', '#10b981', '#f97316'];

function MetricGauge({ label, value, color, description }: { label: string; value: number; color: string; description: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-700">{label}</span>
        <span className="text-lg font-bold" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

export default function EvaluationSummarySection({ backendResult }: { backendResult?: RunAllResult | null }) {
  const br = backendResult;

  const totalPapers = br?.papersCount ?? 0;
  const topics = br?.modules.module2.topics ?? [];
  const gaps = br?.modules.module3.gaps ?? [];
  const totalTopics = topics.length;
  const totalGaps = gaps.length;
  const highConfGaps = gaps.filter(g => g.gapScore > 0.5).length;
  const honestyScore = br?.modules.module10?.honestyScore ?? 0;

  const avgCoherence = topics.length > 0
    ? topics.reduce((s, t) => s + t.coherence, 0) / topics.length
    : 0;
  const topicCoverage = totalPapers > 0
    ? Math.min(1, topics.reduce((s, t) => s + t.paperIds.length, 0) / totalPapers)
    : 0;
  const gapNovelty = gaps.length > 0
    ? Math.min(1, gaps.reduce((s, g) => s + g.gapScore, 0) / gaps.length)
    : 0;
  const modelQuality = +((avgCoherence * 0.4 + topicCoverage * 0.3 + gapNovelty * 0.3)).toFixed(2);

  const coherenceByTopic = topics.map((t, i) => ({ topicName: t.name, score: t.coherence, color: TOPIC_COLORS[i % TOPIC_COLORS.length] }));

  // Gap score distribution (bucketed 0–1 in 0.2 steps)
  const gapScoreDist = [0, 0.2, 0.4, 0.6, 0.8].map(lo => ({
    range: `${lo.toFixed(1)}–${(lo + 0.2).toFixed(1)}`,
    count: gaps.filter(g => g.gapScore >= lo && g.gapScore < lo + 0.2).length,
  }));

  return (
    <section id="result-eval" className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
          <i className="ri-bar-chart-grouped-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 7</p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Evaluation Summary</h2>
        </div>
      </div>

      {/* Core numbers */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'ri-file-paper-2-line', label: 'Dataset Size', value: totalPapers, unit: 'papers', color: 'text-slate-700', bg: 'bg-slate-50' },
          { icon: 'ri-price-tag-3-line', label: 'Topics', value: totalTopics, unit: 'detected', color: 'text-teal-700', bg: 'bg-teal-50' },
          { icon: 'ri-radar-line', label: 'Gaps', value: totalGaps, unit: 'identified', color: 'text-rose-700', bg: 'bg-rose-50' },
          { icon: 'ri-shield-check-line', label: 'High-Conf Gaps', value: highConfGaps, unit: 'score > 0.5', color: 'text-amber-700', bg: 'bg-amber-50' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border border-gray-100 ${s.bg} px-5 py-4`}>
            <div className={`w-8 h-8 flex items-center justify-center rounded-lg bg-white mb-3 ${s.color}`}>
              <i className={`${s.icon} text-sm`} />
            </div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-medium text-gray-700">{s.label}</div>
            <div className="text-[10px] text-gray-400">{s.unit}</div>
          </div>
        ))}
      </div>

      {/* Quality metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <MetricGauge
          label="Topic Coherence"
          value={avgCoherence}
          color="#0d9488"
          description="Measures how semantically consistent the words within each topic are. Higher = more focused topic clusters."
        />
        <MetricGauge
          label="Topic Coverage"
          value={topicCoverage}
          color="#f59e0b"
          description="Proportion of uploaded papers successfully assigned to at least one topic. Higher = fewer unclustered outliers."
        />
        <MetricGauge
          label="Gap Novelty Score"
          value={gapNovelty}
          color="#e11d48"
          description="Estimates how non-obvious the detected gaps are relative to existing literature. Higher = more novel opportunities."
        />
        <MetricGauge
          label="Overall Model Quality"
          value={modelQuality}
          color="#8b5cf6"
          description="Composite score of coherence, coverage, and gap novelty weighted by dataset size and topic distribution balance."
        />
        <MetricGauge
          label="Scientific Honesty"
          value={honestyScore}
          color="#475569"
          description="Summarizes how strongly the outputs are supported by coverage, reliability, and sufficiency checks."
        />
      </div>

      {/* Per-topic coherence */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <p className="text-xs font-semibold text-gray-700 mb-4">Coherence by Topic</p>
        <div className="space-y-3">
          {coherenceByTopic.map(c => {
            const { color } = c;
            return (
              <div key={c.topicName}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600">{c.topicName}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color }}>{(c.score * 100).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.score * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gap score distribution */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <p className="text-xs font-semibold text-gray-700 mb-4">Gap Score Distribution</p>
        <div className="flex items-end gap-3 h-28">
          {gapScoreDist.map(b => {
            const maxCount = Math.max(...gapScoreDist.map(x => x.count), 1);
            const pct = (b.count / maxCount) * 100;
            return (
              <div key={b.range} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[11px] font-semibold text-gray-600">{b.count}</span>
                <div
                  className="w-full rounded-t-md bg-rose-400 transition-all duration-500 min-h-[3px]"
                  style={{ height: `${Math.max(pct * 0.8, b.count > 0 ? 4 : 0)}px` }}
                />
                <span className="text-[10px] text-gray-400">{b.range}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">
          Gap score ranges from 0 (no gap) to 1 (strongest possible gap). High concentration in 0.6–1.0 indicates strong, actionable research opportunities.
        </p>
      </div>
    </section>
  );
}
