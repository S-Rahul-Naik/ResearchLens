import { useState, useMemo } from 'react';
import { mockTopics, type Topic } from '../../../mocks/topics';
import { mockPapers, type Paper } from '../../../mocks/papers';
import { mockTrends, type TopicTrend } from '../../../mocks/trends';
import type { RunAllResult, BackendPaper } from '../../../lib/api';

const TOPIC_COLORS = ['#0d9488','#f59e0b','#8b5cf6','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6','#14b8a6','#a855f7'];

/* ── Highlight helper ─────────────────────────────────────────────────── */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 not-italic">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/* ── Topic Detail Modal ───────────────────────────────────────────────── */
function TopicDetailModal({ topic, onClose, searchQuery, allPapers }: { topic: Topic; onClose: () => void; searchQuery: string; allPapers: Paper[] }) {
  const papers = allPapers.filter((p) => topic.paperIds.includes(p.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div
          className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0"
          style={{ borderTopColor: topic.color, borderTopWidth: 4, borderRadius: '16px 16px 0 0' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg font-bold text-gray-900">{topic.name}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${topic.trend === 'rising' ? 'bg-green-100 text-green-700' : topic.trend === 'declining' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                {topic.trend === 'rising' ? '↑ Rising' : topic.trend === 'declining' ? '↓ Declining' : '→ Stable'}
              </span>
            </div>
            <p className="text-xs text-gray-400">{papers.length} papers · Coherence: {topic.coherenceScore.toFixed(2)}</p>
          </div>
          <button onClick={onClose} className="whitespace-nowrap w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
            <i className="ri-close-line text-gray-600" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-50">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Keywords</h4>
            <div className="flex flex-wrap gap-2">
              {topic.keywords.map((kw) => (
                <span key={kw} className="px-2.5 py-1 text-xs rounded-full border" style={{ color: topic.color, borderColor: topic.color + '40', backgroundColor: topic.color + '10' }}>
                  <Highlight text={kw} query={searchQuery} />
                </span>
              ))}
            </div>
          </div>
          <div className="px-6 py-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Papers in this topic</h4>
            <div className="space-y-3">
              {papers.map((p) => (
                <div key={p.id} className="flex gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: topic.color + '15', color: topic.color }}>
                    <i className="ri-file-text-line text-sm" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 leading-snug"><Highlight text={p.title} query={searchQuery} /></p>
                    <p className="text-xs text-gray-400 mt-1">{p.authors.slice(0, 2).join(', ')} · {p.year}</p>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">{p.abstract}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Compare Modal ────────────────────────────────────────────────────── */
function CompareModal({ topicA, topicB, onClose, allPapers, allTrends }: { topicA: Topic; topicB: Topic; onClose: () => void; allPapers: Paper[]; allTrends: TopicTrend[] }) {
  const papersA = allPapers.filter(p => topicA.paperIds.includes(p.id));
  const papersB = allPapers.filter(p => topicB.paperIds.includes(p.id));
  const sharedPaperIds = topicA.paperIds.filter(id => topicB.paperIds.includes(id));
  const sharedPapers = allPapers.filter(p => sharedPaperIds.includes(p.id));

  const sharedKeywords = topicA.keywords.filter(kw => topicB.keywords.some(k => k.toLowerCase() === kw.toLowerCase()));
  const onlyA = topicA.keywords.filter(kw => !topicB.keywords.some(k => k.toLowerCase() === kw.toLowerCase()));
  const onlyB = topicB.keywords.filter(kw => !topicA.keywords.some(k => k.toLowerCase() === kw.toLowerCase()));

  const trendA = allTrends.find(t => t.topicId === topicA.id);
  const trendB = allTrends.find(t => t.topicId === topicB.id);

  const allYears = useMemo(() => {
    const years = new Set<number>();
    trendA?.dataPoints.forEach(d => years.add(d.year));
    trendB?.dataPoints.forEach(d => years.add(d.year));
    return Array.from(years).sort();
  }, [trendA, trendB]);

  const maxCount = useMemo(() => {
    const vals: number[] = [];
    trendA?.dataPoints.forEach(d => vals.push(d.count));
    trendB?.dataPoints.forEach(d => vals.push(d.count));
    return Math.max(...vals, 1);
  }, [trendA, trendB]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600">
              <i className="ri-git-merge-line text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Topic Comparison</h3>
              <p className="text-xs text-gray-400">{topicA.name} vs {topicB.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="whitespace-nowrap w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer">
            <i className="ri-close-line text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Side-by-side header cards */}
          <div className="grid grid-cols-2 gap-4">
            {[topicA, topicB].map(topic => {
              const papers = allPapers.filter(p => topic.paperIds.includes(p.id));
              return (
                <div key={topic.id} className="rounded-2xl border-2 p-4" style={{ borderColor: topic.color + '50', backgroundColor: topic.color + '08' }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: topic.color }} />
                    <h4 className="font-bold text-gray-800 text-sm">{topic.name}</h4>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">{papers.length} papers</span>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">{topic.keywords.length} keywords</span>
                    <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-gray-600">Coherence {topic.coherenceScore.toFixed(2)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${topic.trend === 'rising' ? 'bg-emerald-100 text-emerald-700' : topic.trend === 'declining' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-600'}`}>
                      {topic.trend === 'rising' ? '↑' : topic.trend === 'declining' ? '↓' : '→'} {topic.trend}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overlap stats bar */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Overlap Summary</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              {[
                { label: 'Shared Keywords', val: sharedKeywords.length, total: Math.max(topicA.keywords.length, topicB.keywords.length), color: 'text-amber-600 bg-amber-50' },
                { label: 'Shared Papers', val: sharedPapers.length, total: Math.max(papersA.length, papersB.length), color: 'text-teal-600 bg-teal-50' },
                { label: 'Keyword Overlap', val: `${Math.round((sharedKeywords.length / Math.max(topicA.keywords.length, topicB.keywords.length)) * 100)}%`, total: null, color: 'text-violet-600 bg-violet-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl px-4 py-3 ${s.color}`}>
                  <div className="text-2xl font-bold">{s.val}</div>
                  <div className="text-[10px] font-medium mt-0.5 opacity-80">{s.label}</div>
                  {s.total !== null && <div className="text-[9px] opacity-60 mt-0.5">of {s.total}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Keyword comparison */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Keyword Distribution</h4>
            <div className="grid grid-cols-3 gap-3">
              {/* Only A */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold mb-2" style={{ color: topicA.color }}>Only in {topicA.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {onlyA.map(kw => (
                    <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: topicA.color + '15', color: topicA.color }}>{kw}</span>
                  ))}
                </div>
              </div>
              {/* Shared */}
              <div className="bg-amber-50 rounded-xl border border-amber-100 p-3">
                <p className="text-[10px] font-bold text-amber-700 mb-2">Shared Keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {sharedKeywords.length > 0 ? sharedKeywords.map(kw => (
                    <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold">{kw}</span>
                  )) : (
                    <p className="text-[10px] text-amber-400 italic">No shared keywords</p>
                  )}
                </div>
              </div>
              {/* Only B */}
              <div className="bg-white rounded-xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold mb-2" style={{ color: topicB.color }}>Only in {topicB.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {onlyB.map(kw => (
                    <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: topicB.color + '15', color: topicB.color }}>{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Year trend comparison */}
          {trendA && trendB && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Publication Trends (per year)</h4>
              <div className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-end gap-2 h-36">
                  {allYears.map(year => {
                    const valA = trendA.dataPoints.find(d => d.year === year)?.count ?? 0;
                    const valB = trendB.dataPoints.find(d => d.year === year)?.count ?? 0;
                    const hA = Math.round((valA / maxCount) * 112);
                    const hB = Math.round((valB / maxCount) * 112);
                    return (
                      <div key={year} className="flex-1 flex flex-col items-center gap-1">
                        <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: 112 }}>
                          <div className="flex-1 rounded-t-md transition-all" style={{ height: hA, backgroundColor: topicA.color, opacity: 0.85, minHeight: valA > 0 ? 4 : 0 }} title={`${topicA.name}: ${valA}`} />
                          <div className="flex-1 rounded-t-md transition-all" style={{ height: hB, backgroundColor: topicB.color, opacity: 0.85, minHeight: valB > 0 ? 4 : 0 }} title={`${topicB.name}: ${valB}`} />
                        </div>
                        <span className="text-[9px] text-gray-400">{year}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-5 mt-3 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: topicA.color }} />
                    <span className="text-[10px] text-gray-600">{topicA.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: topicB.color }} />
                    <span className="text-[10px] text-gray-600">{topicB.name}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Shared papers */}
          {sharedPapers.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Papers in Both Topics <span className="text-gray-400 font-normal">({sharedPapers.length})</span>
              </h4>
              <div className="space-y-2">
                {sharedPapers.map(p => (
                  <div key={p.id} className="flex gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600 flex-shrink-0 mt-0.5">
                      <i className="ri-file-text-line text-sm" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{p.authors.slice(0, 2).join(', ')} · {p.year}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Side-by-side unique papers */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { topic: topicA, papers: papersA.filter(p => !sharedPaperIds.includes(p.id)) },
              { topic: topicB, papers: papersB.filter(p => !sharedPaperIds.includes(p.id)) },
            ].map(({ topic, papers }) => (
              <div key={topic.id}>
                <h4 className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: topic.color }}>
                  Only in {topic.name} ({papers.length})
                </h4>
                <div className="space-y-1.5">
                  {papers.length === 0 ? (
                    <p className="text-[10px] text-gray-400 italic">All papers are shared.</p>
                  ) : papers.map(p => (
                    <div key={p.id} className="p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                      <p className="text-[11px] font-medium text-gray-700 leading-snug">{p.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{p.year}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ── Main Section ─────────────────────────────────────────────────────── */
export default function TopicsSection({ backendResult, papers: propPapers = [] }: { backendResult?: RunAllResult | null; papers?: BackendPaper[] }) {
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [compareTopics, setCompareTopics] = useState<[Topic, Topic] | null>(null);

  const topics: Topic[] = useMemo(() => {
    const raw = backendResult?.modules.module2.topics;
    if (raw && raw.length > 0) {
      return raw.map((t, i) => ({ id: t.topicId, name: t.name, keywords: t.keywords, paperIds: t.paperIds, coherenceScore: t.coherence, trend: 'stable' as const, color: TOPIC_COLORS[i % TOPIC_COLORS.length] }));
    }
    return mockTopics;
  }, [backendResult]);

  const allPapers: Paper[] = useMemo(() => {
    if (propPapers.length > 0) return propPapers.map(p => ({ ...p, topics: [], keywords: [], status: 'processed' as const, uploadDate: '' }));
    return mockPapers;
  }, [propPapers]);

  const allTrends: TopicTrend[] = useMemo(() => {
    const raw = backendResult?.modules.module4.trends;
    if (raw && raw.length > 0) {
      return raw.map((t, i) => {
        const sorted = [...t.yearlyCounts].sort((a, b) => a.year - b.year);
        const peak = sorted.reduce((best, y) => y.count > best.count ? y : best, sorted[0] ?? { year: 0, count: 0 });
        return { topicId: t.topicId, topicName: t.topicName, trend: t.trend, growthRate: t.slope, peakYear: peak.year, dataPoints: sorted, color: TOPIC_COLORS[i % TOPIC_COLORS.length] };
      });
    }
    return mockTrends;
  }, [backendResult]);

  /* ── Filtering logic ──────────────────────────────── */
  const filteredTopics = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return topics;
    return topics.filter(topic => {
      if (topic.name.toLowerCase().includes(q)) return true;
      if (topic.keywords.some(kw => kw.toLowerCase().includes(q))) return true;
      const papers = allPapers.filter(p => topic.paperIds.includes(p.id));
      if (papers.some(p => p.title.toLowerCase().includes(q) || p.authors.some(a => a.toLowerCase().includes(q)))) return true;
      return false;
    });
  }, [searchQuery, topics, allPapers]);

  function getMatchCounts(topic: Topic) {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const papers = allPapers.filter(p => topic.paperIds.includes(p.id));
    const kwMatches = topic.keywords.filter(kw => kw.toLowerCase().includes(q)).length;
    const paperMatches = papers.filter(p => p.title.toLowerCase().includes(q)).length;
    return { kwMatches, paperMatches };
  }

  function toggleCompareSelect(id: string) {
    setSelectedForCompare(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  function startCompare() {
    if (selectedForCompare.length !== 2) return;
    const [a, b] = selectedForCompare;
    const topicA = topics.find(t => t.id === a);
    const topicB = topics.find(t => t.id === b);
    if (topicA && topicB) setCompareTopics([topicA, topicB]);
  }

  function exitCompareMode() {
    setCompareMode(false);
    setSelectedForCompare([]);
    setCompareTopics(null);
  }

  const hasQuery = searchQuery.trim().length > 0;

  return (
    <div className="p-8">
      {/* Toolbar row */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search bar */}
        {!compareMode && (
          <div className="relative flex-1 max-w-lg">
            <div className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-gray-400">
              <i className="ri-search-line text-sm" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search topics, keywords, or paper titles…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-teal-400 bg-white transition-colors"
            />
            {hasQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="whitespace-nowrap absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 text-gray-500 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-xs" />
              </button>
            )}
          </div>
        )}

        {/* Compare mode banner */}
        {compareMode && (
          <div className="flex-1 flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5">
            <i className="ri-git-merge-line text-violet-500 text-sm" />
            <span className="text-sm font-semibold text-violet-800">Compare Mode</span>
            <span className="text-xs text-violet-500">
              {selectedForCompare.length === 0 && 'Click two topics to compare them'}
              {selectedForCompare.length === 1 && 'Select one more topic'}
              {selectedForCompare.length === 2 && 'Both topics selected — ready to compare!'}
            </span>
            {selectedForCompare.length > 0 && (
              <button
                onClick={() => setSelectedForCompare([])}
                className="whitespace-nowrap text-[10px] text-violet-500 hover:text-violet-700 underline cursor-pointer ml-1"
              >
                Clear selection
              </button>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {hasQuery && !compareMode && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-semibold text-teal-700">{filteredTopics.length}</span>
              <span>of {topics.length} match</span>
            </div>
          )}
          {compareMode && selectedForCompare.length === 2 && (
            <button
              onClick={startCompare}
              className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors cursor-pointer"
            >
              <i className="ri-eye-line text-sm" />
              View Comparison
            </button>
          )}
          <button
            onClick={() => compareMode ? exitCompareMode() : setCompareMode(true)}
            className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer ${compareMode ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-white border border-gray-200 text-gray-600 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200'}`}
          >
            <i className={`${compareMode ? 'ri-close-line' : 'ri-git-merge-line'} text-sm`} />
            {compareMode ? 'Exit Compare' : 'Compare Topics'}
          </button>
        </div>
      </div>

      {hasQuery && !compareMode && filteredTopics.length === 0 && (
        <div className="mt-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 text-center mb-6">
          <i className="ri-search-line text-2xl text-gray-300 block mb-2" />
          <p className="text-sm text-gray-500">No topics match &ldquo;<strong>{searchQuery}</strong>&rdquo;</p>
          <button onClick={() => setSearchQuery('')} className="whitespace-nowrap mt-2 text-xs text-teal-600 hover:underline cursor-pointer">Clear search</button>
        </div>
      )}

      {/* Topic Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {(compareMode ? topics : filteredTopics).map((topic) => {
          const papers = allPapers.filter((p) => topic.paperIds.includes(p.id));
          const matchCounts = getMatchCounts(topic);
          const hasKwMatch = matchCounts && matchCounts.kwMatches > 0;
          const hasPaperMatch = matchCounts && matchCounts.paperMatches > 0;
          const isSelectedCompare = selectedForCompare.includes(topic.id);
          const isDisabledCompare = compareMode && selectedForCompare.length === 2 && !isSelectedCompare;

          return (
            <div
              key={topic.id}
              onClick={() => {
                if (compareMode) { toggleCompareSelect(topic.id); return; }
                setActiveTopic(topic);
              }}
              className={`bg-white rounded-2xl border overflow-hidden transition-all cursor-pointer relative
                ${compareMode && isSelectedCompare ? 'border-violet-400 ring-2 ring-violet-200' : ''}
                ${compareMode && !isSelectedCompare && !isDisabledCompare ? 'hover:border-violet-300 border-gray-100' : ''}
                ${compareMode && isDisabledCompare ? 'opacity-40 cursor-not-allowed' : ''}
                ${!compareMode && hasQuery ? 'border-amber-200 ring-1 ring-amber-100' : ''}
                ${!compareMode && !hasQuery ? 'border-gray-100 hover:border-gray-200' : ''}
              `}
            >
              {/* Compare selection indicator */}
              {compareMode && (
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-all ${isSelectedCompare ? 'border-violet-500 bg-violet-500 text-white' : 'border-gray-300 bg-white'}`}>
                  {isSelectedCompare && <i className="ri-check-line text-xs" />}
                </div>
              )}

              {/* Visual Header */}
              <div className="h-24 flex items-center justify-center relative" style={{ backgroundColor: topic.color + '15' }}>
                <div className="absolute top-3 left-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded" style={{ backgroundColor: topic.color + '25', color: topic.color }}>
                    {topic.id.toUpperCase()}
                  </span>
                </div>
                <div className={`absolute top-3 flex items-center gap-1 ${compareMode ? 'right-10' : 'right-3'}`}>
                  {!compareMode && hasQuery && (hasKwMatch || hasPaperMatch) && (
                    <span className="text-[9px] font-bold bg-amber-400 text-white px-1.5 py-0.5 rounded-full">
                      <i className="ri-search-line mr-0.5" />match
                    </span>
                  )}
                  <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: topic.color }}>
                    {papers.length}
                  </span>
                </div>
                <i className="ri-price-tag-3-line text-4xl" style={{ color: topic.color + '60' }} />
              </div>

              {/* Body */}
              <div className="p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  {compareMode ? topic.name : <Highlight text={topic.name} query={searchQuery} />}
                </h3>
                <div className="flex flex-wrap gap-1 mb-3">
                  {topic.keywords.map((kw) => (
                    <span
                      key={kw}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${!compareMode && hasQuery && kw.toLowerCase().includes(searchQuery.toLowerCase()) ? 'bg-amber-100 text-amber-800 font-semibold' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {compareMode ? kw : <Highlight text={kw} query={searchQuery} />}
                    </span>
                  ))}
                </div>
                {!compareMode && hasQuery && matchCounts && (matchCounts.kwMatches > 0 || matchCounts.paperMatches > 0) && (
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {matchCounts.kwMatches > 0 && <span className="text-[9px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">{matchCounts.kwMatches} keyword{matchCounts.kwMatches > 1 ? 's' : ''}</span>}
                    {matchCounts.paperMatches > 0 && <span className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded-full">{matchCounts.paperMatches} paper{matchCounts.paperMatches > 1 ? 's' : ''}</span>}
                  </div>
                )}
                {compareMode && isSelectedCompare && (
                  <div className="mt-1">
                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-semibold">
                      Selected #{selectedForCompare.indexOf(topic.id) + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="px-4 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><i className="ri-file-text-line" />{papers.length} papers</span>
                  <span className="flex items-center gap-1"><i className="ri-bar-chart-line" />{topic.coherenceScore.toFixed(2)}</span>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${topic.trend === 'rising' ? 'bg-green-100 text-green-700' : topic.trend === 'declining' ? 'bg-rose-100 text-rose-700' : 'bg-gray-100 text-gray-500'}`}>
                  {topic.trend === 'rising' ? '↑' : topic.trend === 'declining' ? '↓' : '→'} {topic.trend}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {activeTopic && !compareMode && (
        <TopicDetailModal topic={activeTopic} onClose={() => setActiveTopic(null)} searchQuery={searchQuery} allPapers={allPapers} />
      )}
      {compareTopics && (
        <CompareModal topicA={compareTopics[0]} topicB={compareTopics[1]} onClose={() => setCompareTopics(null)} allPapers={allPapers} allTrends={allTrends} />
      )}
    </div>
  );
}
