import type { ResearchGap } from '../../../../mocks/gaps';

interface Props {
  gapA: ResearchGap;
  gapB: ResearchGap;
  onClose: () => void;
}

function MetricBar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono font-semibold w-10 text-right" style={{ color }}>
        {value.toFixed(2)}
      </span>
    </div>
  );
}

function GapPane({ gap, side }: { gap: ResearchGap; side: 'A' | 'B' }) {
  const topicAName = gap.topicAName || gap.topicAId || 'Topic A';
  const topicBName = gap.topicBName || gap.topicBId || 'Topic B';
  const papersInA = gap.paperIdsInA ?? [];
  const papersInB = gap.paperIdsInB ?? [];
  const bridging = gap.paperIdsBridging ?? [];

  const accent = side === 'A' ? '#0d9488' : '#f59e0b';
  const accentLight = side === 'A' ? 'bg-teal-50 text-teal-700 border-teal-100' : 'bg-amber-50 text-amber-700 border-amber-100';

  return (
    <div className="flex-1 min-w-0 flex flex-col gap-4">
      {/* Header */}
      <div className={`rounded-xl border p-4 ${accentLight}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">Gap {side}</span>
          <span className="text-[10px] font-semibold bg-white/60 px-1.5 py-0.5 rounded-full">Rank #{gap.rank}</span>
        </div>
        <h3 className="text-sm font-bold leading-tight">{gap.topicAName} × {gap.topicBName}</h3>
      </div>

      {/* Metrics */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Key Metrics</p>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-600">Similarity Score</span>
          </div>
          <MetricBar value={gap.similarityScore} color={accent} />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-600">Gap Score</span>
          </div>
          <MetricBar value={gap.gapScore} color={accent} />
        </div>
        <div className="flex items-center justify-between py-2 border-t border-gray-200 mt-1">
          <span className="text-xs text-gray-600">Co-occurrences</span>
          <span className={`text-sm font-bold ${gap.coOccurrenceCount === 0 ? 'text-rose-500' : 'text-gray-700'}`}>
            {gap.coOccurrenceCount} {gap.coOccurrenceCount === 0 && <span className="text-[10px] font-normal text-rose-400">zero</span>}
          </span>
        </div>
      </div>

      {/* Topics */}
      <div className="space-y-2">
        {[
          { id: gap.topicAId, name: topicAName, kws: gap.topicAKeywords },
          { id: gap.topicBId, name: topicBName, kws: gap.topicBKeywords },
        ].map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-100 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
              <span className="text-xs font-semibold text-gray-800 truncate">{item.name}</span>
              <span className="ml-auto text-[10px] text-gray-400 flex-shrink-0">{(item.kws ? (item.kws.length) : 0)} keywords</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {item.kws.slice(0, 4).map(kw => (
                <span key={kw} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full">{kw}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Evidence */}
      <div className="rounded-xl border border-gray-100 p-3 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Evidence</p>
        <div>
          <p className="text-[10px] font-medium text-gray-500 mb-1">Papers in {gap.topicAName} <span className="font-bold text-teal-600">({papersInA.length})</span></p>
          {papersInA.length === 0 ? <p className="text-[10px] text-rose-400 italic">None in dataset</p> : <ul className="space-y-0.5">{papersInA.slice(0,3).map(id => <li key={id} className="text-[10px] text-gray-600">{id}</li>)}{papersInA.length>3 && <li className="text-[10px] text-gray-400">+{papersInA.length-3} more</li>}</ul>}

          <p className="text-[10px] font-medium text-gray-500 mt-3 mb-1">Papers in {gap.topicBName} <span className="font-bold text-amber-600">({papersInB.length})</span></p>
          {papersInB.length === 0 ? <p className="text-[10px] text-rose-400 italic">None in dataset</p> : <ul className="space-y-0.5">{papersInB.slice(0,3).map(id => <li key={id} className="text-[10px] text-gray-600">{id}</li>)}{papersInB.length>3 && <li className="text-[10px] text-gray-400">+{papersInB.length-3} more</li>}</ul>}

          <p className="text-[10px] font-medium text-gray-500 mt-3 mb-1">Bridging Papers <span className={`${bridging.length===0 ? 'font-bold text-rose-500' : 'font-bold text-green-600'}`}>({bridging.length})</span></p>
          {bridging.length === 0 ? <p className="text-[10px] text-rose-400 italic">None in dataset</p> : <ul className="space-y-0.5">{bridging.slice(0,3).map(id => <li key={id} className="text-[10px] text-gray-600">{id}</li>)}{bridging.length>3 && <li className="text-[10px] text-gray-400">+{bridging.length-3} more</li>}</ul>}
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl bg-gray-50 p-3 border border-gray-100">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Why This Gap Exists</p>
        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-4">{gap.explanation}</p>
      </div>
    </div>
  );
}

export default function GapCompareModal({ gapA, gapB, onClose }: Props) {
  const winner = (field: 'gapScore' | 'similarityScore') => {
    if (gapA[field] > gapB[field]) return 'A';
    if (gapB[field] > gapA[field]) return 'B';
    return 'tie';
  };

  const metrics: { label: string; aVal: number | string; bVal: number | string; field?: 'gapScore' | 'similarityScore' }[] = [
    { label: 'Gap Score', aVal: gapA.gapScore.toFixed(3), bVal: gapB.gapScore.toFixed(3), field: 'gapScore' },
    { label: 'Similarity', aVal: gapA.similarityScore.toFixed(2), bVal: gapB.similarityScore.toFixed(2), field: 'similarityScore' },
    { label: 'Co-occurrences', aVal: gapA.coOccurrenceCount, bVal: gapB.coOccurrenceCount },
    { label: 'Rank', aVal: `#${gapA.rank}`, bVal: `#${gapB.rank}` },
    { label: 'Bridging Papers', aVal: gapA.paperIdsBridging.length, bVal: gapB.paperIdsBridging.length },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div
        className="fixed inset-x-4 top-6 bottom-6 z-50 bg-white rounded-2xl flex flex-col overflow-hidden max-w-5xl mx-auto"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <i className="ri-layout-column-line text-base" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Gap Comparison</h2>
              <p className="text-xs text-gray-400">Side-by-side analysis of two research gaps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>

        {/* Quick Compare Strip */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="grid grid-cols-5 gap-0">
            {metrics.map(m => {
              const w = m.field ? winner(m.field) : 'tie';
              return (
                <div key={m.label} className="text-center px-3 py-2 first:rounded-l-xl last:rounded-r-xl">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{m.label}</p>
                  <div className="flex items-center justify-center gap-2">
                    <span className={`text-xs font-bold ${w === 'A' ? 'text-teal-600' : 'text-gray-500'}`}>{m.aVal}</span>
                    <span className="text-[10px] text-gray-300">vs</span>
                    <span className={`text-xs font-bold ${w === 'B' ? 'text-amber-600' : 'text-gray-500'}`}>{m.bVal}</span>
                  </div>
                  {w !== 'tie' && (
                    <div className={`text-[9px] font-semibold mt-0.5 ${w === 'A' ? 'text-teal-500' : 'text-amber-500'}`}>
                      Gap {w} higher
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Side-by-side body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex gap-5">
          <GapPane gap={gapA} side="A" />

          {/* Divider */}
          <div className="flex flex-col items-center flex-shrink-0 pt-2 gap-2">
            <div className="w-px bg-gray-200 flex-1" />
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
              <i className="ri-arrow-left-right-line text-xs" />
            </div>
            <div className="w-px bg-gray-200 flex-1" />
          </div>

          <GapPane gap={gapB} side="B" />
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-gray-400">Higher Gap Score = stronger research opportunity. Lower Co-occurrence = less explored.</p>
          <button
            onClick={onClose}
            className="whitespace-nowrap px-4 py-2 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </>
  );
}
