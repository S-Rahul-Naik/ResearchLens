import { useState, useMemo } from 'react';
import type { TopicTrend } from '../../../mocks/topics';
import type { RunAllResult, BackendPaper } from '../../../lib/api';

const TOPIC_COLORS = ['#0d9488','#f59e0b','#8b5cf6','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6','#14b8a6','#a855f7'];

interface Annotation { type: 'first-study' | 'bridge'; year: number; label: string; }

function MiniLineChart({ data, color, annotations = [] }: { data: { year: number; count: number }[]; color: string; annotations?: Annotation[] }) {
  const maxCount = Math.max(...data.map(d => d.count));
  const minCount = Math.min(...data.map(d => d.count));
  const range = maxCount - minCount || 1;
  const w = 280; const h = 90; const padX = 24; const padY = 14;

  const points = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * (w - padX * 2),
    y: padY + (1 - (d.count - minCount) / range) * (h - padY * 2 - 10),
    ...d,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillD = `${pathD} L ${points[points.length - 1].x} ${h - 10} L ${points[0].x} ${h - 10} Z`;

  const yearToX = (year: number) => {
    const minY = data[0].year; const maxY = data[data.length - 1].year;
    return padX + ((year - minY) / Math.max(maxY - minY, 1)) * (w - padX * 2);
  };

  const firstStudy = annotations.find(a => a.type === 'first-study');
  const bridges = annotations.filter(a => a.type === 'bridge');

  return (
    <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* First study annotation */}
      {firstStudy && data.some(d => d.year === firstStudy.year) && (() => {
        const x = yearToX(firstStudy.year);
        return (
          <g>
            <line x1={x} y1={padY - 2} x2={x} y2={h - 14} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3,2" opacity="0.7" />
            <rect x={x - 14} y={padY - 11} width={28} height={9} rx={3} fill="#fef3c7" />
            <text x={x} y={padY - 4} textAnchor="middle" fontSize="6" fill="#92400e" fontWeight="700">FIRST</text>
          </g>
        );
      })()}

      {/* Bridge event markers */}
      {bridges.map((b, i) => {
        if (!data.some(d => d.year === b.year)) return null;
        const x = yearToX(b.year);
        return (
          <g key={i}>
            <polygon points={`${x},${h - 18} ${x + 4},${h - 14} ${x},${h - 10} ${x - 4},${h - 14}`} fill="#8b5cf6" opacity="0.85" />
          </g>
        );
      })}

      {points.map(p => <circle key={p.year} cx={p.x} cy={p.y} r={3} fill={color} stroke="white" strokeWidth="1.5" />)}
      {points.map(p => <text key={`y-${p.year}`} x={p.x} y={h - 1} textAnchor="middle" fontSize="8" fill="#9ca3af">{p.year}</text>)}
    </svg>
  );
}

function TrendCard({ trend, allPapers, allGapTopicAIds, allGapTopicBIds, gapEvidencePaperIds }: {
  trend: TopicTrend;
  allPapers: { id: string; year: number }[];
  allGapTopicAIds: string[];
  allGapTopicBIds: string[];
  gapEvidencePaperIds: string[];
}) {
  const trendStyle = {
    rising: { bg: 'from-green-50 to-white', badge: 'bg-green-100 text-green-700', icon: 'ri-arrow-up-line', label: 'Rising' },
    stable: { bg: 'from-gray-50 to-white', badge: 'bg-gray-100 text-gray-600', icon: 'ri-arrow-right-line', label: 'Stable' },
    declining: { bg: 'from-rose-50 to-white', badge: 'bg-rose-100 text-rose-600', icon: 'ri-arrow-down-line', label: 'Declining' },
    insufficient_data: { bg: 'from-slate-50 to-white', badge: 'bg-slate-100 text-slate-600', icon: 'ri-alert-line', label: 'Insufficient Data' },
  }[trend.trend];

  const latest = trend.dataPoints[trend.dataPoints.length - 1].count;
  const prev = trend.dataPoints[trend.dataPoints.length - 2]?.count ?? latest;
  const yoyChange = prev > 0 ? (((latest - prev) / prev) * 100).toFixed(0) : '0';

  // Compute annotations using passed data
  const topicPapers = allPapers.filter(p => /* bridging check */ gapEvidencePaperIds.includes(p.id) &&
    (allGapTopicAIds.includes(trend.topicId) || allGapTopicBIds.includes(trend.topicId))
  );
  const firstStudyYear = allPapers.length > 0 ? Math.min(...allPapers.map(p => p.year)) : null;
  const isRelatedGap = allGapTopicAIds.includes(trend.topicId) || allGapTopicBIds.includes(trend.topicId);
  const bridgeYears = isRelatedGap ? topicPapers.map(p => p.year) : [];

  const annotations: { type: 'first-study' | 'bridge'; year: number; label: string }[] = [
    ...(firstStudyYear ? [{ type: 'first-study' as const, year: firstStudyYear, label: `First study: ${firstStudyYear}` }] : []),
    ...bridgeYears.map(y => ({ type: 'bridge' as const, year: y, label: '' })),
  ];

  const uniqueBridgeYears = [...new Set(bridgeYears)];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className={`bg-gradient-to-b ${trendStyle.bg} px-5 pt-5 pb-3`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900">{trend.topicName}</h3>
          <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${trendStyle.badge}`}>
            <i className={trendStyle.icon} />{trendStyle.label}
          </span>
        </div>
        {trend.trend === 'insufficient_data' && trend.trendMessage && (
          <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 leading-relaxed">
            {trend.trendMessage}
            {(trend.temporalConfidence != null || trend.reliability != null) && (
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-500">
                {trend.temporalConfidence != null && <span>Temporal confidence: {(trend.temporalConfidence * 100).toFixed(0)}%</span>}
                {trend.reliability != null && <span>Reliability: {(trend.reliability * 100).toFixed(0)}%</span>}
              </div>
            )}
          </div>
        )}
        <MiniLineChart data={trend.dataPoints} color={trend.color} annotations={annotations} />
        {/* Annotation legend */}
        {annotations.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mt-2">
            {firstStudyYear && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-700">
                <div className="w-4 h-px border-t-2 border-dashed border-amber-400" />
                First study: {firstStudyYear}
              </div>
            )}
            {uniqueBridgeYears.length > 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-violet-600">
                <svg width="10" height="10" viewBox="0 0 10 10"><polygon points="5,0 9,5 5,10 1,5" fill="#8b5cf6" /></svg>
                Bridge paper{uniqueBridgeYears.length > 1 ? 's' : ''}: {uniqueBridgeYears.join(', ')}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
        <div><div className="text-sm font-bold text-gray-800">{trend.peakYear}</div><div className="text-[10px] text-gray-400">Peak year</div></div>
        <div>
          <div className={`text-sm font-bold ${parseInt(yoyChange) >= 0 ? 'text-green-600' : 'text-rose-500'}`}>{parseInt(yoyChange) >= 0 ? '+' : ''}{yoyChange}%</div>
          <div className="text-[10px] text-gray-400">YoY change</div>
        </div>
      </div>
    </div>
  );
}

export default function TrendsSection({ backendResult, papers: propPapers = [] }: { backendResult?: RunAllResult | null; papers?: BackendPaper[] }) {
  const trends: TopicTrend[] = useMemo(() => {
    const raw = backendResult?.modules.module4.trends;
    if (raw && raw.length > 0) {
      return raw.map((t, i) => {
        const sorted = [...t.yearlyCounts].sort((a, b) => a.year - b.year);
        const peak = sorted.reduce((best, y) => y.count > best.count ? y : best, sorted[0] ?? { year: 0, count: 0 });
        return { topicId: t.topicId, topicName: t.topicName, trend: t.trend, growthRate: t.slope, peakYear: peak.year, dataPoints: sorted, color: TOPIC_COLORS[i % TOPIC_COLORS.length] };
      });
    }
    return [];
  }, [backendResult]);

  const allPapers = useMemo(() => propPapers, [propPapers]);
  const allGapTopicAIds = useMemo(() => backendResult?.modules.module3.gaps.map(g => g.topicA) ?? [], [backendResult]);
  const allGapTopicBIds = useMemo(() => backendResult?.modules.module3.gaps.map(g => g.topicB) ?? [], [backendResult]);
  const gapEvidencePaperIds = useMemo(() => backendResult?.modules.module3.gaps.flatMap(g => g.evidencePaperIds) ?? [], [backendResult]);

  const [filter, setFilter] = useState<'all' | 'rising' | 'stable' | 'declining' | 'insufficient_data'>('all');
  const filtered = filter === 'all' ? trends : trends.filter(t => t.trend === filter);
  const counts = {
    rising: trends.filter(t => t.trend === 'rising').length,
    stable: trends.filter(t => t.trend === 'stable').length,
    declining: trends.filter(t => t.trend === 'declining').length,
    insufficient_data: trends.filter(t => t.trend === 'insufficient_data').length,
  };

  return (
    <div className="p-8">
      <div className="flex flex-wrap gap-2 mb-6">
        {([['all', 'All Topics', trends.length], ['rising', 'Rising', counts.rising], ['stable', 'Stable', counts.stable], ['declining', 'Declining', counts.declining], ['insufficient_data', 'Insufficient', counts.insufficient_data]] as const).map(([val, label, count]) => (
          <button key={val} onClick={() => setFilter(val)} className={`whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${filter === val ? 'bg-[#0f766e] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${filter === val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
          </button>
        ))}
      </div>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
        <i className="ri-information-line text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 leading-relaxed space-y-1">
          <p><strong>Trend labels</strong> are derived from year-over-year growth rates. Rising = &gt;20% annual growth, Declining = &lt;−10%, Stable = in between.</p>
          <p className="flex flex-wrap items-center gap-3 mt-1">
            <span className="flex items-center gap-1.5"><span className="inline-block w-5 h-0 border-t-2 border-dashed border-amber-500" /> Dashed amber line = first study year in dataset</span>
            <span className="flex items-center gap-1.5"><svg width="9" height="9" viewBox="0 0 10 10"><polygon points="5,0 9,5 5,10 1,5" fill="#8b5cf6" /></svg> Purple diamond = bridging paper published (gap event)</span>
            <span className="flex items-center gap-1.5"><i className="ri-alert-line text-slate-500" /> Grey badge = insufficient temporal evidence</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filtered.map(trend => <TrendCard key={trend.topicId} trend={trend} allPapers={allPapers} allGapTopicAIds={allGapTopicAIds} allGapTopicBIds={allGapTopicBIds} gapEvidencePaperIds={gapEvidencePaperIds} />)}
      </div>
    </div>
  );
}
