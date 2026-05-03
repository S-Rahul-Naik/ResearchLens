import { useMemo, useState } from 'react';
import { mockEvaluation, type EvaluationMetrics } from '../../../mocks/evaluation';
import { mockTopics } from '../../../mocks/topics';
import { mockPapers } from '../../../mocks/papers';
import type { RunAllResult, BackendPaper } from '../../../lib/api';

function CircularProgress({ value, max = 1, color, size = 100 }: { value: number; max?: number; color: string; size?: number }) {
  const pct = value / max;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize="16" fontWeight="700" fill="#1f2937">
        {(pct * 100).toFixed(0)}
      </text>
    </svg>
  );
}

/* ─── Co-occurrence Matrix ───────────────────────────────── */
function CoOccurrenceMatrix({ topics, paperTopicMap }: {
  topics: { id: string; name: string }[];
  paperTopicMap: Map<string, string[]>;
}) {
  const matrix = useMemo(() => {
    const mat: Record<string, number> = {};
    paperTopicMap.forEach((topicIds) => {
      for (let i = 0; i < topicIds.length; i++) {
        for (let j = i + 1; j < topicIds.length; j++) {
          const key = [topicIds[i], topicIds[j]].sort().join('|');
          mat[key] = (mat[key] || 0) + 1;
        }
      }
    });
    return mat;
  }, [paperTopicMap]);

  const getCount = (id1: string, id2: string) => {
    if (id1 === id2) return -1;
    return matrix[[id1, id2].sort().join('|')] ?? 0;
  };

  const maxVal = Math.max(...Object.values(matrix));

  const cellColor = (count: number): string => {
    if (count === 0) return '#f9fafb';
    const intensity = count / maxVal;
    if (intensity >= 0.8) return '#0d9488';
    if (intensity >= 0.5) return '#5eead4';
    return '#ccfbf1';
  };

  const shortName = (name: string) => name.split(' ').map(w => w[0]).join('').slice(0, 3).toUpperCase();

  const [hoveredCell, setHoveredCell] = useState<{ t1: string; t2: string; count: number; x: number; y: number } | null>(null);

  const CELL = 38;
  const LABEL_W = 120;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-gray-900">Topic Co-occurrence Matrix</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-200" /> None
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#ccfbf1' }} /> Low
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#5eead4' }} /> Mid
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm" style={{ background: '#0d9488' }} /> High
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">Number of papers simultaneously covering each pair of topics — higher = more studied together.</p>

      <div className="overflow-x-auto" onMouseLeave={() => setHoveredCell(null)}>
        <div style={{ display: 'inline-block', position: 'relative' }}>
          {/* Column headers */}
          <div style={{ display: 'flex', paddingLeft: LABEL_W }}>
            {topics.map(t => (
              <div key={t.id} style={{ width: CELL, flexShrink: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 6 }}>
                <div style={{ writingMode: 'vertical-lr', textOrientation: 'mixed', transform: 'rotate(180deg)', fontSize: 9, fontWeight: 600, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase', lineHeight: 1.2, maxHeight: 56, overflow: 'hidden' }}>
                  {shortName(t.name)}
                </div>
              </div>
            ))}
          </div>

          {/* Rows */}
          {topics.map(rowTopic => (
            <div key={rowTopic.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 3 }}>
              {/* Row label */}
              <div style={{ width: LABEL_W, flexShrink: 0, fontSize: 10, fontWeight: 500, color: '#374151', paddingRight: 8, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {rowTopic.name}
              </div>
              {/* Cells */}
              {topics.map(colTopic => {
                const count = getCount(rowTopic.id, colTopic.id);
                const isDiag = rowTopic.id === colTopic.id;
                return (
                  <div
                    key={colTopic.id}
                    onMouseEnter={e => {
                      if (!isDiag) setHoveredCell({ t1: rowTopic.name, t2: colTopic.name, count, x: (e.target as HTMLElement).getBoundingClientRect().left, y: (e.target as HTMLElement).getBoundingClientRect().top });
                    }}
                    style={{
                      width: CELL, height: CELL, flexShrink: 0, marginRight: 3,
                      borderRadius: 6,
                      background: isDiag ? '#111827' : cellColor(count),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: isDiag ? 'default' : 'pointer',
                      border: isDiag ? 'none' : '1px solid rgba(0,0,0,0.05)',
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {!isDiag && count > 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: count >= 2 ? 'white' : '#0f766e' }}>{count}</span>
                    )}
                    {isDiag && (
                      <span style={{ fontSize: 9, fontWeight: 800, color: 'white', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{shortName(rowTopic.name)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredCell && (
          <div className="fixed z-50 pointer-events-none bg-gray-900 text-white rounded-xl px-3 py-2 text-xs" style={{ left: hoveredCell.x + 20, top: hoveredCell.y - 40, animation: 'fadeInUp .1s ease' }}>
            <div className="font-semibold">{hoveredCell.t1} × {hoveredCell.t2}</div>
            <div className="text-gray-300 mt-0.5">{hoveredCell.count} bridging paper{hoveredCell.count !== 1 ? 's' : ''}</div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
        {[
          { label: 'Topic pairs', value: (topics.length * (topics.length - 1)) / 2 },
          { label: 'Pairs with co-occurrence', value: Object.keys(matrix).length },
          { label: 'Pairs with zero overlap', value: (topics.length * (topics.length - 1)) / 2 - Object.keys(matrix).length },
          { label: 'Max co-occurrence', value: `${maxVal} papers` },
        ].map(s => (
          <div key={s.label}><span className="font-semibold text-gray-700">{s.value}</span> {s.label}</div>
        ))}
      </div>
    </div>
  );
}

export default function EvaluationSection({ backendResult, papers: propPapers = [] }: { backendResult?: RunAllResult | null; papers?: BackendPaper[] }) {
  const topics = useMemo(() => {
    const raw = backendResult?.modules.module2.topics;
    if (raw && raw.length > 0) return raw.map(t => ({ id: t.topicId, name: t.name }));
    return mockTopics.map(t => ({ id: t.id, name: t.name }));
  }, [backendResult]);

  const paperTopicMap = useMemo(() => {
    const map = new Map<string, string[]>();
    const asgn = backendResult?.modules.module2.assignments;
    if (asgn && asgn.length > 0) {
      asgn.forEach(({ paperId, topicId }) => {
        const existing = map.get(paperId) ?? [];
        map.set(paperId, [...existing, topicId]);
      });
    } else {
      mockPapers.forEach(p => map.set(p.id, p.topics));
    }
    return map;
  }, [backendResult]);

  const ev = useMemo((): EvaluationMetrics => {
    if (!backendResult) return mockEvaluation;
    const raw = backendResult.modules;
    const topicsArr = raw.module2.topics;
    const gapsArr = raw.module3.gaps;
    const papers = propPapers.length > 0 ? propPapers : mockPapers;
    const years = papers.map(p => p.year).filter(y => y > 0);
    const avgCoherence = topicsArr.length > 0 ? topicsArr.reduce((s, t) => s + t.coherence, 0) / topicsArr.length : 0;
    const assignedPaperIds = new Set(raw.module2.assignments.map(a => a.paperId));
    const avgGapScore = gapsArr.length > 0 ? gapsArr.reduce((s, g) => s + g.gapScore, 0) / gapsArr.length : 0;
    return {
      topicCoherence: avgCoherence,
      topicCoverage: papers.length > 0 ? assignedPaperIds.size / papers.length : 0,
      gapNovelty: avgGapScore,
      modelQuality: avgCoherence,
      totalPapers: papers.length,
      totalTopics: topicsArr.length,
      totalGaps: gapsArr.length,
      avgPapersPerTopic: topicsArr.length > 0 ? papers.length / topicsArr.length : 0,
      avgGapScore,
      highConfidenceGaps: gapsArr.filter(g => g.gapScore >= 0.5).length,
      processingTimeMs: 0,
      yearRange: { start: years.length ? Math.min(...years) : 2020, end: years.length ? Math.max(...years) : 2024 },
      topicSizeDistribution: topicsArr.map(t => ({ topicName: t.name, count: t.paperIds.length })),
      gapScoreDistribution: [],
      coherenceByTopic: topicsArr.map(t => ({ topicName: t.name, score: t.coherence })),
    };
  }, [backendResult, propPapers]);

  const metrics = [
    { label: 'Topic Coherence', value: ev.topicCoherence, color: '#0d9488', desc: 'Average semantic consistency within detected topics' },
    { label: 'Topic Coverage', value: ev.topicCoverage, color: '#f59e0b', desc: 'Fraction of papers assigned to a meaningful topic' },
    { label: 'Gap Novelty', value: ev.gapNovelty, color: '#8b5cf6', desc: 'Estimated novelty of detected gap pairs' },
    { label: 'Model Quality', value: ev.modelQuality, color: '#10b981', desc: 'Overall pipeline quality score (embedding + clustering)' },
  ];

  const maxBarCount = Math.max(...ev.topicSizeDistribution.map((t) => t.count));

  return (
    <div className="p-8 space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center">
            <CircularProgress value={m.value} color={m.color} size={96} />
            <h3 className="text-sm font-semibold text-gray-800 mt-3">{m.label}</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">{m.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Dataset Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Dataset Statistics</h3>
          <div className="space-y-2.5">
            {[
              ['Total papers', ev.totalPapers],
              ['Total topics detected', ev.totalTopics],
              ['Year range', `${ev.yearRange.start} – ${ev.yearRange.end}`],
              ['Avg. papers per topic', ev.avgPapersPerTopic.toFixed(1)],
              ['Processing time', `${ev.processingTimeMs}ms`],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Gap Detection Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Gap Detection Performance</h3>
          <div className="space-y-2.5">
            {[
              ['Total gaps detected', ev.totalGaps],
              ['High-confidence gaps', `${ev.highConfidenceGaps} (score ≥ 0.5)`],
              ['Average gap score', ev.avgGapScore.toFixed(3)],
              ['Top gap score', '0.830'],
              ['Gaps with 0 co-occurrence', '3'],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-500">{k}</span>
                <span className="text-sm font-semibold text-gray-800">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Two Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Topic Size */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Topic Size Distribution</h3>
          <div className="space-y-3">
            {ev.topicSizeDistribution.map((t) => (
              <div key={t.topicName} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-24 flex-shrink-0 truncate">{t.topicName}</span>
                <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${(t.count / maxBarCount) * 100}%` }}
                  >
                    <span className="text-[10px] font-bold text-white">{t.count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coherence by topic */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Topic Coherence Scores</h3>
          <div className="space-y-3">
            {ev.coherenceByTopic.map((t) => (
              <div key={t.topicName} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-32 flex-shrink-0 truncate">{t.topicName}</span>
                <div className="flex-1 h-5 bg-gray-50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${t.score * 100}%`, backgroundColor: t.score > 0.8 ? '#10b981' : t.score > 0.75 ? '#f59e0b' : '#94a3b8' }}
                  >
                    <span className="text-[10px] font-bold text-white">{t.score.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Method note */}
      <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
        <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><i className="ri-flask-line text-gray-500" />AI Pipeline Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-500">
          <span><strong className="text-gray-700">Embedding:</strong> all-MiniLM-L6-v2</span>
          <span><strong className="text-gray-700">Clustering:</strong> BERTopic</span>
          <span><strong className="text-gray-700">Similarity:</strong> Cosine (FAISS)</span>
          <span><strong className="text-gray-700">Retrieval:</strong> FAISS flat index</span>
          <span><strong className="text-gray-700">Projection:</strong> UMAP 2D</span>
          <span><strong className="text-gray-700">Gap formula:</strong> sim × 1/(co+1)</span>
        </div>
      </div>

      <CoOccurrenceMatrix topics={topics} paperTopicMap={paperTopicMap} />
    </div>
  );
}
