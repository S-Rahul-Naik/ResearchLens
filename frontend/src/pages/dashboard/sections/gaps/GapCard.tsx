import { useRef, useEffect, useState } from 'react';
import { type ResearchGap } from '../../../../mocks/gaps';

function AnimatedBar({ value, max = 1, color }: { value: number; max?: number; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
      <div className="h-full rounded-full" style={{ backgroundColor: color, width: on ? `${Math.min((value / max) * 100, 100)}%` : '0%', transition: on ? 'width 0.8s cubic-bezier(.25,.46,.45,.94)' : 'none' }} />
    </div>
  );
}

function ScoreBadge({ gap }: { gap: ResearchGap }) {
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strength = gap.gapScore >= 0.7 ? 'Strong' : gap.gapScore >= 0.4 ? 'Moderate' : 'Weak';
  const badgeColor = gap.gapScore >= 0.7 ? 'bg-rose-50 text-rose-600 border-rose-200' : gap.gapScore >= 0.4 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200';
  const strengthColor = gap.gapScore >= 0.7 ? 'text-rose-500' : gap.gapScore >= 0.4 ? 'text-amber-500' : 'text-gray-400';
  return (
    <div className="relative" onMouseEnter={() => { clearTimeout(timer.current); setVisible(true); }} onMouseLeave={() => { timer.current = setTimeout(() => setVisible(false), 100); }}>
      <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-bold rounded border cursor-help ${badgeColor}`} onClick={e => e.stopPropagation()}>
        <i className="ri-bar-chart-fill text-[10px]" /> {gap.gapScore.toFixed(3)} <i className="ri-question-line text-[10px] opacity-50" />
      </span>
      {visible && (
        <div className="absolute bottom-full right-0 mb-2 z-50 w-60 bg-gray-900 text-white rounded-xl pointer-events-none" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'fadeInUp .12s ease' }}>
          <div className="p-3.5 space-y-2">
            <div className="flex justify-between"><span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Gap Score</span><span className={`text-xs font-bold ${strengthColor}`}>{strength} Gap</span></div>
            <div className="bg-gray-800 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-teal-300">Multi-factor score: semantic proximity + temporal distance + methodology contrast + task overlap + architecture distance + rarity + co-occurrence scarcity = <strong>{gap.gapScore.toFixed(3)}</strong></div>
            <p className="text-[10px] text-gray-300 leading-relaxed">{gap.gapScore >= 0.7 ? 'Prime unexplored area — strong semantic proximity with a clear methodological bridge and low direct coupling.' : gap.gapScore >= 0.4 ? 'Meaningful research opportunity with moderate evidence and limited bridging work.' : 'Potentially interesting, but the available evidence is weaker or less specific.'}</p>
          </div>
          <div className="absolute -bottom-1.5 right-4 w-3 h-1.5 overflow-hidden"><div className="w-2.5 h-2.5 bg-gray-900 rotate-45 translate-y-1 mx-auto" /></div>
        </div>
      )}
    </div>
  );
}

function insightLine(gap: ResearchGap): string {
  const simLabel = gap.similarityScore >= 0.85 ? 'Very high' : gap.similarityScore >= 0.75 ? 'High' : 'Moderate';
  const coStr = gap.coOccurrenceCount === 0 ? 'zero papers bridge them' : gap.coOccurrenceCount === 1 ? 'only 1 paper bridges them' : `only ${gap.coOccurrenceCount} papers bridge them`;
  return `${simLabel} semantic similarity (${gap.similarityScore.toFixed(2)}) but ${coStr} — a likely under-explored research connection.`;
}

interface Props { gap: ResearchGap; onClick: () => void; selected?: boolean; selectMode?: boolean; }

export default function GapCard({ gap, onClick, selected = false, selectMode = false }: Props) {
  const topicAName = (gap as any).topicAName || (gap as any).topicALabel || (gap as any).topicA || 'Topic A';
  const topicBName = (gap as any).topicBName || (gap as any).topicBLabel || (gap as any).topicB || 'Topic B';
  const topicAPaperCount = (gap as any).topicAPaperCount ?? (gap as any).topicAPaperIds?.length ?? '—';
  const topicBPaperCount = (gap as any).topicBPaperCount ?? (gap as any).topicBPaperIds?.length ?? '—';

  return (
    <div
      className={`bg-white rounded-2xl border overflow-hidden transition-all cursor-pointer group relative ${selected ? 'border-teal-400 ring-2 ring-teal-200' : 'border-gray-100 hover:border-teal-200 hover:shadow-sm'}`}
      onClick={onClick}
    >
      {selectMode && (
        <div className={`absolute top-3.5 left-3.5 z-10 w-5 h-5 flex items-center justify-center rounded-full border-2 transition-all ${selected ? 'bg-teal-600 border-teal-600' : 'bg-white border-gray-300'}`}>
          {selected && <i className="ri-check-line text-white text-[10px]" />}
        </div>
      )}

      <div className={`px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-50 ${selectMode ? 'pl-10' : ''}`}>
        <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Gap #{gap.rank}</span>
        <ScoreBadge gap={gap} />
      </div>

      <div className="px-5 pt-4 pb-3">
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-3">
            <p className="text-xs font-bold text-teal-800 mb-1.5 leading-snug">{topicAName}</p>
            <div className="flex flex-wrap gap-1 mb-2">{(gap as any).topicAKeywords?.slice(0, 3)?.map((kw: string) => <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-teal-100 text-teal-700 rounded-full leading-none">{kw}</span>)}</div>
            <div className="flex items-center gap-1 text-[10px] text-teal-600 font-medium"><i className="ri-file-text-line" />{topicAPaperCount} papers</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500"><i className="ri-arrow-left-right-line text-sm" /></div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">vs</span>
          </div>
          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
            <p className="text-xs font-bold text-amber-800 mb-1.5 leading-snug">{topicBName}</p>
            <div className="flex flex-wrap gap-1 mb-2">{(gap as any).topicBKeywords?.slice(0, 3)?.map((kw: string) => <span key={kw} className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full leading-none">{kw}</span>)}</div>
            <div className="flex items-center gap-1 text-[10px] text-amber-700 font-medium"><i className="ri-file-text-line" />{topicBPaperCount} papers</div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-gray-50 space-y-2.5">
        <div className="grid grid-cols-3 gap-3 text-center mb-1">
          <div className="rounded-lg bg-teal-50 py-2"><div className="text-sm font-bold text-teal-700">{gap.similarityScore.toFixed(2)}</div><div className="text-[9px] text-teal-600 font-medium uppercase tracking-wide mt-0.5">Similarity</div></div>
          <div className="rounded-lg bg-gray-50 py-2"><div className="text-sm font-bold text-gray-700">{gap.coOccurrenceCount}</div><div className="text-[9px] text-gray-500 font-medium uppercase tracking-wide mt-0.5">Co-occur.</div></div>
          <div className="rounded-lg bg-rose-50 py-2"><div className="text-sm font-bold text-rose-600">{gap.gapScore.toFixed(3)}</div><div className="text-[9px] text-rose-500 font-medium uppercase tracking-wide mt-0.5">Gap Score</div></div>
        </div>
        {[{ label: 'Similarity', value: gap.similarityScore, max: 1, color: '#0d9488' }, { label: 'Co-occurrence (scale: 5)', value: gap.coOccurrenceCount, max: 5, color: '#94a3b8' }, { label: 'Gap Score', value: Math.min(gap.gapScore, 1), max: 1, color: '#e11d48' }].map(m => (
          <div key={m.label}><div className="flex justify-between text-[9px] text-gray-400 mb-0.5"><span>{m.label}</span><span className="font-mono">{m.value.toFixed ? m.value.toFixed(m.max === 5 ? 0 : 2) : m.value}</span></div><AnimatedBar value={m.value} max={m.max} color={m.color} /></div>
        ))}
      </div>

      <div className="mx-5 mb-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 flex items-start gap-2">
        <i className="ri-lightbulb-line text-amber-500 flex-shrink-0 text-xs mt-px" />
        <div>
          <p className="text-[11px] text-gray-600 leading-relaxed">{insightLine(gap)}</p>
          {gap.llm_gap_explanation && (
            <p className="text-[11px] text-teal-700 leading-relaxed mt-2 font-medium">{gap.llm_gap_explanation}</p>
          )}
        </div>
      </div>

      <div className="px-5 pb-4">
        <button className="whitespace-nowrap w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold group-hover:bg-teal-700 transition-colors cursor-pointer">
          <i className="ri-search-eye-line" /> {selectMode ? (selected ? 'Selected' : 'Select This Gap') : 'View Evidence'}
        </button>
      </div>
    </div>
  );
}
