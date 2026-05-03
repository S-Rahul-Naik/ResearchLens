import { useState } from 'react';
import { mockTopics } from '../../../../mocks/topics';
import { mockPapers } from '../../../../mocks/papers';
import type { RunAllResult } from '../../../../lib/api';

const TOPIC_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#3b82f6', '#ec4899', '#10b981', '#f97316'];

// Normalized topic shape used by this component
interface DisplayTopic {
  id: string; name: string; keywords: string[];
  paperIds: string[]; coherenceScore: number;
  trend: 'rising' | 'stable' | 'declining'; color: string;
  papers: { id: string; title: string; authors: string[]; year: number }[];
}

const TREND_CONFIG = {
  rising: { label: 'Rising', icon: 'ri-arrow-right-up-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  stable: { label: 'Stable', icon: 'ri-arrow-right-line', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  declining: { label: 'Declining', icon: 'ri-arrow-right-down-line', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
};

type TopicSortKey = 'papers' | 'coherence' | 'name';
type PaperCountFilter = 'all' | '3plus' | '5plus';

const SORT_OPTIONS: { key: TopicSortKey; label: string }[] = [
  { key: 'papers', label: 'Papers' },
  { key: 'coherence', label: 'Coherence' },
  { key: 'name', label: 'Name' },
];

const PAPER_FILTER_OPTIONS: { key: PaperCountFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: '3plus', label: '3+ papers' },
  { key: '5plus', label: '5+ papers' },
];

export default function TopicModelingSection({ backendResult }: { backendResult?: RunAllResult | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<TopicSortKey>('papers');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [paperFilter, setPaperFilter] = useState<PaperCountFilter>('all');
  const [trendFilter, setTrendFilter] = useState<'all' | 'rising' | 'stable' | 'declining'>('all');

  // Build DisplayTopic array from backend or mock
  const allTopics: DisplayTopic[] = backendResult
    ? backendResult.modules.module2.topics.map((t, i) => {
        const trendEntry = backendResult.modules.module4.trends.find(tr => tr.topicId === t.topicId);
        const summaries = backendResult.modules.module1.summaries;
        return {
          id: t.topicId, name: t.name, keywords: t.keywords,
          paperIds: t.paperIds, coherenceScore: t.coherence,
          trend: trendEntry?.trend ?? 'stable',
          color: TOPIC_COLORS[i % TOPIC_COLORS.length],
          papers: t.paperIds.map(pid => {
            const s = summaries.find(su => su.paperId === pid);
            return { id: pid, title: s?.title ?? pid, authors: ['–'], year: 0 };
          }),
        };
      })
    : mockTopics.map(t => ({
        ...t, id: t.id, coherenceScore: t.coherenceScore,
        papers: mockPapers.filter(p => t.paperIds.includes(p.id))
          .map(p => ({ id: p.id, title: p.title, authors: p.authors, year: p.year })),
      }));

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const toggleSort = (key: TopicSortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const filtered = allTopics.filter(t => {
    const paperCount = t.papers.length;
    if (paperFilter === '3plus' && paperCount < 3) return false;
    if (paperFilter === '5plus' && paperCount < 5) return false;
    if (trendFilter !== 'all' && t.trend !== trendFilter) return false;
    return true;
  });

  const sortedTopics = [...filtered].sort((a, b) => {
    if (sortKey === 'name') {
      const diff = a.name.localeCompare(b.name);
      return sortDir === 'asc' ? diff : -diff;
    }
    if (sortKey === 'papers') return sortDir === 'desc' ? b.papers.length - a.papers.length : a.papers.length - b.papers.length;
    return sortDir === 'desc'
      ? b.coherenceScore - a.coherenceScore
      : a.coherenceScore - b.coherenceScore;
  });

  return (
    <section id="result-topics" className="mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
          <i className="ri-price-tag-3-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 2</p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Topic Modeling Results</h2>
        </div>
        <div className="ml-auto text-xs text-gray-400 font-medium">
          {filtered.length}/{allTopics.length} topics
        </div>
      </div>

      {/* Filter + Sort bar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        {/* Paper count filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {PAPER_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setPaperFilter(opt.key)}
              className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                paperFilter === opt.key ? 'bg-white text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Trend filter */}
        <div className="flex items-center gap-1">
          {(['all', 'rising', 'stable', 'declining'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTrendFilter(t)}
              className={`whitespace-nowrap px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                trendFilter === t
                  ? t === 'rising'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : t === 'stable'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : t === 'declining'
                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                    : 'bg-slate-900 text-white border-transparent'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {t === 'all' ? 'All Trends' : t.charAt(0).toUpperCase() + t.slice(1)}
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
              className={`whitespace-nowrap flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border transition-colors cursor-pointer ${
                sortKey === opt.key
                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {opt.label}
              {sortKey === opt.key && (
                <i className={`ri-arrow-${sortDir === 'desc' ? 'down' : 'up'}-line text-[10px]`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {sortedTopics.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400">
          <i className="ri-price-tag-3-line text-3xl text-gray-200 mb-2 block" />
          No topics match the current filter
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTopics.map(topic => {
            const papers = topic.papers;
            const isOpen = expandedId === topic.id;
            const trend = TREND_CONFIG[topic.trend];

            return (
              <div key={topic.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => toggle(topic.id)}
                  className="whitespace-nowrap w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: topic.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900">{topic.name}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${trend.bg} ${trend.color} border ${trend.border} flex items-center gap-1`}
                      >
                        <i className={`${trend.icon} text-[10px]`} />
                        {trend.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {topic.keywords.map(kw => (
                        <span key={kw} className="text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-5 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-800">{papers.length}</div>
                      <div className="text-[10px] text-gray-400">papers</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold" style={{ color: topic.color }}>
                        {(topic.coherenceScore * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-gray-400">coherence</div>
                    </div>
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${topic.coherenceScore * 100}%`, backgroundColor: topic.color }}
                      />
                    </div>
                    <div className="w-6 h-6 flex items-center justify-center text-gray-400">
                      <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-sm`} />
                    </div>
                  </div>
                </button>

                {/* Expanded paper list */}
                {isOpen && (
                  <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">
                      All Papers in this Topic
                    </p>
                    <div className="space-y-2">
                      {papers.map(paper => (
                        <div
                          key={paper.id}
                          className="flex items-start gap-3 bg-white rounded-lg border border-gray-100 px-4 py-3"
                        >
                          <div
                            className="w-5 h-5 flex items-center justify-center rounded text-xs font-bold flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: `${topic.color}18`, color: topic.color }}
                          >
                            <i className="ri-file-text-line text-xs" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-800 leading-snug">{paper.title}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              {paper.authors[0]} et al. &middot; {paper.year > 0 ? paper.year : ''}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{paper.year}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
                        All Keywords
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {topic.keywords.map(kw => (
                          <span
                            key={kw}
                            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: `${topic.color}15`, color: topic.color }}
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
