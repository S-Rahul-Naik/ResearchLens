import { useState } from 'react';
import type { RunAllResult } from '../../../../lib/api';

// Unified gap type for display
interface GapPaper { id: string; title: string; authors: string[]; year: number; }
interface DisplayGap {
  id: string; topicAId: string; topicBId: string;
  topicAName: string; topicBName: string;
  topicAKeywords: string[]; topicBKeywords: string[];
  topicAColor: string; topicBColor: string;
  similarityScore: number; coOccurrenceCount: number; gapScore: number;
  papersA: GapPaper[]; papersB: GapPaper[]; papersBridging: GapPaper[];
  explanation: string;
}

const TOPIC_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#3b82f6', '#ec4899', '#10b981', '#f97316'];

function ScoreBar({ value, color, max = 1 }: { value: number; color: string; max?: number }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

function EvidencePanel({ gap, onClose }: { gap: DisplayGap; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl border border-gray-100 w-full max-w-3xl max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Evidence Panel</p>
            <h3 className="text-base font-bold text-gray-900">{gap.topicAName} × {gap.topicBName}</h3>
          </div>
          <button onClick={onClose} className="whitespace-nowrap w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Similarity Score', value: gap.similarityScore.toFixed(2), icon: 'ri-node-tree', color: '#0d9488', bg: 'bg-teal-50' },
              { label: 'Co-occurrence', value: gap.coOccurrenceCount.toString(), icon: 'ri-link', color: '#f59e0b', bg: 'bg-amber-50' },
              { label: 'Gap Score', value: gap.gapScore.toFixed(3), icon: 'ri-radar-line', color: '#e11d48', bg: 'bg-rose-50' },
            ].map(m => (
              <div key={m.label} className={`${m.bg} rounded-xl px-4 py-3 text-center`}>
                <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-white mx-auto mb-2" style={{ color: m.color }}>
                  <i className={`${m.icon} text-sm`} />
                </div>
                <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
                <div className="text-[11px] text-gray-500">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-teal-400">
            <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">Gap Explanation</p>
            <p className="text-xs text-gray-700 leading-relaxed">{gap.explanation}</p>
          </div>

          {/* Two-column topics */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: `Topic A: ${gap.topicAName}`, keywords: gap.topicAKeywords, papers: gap.papersA, color: gap.topicAColor },
              { title: `Topic B: ${gap.topicBName}`, keywords: gap.topicBKeywords, papers: gap.papersB, color: gap.topicBColor },
            ].map(t => (
              <div key={t.title} className="bg-white border border-gray-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <p className="text-xs font-semibold text-gray-800">{t.title}</p>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {t.keywords.map(kw => (
                    <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: `${t.color}15`, color: t.color }}>{kw}</span>
                  ))}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Papers</p>
                {t.papers.map(p => (
                  <div key={p.id} className="text-[11px] text-gray-600 py-0.5 border-b border-gray-50 last:border-0 leading-snug">{p.title}</div>
                ))}
              </div>
            ))}
          </div>

          {/* Bridging papers */}
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <i className="ri-links-line text-teal-600" />
              Bridging Papers
              <span className="text-[10px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">{gap.papersBridging.length}</span>
            </p>
            {gap.papersBridging.length === 0 ? (
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-4 py-2.5 text-xs text-rose-700">
                <i className="ri-error-warning-line mr-1" />
                No paper currently addresses both topics — confirming this gap.
              </div>
            ) : (
              <div className="space-y-1.5">
                {gap.papersBridging.map(p => (
                  <div key={p.id} className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-2.5">
                    <p className="text-xs font-medium text-teal-800">{p.title}</p>
                    <p className="text-[10px] text-teal-600">{p.authors[0]} et al. &middot; {p.year > 0 ? p.year : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GapResultCard({ gap, rank }: { gap: DisplayGap; rank: number }) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const isZeroCo = gap.coOccurrenceCount === 0;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 font-bold text-xs">
            #{rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-bold text-gray-900">{gap.topicAName}</span>
              <div className="w-5 h-5 flex items-center justify-center text-gray-400">
                <i className="ri-close-line text-sm" />
              </div>
              <span className="text-sm font-bold text-gray-900">{gap.topicBName}</span>
              {isZeroCo && (
                <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-200">
                  Zero Co-occurrence
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <div className="text-lg font-bold text-rose-600">{gap.gapScore.toFixed(3)}</div>
            <div className="text-[10px] text-gray-400">gap score</div>
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-500">Similarity</span>
              <span className="text-[11px] font-bold text-teal-700">{gap.similarityScore.toFixed(2)}</span>
            </div>
            <ScoreBar value={gap.similarityScore} color="#0d9488" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-gray-500">Co-occurrence</span>
              <span className="text-[11px] font-bold text-amber-700">{gap.coOccurrenceCount} paper{gap.coOccurrenceCount !== 1 ? 's' : ''}</span>
            </div>
            <ScoreBar value={gap.coOccurrenceCount} color="#f59e0b" max={5} />
          </div>
        </div>

        {/* Insight line */}
        <div className="mb-4 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <i className="ri-lightbulb-line text-amber-500 text-sm flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800 leading-relaxed">
            {isZeroCo
              ? 'Zero co-occurrence despite high similarity — strongest possible research gap.'
              : 'High similarity but low co-occurrence indicates a clear research gap.'}
          </p>
        </div>

        {/* Evidence button */}
        <button
          onClick={() => setEvidenceOpen(true)}
          className="whitespace-nowrap w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <i className="ri-eye-line" />
          View Evidence
        </button>
      </div>

      {evidenceOpen && <EvidencePanel gap={gap} onClose={() => setEvidenceOpen(false)} />}
    </>
  );
}

type GapSortKey = 'gapScore' | 'similarityScore' | 'coOccurrenceCount';
type GapFilter = 'all' | 'zero' | 'high';

const SORT_OPTIONS: { key: GapSortKey; label: string }[] = [
  { key: 'gapScore', label: 'Gap Score' },
  { key: 'similarityScore', label: 'Similarity' },
  { key: 'coOccurrenceCount', label: 'Co-occurrence' },
];

const FILTER_OPTIONS: { key: GapFilter; label: string }[] = [
  { key: 'all', label: 'All Gaps' },
  { key: 'zero', label: 'Zero Co-occ.' },
  { key: 'high', label: 'Score ≥ 0.6' },
];

export default function GapDetectionSection({ backendResult }: { backendResult?: RunAllResult | null }) {
  const [sortKey, setSortKey] = useState<GapSortKey>('gapScore');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [filter, setFilter] = useState<GapFilter>('all');

  // Build DisplayGap[] from backend result
  const allGaps: DisplayGap[] = backendResult
    ? (() => {
        const summaries = backendResult.modules.module1.summaries;
        const topics = backendResult.modules.module2.topics;
        const paperById = (pid: string): GapPaper => {
          const s = summaries.find(su => su.paperId === pid);
          return { id: pid, title: s?.title ?? pid, authors: ['–'], year: 0 };
        };
        return backendResult.modules.module3.gaps.map((g, i) => {
          const topicAEntry = topics.find(t => t.topicId === g.topicA);
          const topicBEntry = topics.find(t => t.topicId === g.topicB);
          const half = Math.ceil(g.evidencePaperIds.length / 2);
          return {
            id: g.gapId,
            topicAId: g.topicA, topicBId: g.topicB,
            topicAName: g.topicALabel, topicBName: g.topicBLabel,
            topicAKeywords: topicAEntry?.keywords ?? [],
            topicBKeywords: topicBEntry?.keywords ?? [],
            topicAColor: TOPIC_COLORS[i * 2 % TOPIC_COLORS.length],
            topicBColor: TOPIC_COLORS[(i * 2 + 1) % TOPIC_COLORS.length],
            similarityScore: g.similarity,
            coOccurrenceCount: g.coOccurrence,
            gapScore: g.gapScore,
            papersA: g.evidencePaperIds.slice(0, half).map(paperById),
            papersB: g.evidencePaperIds.slice(half).map(paperById),
            papersBridging: [],
            explanation: g.recommendation,
          } satisfies DisplayGap;
        });
      })()
    : [];

  const avgScore = allGaps.length > 0
    ? allGaps.reduce((s, g) => s + g.gapScore, 0) / allGaps.length
    : 0;

  const toggleSort = (key: GapSortKey) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const filtered = allGaps.filter(g => {
    if (filter === 'zero') return g.coOccurrenceCount === 0;
    if (filter === 'high') return g.gapScore >= 0.6;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number);
    return sortDir === 'desc' ? -diff : diff;
  });

  return (
    <section id="result-gaps" className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-600 text-white">
          <i className="ri-radar-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 3 · Main Output</p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Gap Detection Results</h2>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400">
          <span>{filtered.length}/{allGaps.length} gaps</span>
          <span className="text-gray-200">|</span>
          <span>Avg score: <strong className="text-rose-600">{avgScore.toFixed(3)}</strong></span>
        </div>
      </div>

      {/* Formula note */}
      <div className="mb-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3">
        <i className="ri-function-line text-gray-400 text-sm" />
        <p className="text-xs text-gray-600">
          Gap formula: <code className="font-mono text-[11px] bg-white border border-gray-200 px-1.5 py-0.5 rounded">gap_score = similarity × (1 / (co_occurrence + 1))</code>
          &nbsp;&mdash; higher score = stronger gap
        </p>
      </div>

      {/* Filter + Sort controls */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${filter === opt.key ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-gray-200" />

        {/* Sort buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-gray-400 font-medium">Sort:</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => toggleSort(opt.key)}
              className={`whitespace-nowrap flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${sortKey === opt.key ? 'bg-rose-50 text-rose-700 border-rose-200' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              {opt.label}
              {sortKey === opt.key && (
                <i className={`ri-arrow-${sortDir === 'desc' ? 'down' : 'up'}-line text-[10px]`} />
              )}
            </button>
          ))}
        </div>

        {filter !== 'all' && (
          <button
            onClick={() => setFilter('all')}
            className="whitespace-nowrap flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer ml-auto"
          >
            <i className="ri-close-circle-line text-xs" />
            Clear filter
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          <i className="ri-radar-line text-3xl text-gray-200 mb-2 block" />
          No gaps match the current filter
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((gap, i) => (
            <GapResultCard key={gap.id} gap={gap} rank={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}
