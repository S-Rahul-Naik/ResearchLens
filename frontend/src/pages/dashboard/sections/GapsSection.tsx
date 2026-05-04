import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import type { ResearchGap } from '../../../mocks/gaps';
import GapCard from './gaps/GapCard';
import GapDetailPanel from './gaps/GapDetailPanel';
import GapCompareModal from './gaps/GapCompareModal';
import { logExport } from '../../../hooks/useExportHistory';
import type { RunAllResult, BackendPaper } from '../../../lib/api';

const TOPIC_COLORS = ['#0d9488','#f59e0b','#8b5cf6','#ec4899','#10b981','#06b6d4','#f97316','#3b82f6','#14b8a6','#a855f7'];

function adaptGaps(rawGaps: RunAllResult['modules']['module3']['gaps']): ResearchGap[] {
  return rawGaps.map((g, i) => ({
    id: g.gapId,
    topicAId: g.topicA,
    topicBId: g.topicB,
    topicAName: g.topicALabel,
    topicBName: g.topicBLabel,
    topicAKeywords: [],
    topicBKeywords: [],
    similarityScore: g.similarity,
    coOccurrenceCount: g.coOccurrence,
    gapScore: g.gapScore,
    paperIdsInA: [],
    paperIdsInB: [],
    paperIdsBridging: g.evidencePaperIds,
    explanation: g.recommendation,
    rank: i + 1,
  }));
}

function exportJSON(gaps: ResearchGap[], papers: { id: string; title: string; year: number }[]) {
  const data = { exportedAt: new Date().toISOString(), totalGaps: gaps.length, gaps: gaps.map(g => ({ rank: g.rank, topicA: g.topicAName, topicB: g.topicBName, similarityScore: g.similarityScore, coOccurrenceCount: g.coOccurrenceCount, gapScore: g.gapScore, topicAKeywords: g.topicAKeywords, topicBKeywords: g.topicBKeywords, explanation: g.explanation, bridgingPapers: papers.filter(p => g.paperIdsBridging.includes(p.id)).map(p => ({ title: p.title, year: p.year })) })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url;
  a.download = `researchlens-gaps-${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
  logExport({ type: 'JSON', label: `${gaps.length} research gap${gaps.length !== 1 ? 's' : ''}`, itemCount: gaps.length, section: 'Gap Detection' });
}

function exportPDF(gaps: ResearchGap[]) {
  const rows = gaps.map(g => `<div style="margin-bottom:28px;page-break-inside:avoid"><h2 style="font-size:15px;font-weight:700;color:#0f766e;margin-bottom:8px">#${g.rank}: ${g.topicAName} &times; ${g.topicBName}</h2><div style="display:flex;gap:12px;margin-bottom:10px"><div style="background:#f0fdf4;padding:6px 12px;border-radius:8px;font-size:12px"><strong>Similarity:</strong> ${g.similarityScore.toFixed(2)}</div><div style="background:#fafafa;padding:6px 12px;border-radius:8px;font-size:12px"><strong>Co-occ:</strong> ${g.coOccurrenceCount}</div><div style="background:#fff1f2;padding:6px 12px;border-radius:8px;font-size:12px"><strong>Score:</strong> ${g.gapScore.toFixed(3)}</div></div><p style="font-size:11px;color:#374151;line-height:1.6">${g.explanation}</p></div>`).join('<hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb"/>');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>ResearchLens Gap Export</title><script>window.onload=function(){window.print()}<\/script></head><body style="font-family:system-ui,sans-serif;padding:32px;max-width:800px;margin:0 auto"><div style="border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:24px"><div style="font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#9ca3af;margin-bottom:4px">ResearchLens &middot; Gap Export</div><h1 style="font-size:20px;font-weight:800;margin:0 0 4px">${gaps.length} Research Gap${gaps.length !== 1 ? 's' : ''}</h1><p style="font-size:11px;color:#6b7280;margin:0">Generated ${new Date().toLocaleString()}</p></div>${rows}</body></html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, '_blank');
  if (win) win.focus();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  logExport({ type: 'PDF', label: `${gaps.length} research gap${gaps.length !== 1 ? 's' : ''} report`, itemCount: gaps.length, section: 'Gap Detection' });
}

export default function GapsSection({ backendResult, papers: propPapers = [] }: { backendResult?: RunAllResult | null; papers?: BackendPaper[] }) {
  const gaps: ResearchGap[] = useMemo(() => {
    const raw = backendResult?.modules.module3.gaps;
    return raw && raw.length > 0 ? adaptGaps(raw) : [];
  }, [backendResult]);

  const paperList = propPapers.length > 0 ? propPapers : [];

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'gapScore' | 'similarity' | 'coOccurrence'>('gapScore');
  const [minSimilarity, setMinSimilarity] = useState(0);
  const [minGapScore, setMinGapScore] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const sorted = [...gaps]
    .filter(g => g.similarityScore >= minSimilarity && g.gapScore >= minGapScore)
    .sort((a, b) => { if (sortBy === 'gapScore') return b.gapScore - a.gapScore; if (sortBy === 'similarity') return b.similarityScore - a.similarityScore; return a.coOccurrenceCount - b.coOccurrenceCount; });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gapId = params.get('gap');
    if (gapId) { const idx = sorted.findIndex(g => g.id === gapId); if (idx !== -1) setSelectedIndex(idx); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenuOpen(false); };
    document.addEventListener('mousedown', handler); return () => document.removeEventListener('mousedown', handler);
  }, []);

  const navigate = useCallback((dir: 'prev' | 'next') => {
    setSelectedIndex(prev => { if (prev === null) return null; return dir === 'prev' ? Math.max(0, prev - 1) : Math.min(sorted.length - 1, prev + 1); });
  }, [sorted.length]);

  const toggleSelect = (id: string) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleCardClick = (gap: ResearchGap, index: number) => {
    if (selectMode) { toggleSelect(gap.id); } else { setSelectedIndex(index); }
  };

  const selectedGaps = sorted.filter(g => selectedIds.has(g.id));

  const canCompare = selectMode && selectedIds.size === 2;
  const compareGaps = canCompare ? selectedGaps.slice(0, 2) as [ResearchGap, ResearchGap] : null;

  return (
    <div className="p-8">
      {/* Info banner */}
      <div className="mb-6 p-4 bg-teal-50 border border-teal-100 rounded-xl flex items-start gap-3">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-100 text-teal-700 flex-shrink-0"><i className="ri-information-line text-sm" /></div>
        <div>
          <p className="text-sm font-semibold text-teal-800 mb-0.5">How gaps are detected</p>
          <p className="text-xs text-teal-700 leading-relaxed">A research gap is defined as two topics with <strong>high semantic similarity</strong> but <strong>low co-occurrence</strong> in papers. Formula: <code className="bg-teal-100 px-1.5 py-0.5 rounded font-mono text-[11px]">gap_score = similarity × (1 / (co_occurrence + 1))</code>. Click any card for full evidence. Switch to the <strong>Research Direction</strong> tab for a structured proposal.</p>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: 'ri-git-branch-line', label: 'Total Gaps', value: gaps.length, color: 'text-teal-600', bg: 'bg-teal-50' },
          { icon: 'ri-radar-line', label: 'Avg Similarity', value: gaps.length > 0 ? (gaps.reduce((s, g) => s + g.similarityScore, 0) / gaps.length).toFixed(2) : '—', color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: 'ri-link-unlink', label: 'Zero Co-occurrence', value: gaps.filter(g => g.coOccurrenceCount === 0).length, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl ${s.bg} ${s.color}`}><i className={`${s.icon} text-base`} /></div>
            <div><div className={`text-xl font-bold ${s.color}`}>{s.value}</div><div className="text-xs text-gray-500">{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Filter + action bar */}
      <div className="flex flex-wrap items-center gap-4 mb-6 px-5 py-3.5 bg-white rounded-xl border border-gray-100">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Sort:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-400 cursor-pointer bg-white text-gray-700">
            <option value="gapScore">Gap Score ↓</option>
            <option value="similarity">Similarity ↓</option>
            <option value="coOccurrence">Co-occurrence ↑</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Min sim:</label>
          <input type="range" min="0" max="0.9" step="0.05" value={minSimilarity} onChange={e => setMinSimilarity(parseFloat(e.target.value))} className="w-20 accent-teal-600 cursor-pointer" />
          <span className="text-xs font-mono text-teal-700 w-8 font-semibold">{minSimilarity.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Min score:</label>
          <input type="range" min="0" max="0.9" step="0.05" value={minGapScore} onChange={e => setMinGapScore(parseFloat(e.target.value))} className="w-20 accent-rose-500 cursor-pointer" />
          <span className="text-xs font-mono text-rose-600 w-8 font-semibold">{minGapScore.toFixed(2)}</span>
        </div>
        {(minSimilarity > 0 || minGapScore > 0) && (
          <button onClick={() => { setMinSimilarity(0); setMinGapScore(0); }} className="whitespace-nowrap flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 cursor-pointer"><i className="ri-refresh-line" /> Reset</button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Select mode toggle */}
          <button
            onClick={() => { setSelectMode(v => !v); setSelectedIds(new Set()); }}
            className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${selectMode ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
          >
            <i className={`${selectMode ? 'ri-checkbox-line' : 'ri-checkbox-blank-line'} text-sm`} />
            {selectMode ? `Selecting (${selectedIds.size})` : 'Select Gaps'}
          </button>
          {/* Export button */}
          {selectMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              {canCompare && (
                <button
                  onClick={() => setCompareOpen(true)}
                  className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
                >
                  <i className="ri-layout-column-line" /> Compare 2 Gaps
                </button>
              )}
              <div className="relative" ref={exportRef}>
                <button onClick={() => setExportMenuOpen(v => !v)} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer">
                  <i className="ri-download-2-line" /> Export {selectedIds.size} gap{selectedIds.size !== 1 ? 's' : ''}
                  <i className={`ri-arrow-down-s-line transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-20 w-44 bg-white rounded-xl border border-gray-100 py-1" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                    <button onClick={() => { exportJSON(selectedGaps, paperList); setExportMenuOpen(false); }} className="whitespace-nowrap w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"><i className="ri-braces-line text-amber-500" /> Export as JSON</button>
                    <button onClick={() => { exportPDF(selectedGaps); setExportMenuOpen(false); }} className="whitespace-nowrap w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"><i className="ri-file-pdf-2-line text-rose-500" /> Export as PDF</button>
                  </div>
                )}
              </div>
            </div>
          )}
          <span className="text-xs text-gray-400 whitespace-nowrap">{sorted.length} gap{sorted.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sorted.map((gap, i) => (
          <GapCard key={gap.id} gap={gap} onClick={() => handleCardClick(gap, i)} selected={selectedIds.has(gap.id)} selectMode={selectMode} />
        ))}
        {sorted.length === 0 && (
          <div className="col-span-2 text-center py-16 text-gray-400">
            <i className="ri-search-line text-3xl mb-3 block" />
            <p className="text-sm">No gaps match the current filters.</p>
            <button onClick={() => { setMinSimilarity(0); setMinGapScore(0); }} className="whitespace-nowrap mt-3 text-xs text-teal-600 hover:underline cursor-pointer">Reset filters</button>
          </div>
        )}
      </div>

      {compareOpen && compareGaps && (
        <GapCompareModal
          gapA={compareGaps[0]}
          gapB={compareGaps[1]}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {!selectMode && selectedIndex !== null && sorted[selectedIndex] && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedIndex(null)} />
          <GapDetailPanel gap={sorted[selectedIndex]} currentIndex={selectedIndex} totalCount={sorted.length} onNavigate={navigate} onClose={() => setSelectedIndex(null)} />
        </>
      )}
    </div>
  );
}
