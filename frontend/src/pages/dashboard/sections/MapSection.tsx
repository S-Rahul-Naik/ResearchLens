import { useMemo, useState, useRef } from 'react';
import type { RunAllResult, BackendPaper } from '../../../lib/api';

const W = 720;
const H = 480;
const PAD = 44;

const TOPIC_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#3b82f6', '#ec4899', '#10b981', '#f97316'];

type ViewMode = 'cluster' | 'citation';

type MapPoint = {
  paperId: string; topicId: string; topicName: string;
  x: number; y: number; color: string; title: string; year: number;
};
type AdaptedGap = {
  id: string; topicAId: string; topicBId: string; topicAName: string; topicBName: string;
  gapScore: number; coOccurrenceCount: number; similarityScore: number; reliability?: number; severity?: 'low' | 'moderate' | 'critical'; rank: number;
};
type AdaptedTopic = { id: string; name: string; color: string; paperIds: string[] };

export default function MapSection({ backendResult, papers: propPapers = [] }: { backendResult?: RunAllResult | null; papers?: BackendPaper[] }) {
  const [hoveredPaper, setHoveredPaper] = useState<MapPoint | null>(null);
  const [hoveredGapId, setHoveredGapId] = useState<string | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<MapPoint | null>(null);
  const [hiddenTopics, setHiddenTopics] = useState<Set<string>>(new Set());
  const [showGapLines, setShowGapLines] = useState(true);
  const [showCentroids, setShowCentroids] = useState(true);
  const [filterGapScore, setFilterGapScore] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('cluster');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  /* ── Adapt backend data ──────────────────────────── */
  const allTopics: AdaptedTopic[] = useMemo(() => {
    if (backendResult) {
      return (backendResult.modules?.module2?.topics ?? []).map((t, i) => ({
        id: t.topicId,
        name: t.name,
        color: TOPIC_COLORS[i % TOPIC_COLORS.length],
        paperIds: t.paperIds,
      }));
    }
    return [];
  }, [backendResult]);

  const allMapPoints: MapPoint[] = useMemo(() => {
    if (backendResult) {
      const topicColorMap = new Map(allTopics.map(t => [t.id, t.color]));
      const topicNameMap = new Map(allTopics.map(t => [t.id, t.name]));
      const paperYearMap = new Map(propPapers.map(p => [p.id, p.year ?? 0]));
      return (backendResult.modules?.module5?.map?.points ?? []).map(p => ({
        paperId: p.paperId,
        topicId: p.topicId,
        topicName: topicNameMap.get(p.topicId) ?? p.topicId,
        x: p.x,
        y: p.y,
        color: topicColorMap.get(p.topicId) ?? '#6b7280',
        title: p.title,
        year: paperYearMap.get(p.paperId) ?? 2020,
      }));
    }
    return [];
  }, [backendResult, allTopics, propPapers]);

  const allGaps: AdaptedGap[] = useMemo(() => {
    if (backendResult) {
      return (backendResult.modules?.module3?.gaps ?? [])
        .map(g => ({
          id: g.gapId,
          topicAId: g.topicA,
          topicBId: g.topicB,
          topicAName: g.topicALabel,
          topicBName: g.topicBLabel,
          gapScore: g.gapScore,
          coOccurrenceCount: g.coOccurrence,
          similarityScore: g.similarity,
          reliability: g.reliability,
          severity: g.severity,
        }))
        .sort((a, b) => b.gapScore - a.gapScore)
        .map((gap, index) => ({ ...gap, rank: index + 1 }));
    }
    return [];
  }, [backendResult]);

  const citationEdges: Array<{ from: string; to: string }> = [];
  const allPapers = propPapers;

  /* ── Export helpers ──────────────────────────────── */
  function triggerExport(format: 'dot' | 'json') {
    if (format === 'dot') {
      const lines: string[] = ['digraph ResearchLensCitations {'];
      lines.push('  graph [rankdir=LR fontname="Helvetica"];');
      lines.push('  node [shape=box style=filled fontname="Helvetica" fontsize=10];');
      lines.push('');
      const colorMap = new Map(allTopics.map(t => [t.id, t.color.replace('#', '')]));
      allMapPoints.forEach(pt => {
        const color = colorMap.get(pt.topicId) ?? 'aaaaaa';
        const label = pt.title.replace(/"/g, '\\"').slice(0, 60);
        lines.push(`  "${pt.paperId}" [label="${label}\\n(${pt.year})" fillcolor="#${color}33" color="#${color}"];`);
      });
      lines.push('');
      // No citation data available for export when using live backend-only mode.
      lines.push('}');
      const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'researchlens_citations.dot'; a.click();
      URL.revokeObjectURL(url);
    } else {
      const nodes = allMapPoints.map(pt => ({ data: { id: pt.paperId, label: pt.title, year: pt.year, topic: pt.topicId } }));
      const edges: Array<{ data: { id: string; source: string; target: string } }> = [];
      const blob = new Blob([JSON.stringify({ nodes, edges }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'researchlens_citations.json'; a.click();
      URL.revokeObjectURL(url);
    }
    setExportMenuOpen(false);
    setExportToast(`Citation graph exported as .${format.toUpperCase()}`);
    setTimeout(() => setExportToast(null), 3000);
  }

  const allX = allMapPoints.map(p => p.x);
  const allY = allMapPoints.map(p => p.y);
  const minX = Math.min(...allX.length ? allX : [0]), maxX = Math.max(...allX.length ? allX : [1]);
  const minY = Math.min(...allY.length ? allY : [0]), maxY = Math.max(...allY.length ? allY : [1]);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const toX = (x: number) => PAD + ((x - minX) / rangeX) * (W - PAD * 2);
  const toY = (y: number) => PAD + ((y - minY) / rangeY) * (H - PAD * 2);

  const toggleTopic = (id: string) =>
    setHiddenTopics(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  /* ── Compute topic centroids ───────────────────────── */
  const centroids = useMemo(() => {
    const map = new Map<string, { sx: number; sy: number; count: number; color: string; name: string }>();
    allMapPoints.forEach(pt => {
      if (!map.has(pt.topicId)) map.set(pt.topicId, { sx: 0, sy: 0, count: 0, color: pt.color, name: pt.topicName });
      const e = map.get(pt.topicId)!;
      e.sx += pt.x; e.sy += pt.y; e.count++;
    });
    const result: Record<string, { x: number; y: number; color: string; name: string; cx: number; cy: number }> = {};
    map.forEach((v, id) => {
      result[id] = {
        x: v.sx / v.count,
        y: v.sy / v.count,
        cx: toX(v.sx / v.count),
        cy: toY(v.sy / v.count),
        color: v.color,
        name: v.name,
      };
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMapPoints]);

  /* ── Unique paper positions (first occurrence per paperId) ── */
  const paperPositions = useMemo(() => {
    const seen = new Map<string, { cx: number; cy: number; color: string; topicId: string; title: string; year: number }>();
    allMapPoints.forEach(pt => {
      if (!seen.has(pt.paperId)) {
        seen.set(pt.paperId, {
          cx: toX(pt.x),
          cy: toY(pt.y),
          color: pt.color,
          topicId: pt.topicId,
          title: pt.title,
          year: pt.year,
        });
      }
    });
    return seen;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allMapPoints]);

  /* ── Citation edges for the selected/hovered paper ─── */
  const activePaperId = selectedPoint?.paperId ?? hoveredPaper?.paperId ?? null;
  const outgoingCitations: Array<{ from: string; to: string }> = [];
  const incomingCitations: Array<{ from: string; to: string }> = [];

  const visiblePoints = allMapPoints.filter(p => !hiddenTopics.has(p.topicId));
  const filteredGaps = allGaps.filter(g => g.gapScore >= filterGapScore);
  const hoveredGap = hoveredGapId ? allGaps.find(g => g.id === hoveredGapId) : null;
  const selectedPaper = selectedPoint
    ? propPapers.find(p => p.id === selectedPoint.paperId) ?? null
    : null;

  /* ── Stats ─────────────────────────────────────────── */
  const zeroCoOcc = allGaps.filter(g => g.coOccurrenceCount === 0).length;
  const avgSim = allGaps.length > 0
    ? (allGaps.reduce((s, g) => s + g.similarityScore, 0) / allGaps.length).toFixed(2)
    : '0.00';

  /* ── Citation graph helpers ─────────────────────────── */
  const citationInDegree = useMemo(() => {
    return new Map<string, number>();
  }, []);

  const maxInDegree = Math.max(...Array.from(citationInDegree.values()), 1);

  const isHighlightedCitation = (paperId: string) =>
    activePaperId !== null && (
      paperId === activePaperId ||
      outgoingCitations.some(c => c.to === paperId) ||
      incomingCitations.some(c => c.from === paperId)
    );

  /* ── Arrow helper ───────────────────────────────────── */
  function ArrowLine({ fromId, toId, color, opacity }: { fromId: string; toId: string; color: string; opacity: number }) {
    const from = paperPositions.get(fromId);
    const to = paperPositions.get(toId);
    if (!from || !to) return null;

    // Shorten the line so the arrowhead sits at the circle edge
    const dx = to.cx - from.cx;
    const dy = to.cy - from.cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return null;
    const r = 6;
    const ex = to.cx - (dx / dist) * r;
    const ey = to.cy - (dy / dist) * r;

    const markerId = `arr-${color.replace('#', '')}-${opacity}`;

    return (
      <g>
        <defs>
          <marker id={markerId} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill={color} opacity={opacity} />
          </marker>
        </defs>
        <line
          x1={from.cx} y1={from.cy} x2={ex} y2={ey}
          stroke={color}
          strokeWidth={1.5}
          opacity={opacity}
          markerEnd={`url(#${markerId})`}
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5 h-full overflow-y-auto">

      {/* Export Toast */}
      {exportToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center gap-2">
          <i className="ri-check-line text-emerald-400" />
          {exportToast}
        </div>
      )}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: 'ri-focus-3-line', label: 'Papers', value: allMapPoints.length, color: 'text-teal-600', bg: 'bg-teal-50' },
          { icon: 'ri-price-tag-3-line', label: 'Topics', value: allTopics.length, color: 'text-violet-600', bg: 'bg-violet-50' },
          { icon: 'ri-git-branch-line', label: 'Gaps', value: allGaps.length, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: 'ri-node-tree', label: 'Citations', value: citationEdges.length, color: 'text-sky-600', bg: 'bg-sky-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 flex items-center justify-center rounded-xl ${s.bg} ${s.color} flex-shrink-0`}>
              <i className={`${s.icon} text-base`} />
            </div>
            <div>
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main layout */}
      <div className="flex gap-5 flex-1">

        {/* Map Canvas */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">

          {/* View Mode Toggle */}
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-500 mr-1">View:</span>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cluster')}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${viewMode === 'cluster' ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <i className="ri-bubble-chart-line text-xs" />
                Cluster Map
              </button>
              <button
                onClick={() => setViewMode('citation')}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${viewMode === 'citation' ? 'bg-white text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
              >
                <i className="ri-node-tree text-xs" />
                Citation Graph
              </button>
            </div>

            {viewMode === 'cluster' && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showGapLines} onChange={e => setShowGapLines(e.target.checked)} className="accent-teal-600 cursor-pointer" />
                  <span className="text-xs font-medium text-gray-600">Gap connections</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showCentroids} onChange={e => setShowCentroids(e.target.checked)} className="accent-teal-600 cursor-pointer" />
                  <span className="text-xs font-medium text-gray-600">Topic centroids</span>
                </label>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Min gap score:</span>
                  <input
                    type="range" min="0" max="0.8" step="0.05" value={filterGapScore}
                    onChange={e => setFilterGapScore(parseFloat(e.target.value))}
                    className="w-20 accent-teal-600 cursor-pointer"
                  />
                  <span className="text-xs font-mono font-semibold text-teal-700 w-8">{filterGapScore.toFixed(2)}</span>
                </div>
              </>
            )}

            {viewMode === 'citation' && (
              <div className="flex items-center gap-4 ml-auto text-[10px] text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 h-px border-t-2 border-sky-400" />
                  <span className="w-0 h-0 border-t-2 border-b-2 border-l-4 border-transparent border-l-sky-400 inline-block" />
                  Outgoing
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 h-px border-t-2 border-rose-400" />
                  Incoming
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 h-px border-t-2 border-gray-300 border-dashed" />
                  Other
                </span>
                <span className="text-gray-300">· hover/click a dot to highlight</span>

                {/* Export dropdown */}
                <div className="relative ml-2" ref={exportRef}>
                  <button
                    onClick={() => setExportMenuOpen(e => !e)}
                    className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors cursor-pointer"
                  >
                    <i className="ri-download-2-line text-xs" />
                    Export Graph
                  </button>
                  {exportMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-100 shadow-lg z-20 overflow-hidden">
                      <div className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Download citation network</p>
                      </div>
                      <button
                        onClick={() => triggerExport('dot')}
                        className="whitespace-nowrap w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                      >
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-50 text-violet-600 flex-shrink-0 mt-0.5">
                          <i className="ri-node-tree text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">DOT format</p>
                          <p className="text-[10px] text-gray-400">For Gephi, Graphviz, yEd</p>
                        </div>
                      </button>
                      <button
                        onClick={() => triggerExport('json')}
                        className="whitespace-nowrap w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors cursor-pointer text-left border-t border-gray-100"
                      >
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-50 text-teal-600 flex-shrink-0 mt-0.5">
                          <i className="ri-code-box-line text-sm" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">JSON format</p>
                          <p className="text-[10px] text-gray-400">For Cytoscape.js, D3, NetworkX</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SVG Map */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative">
            <div className="px-5 py-3 border-b border-gray-100">
              {viewMode === 'cluster' ? (
                <>
                  <h3 className="text-sm font-semibold text-gray-800">2D UMAP Projection</h3>
                  <p className="text-xs text-gray-400">Papers clustered by BERTopic embeddings · lines = research gaps between topic centroids · hover for details</p>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-gray-800">Citation Graph</h3>
                  <p className="text-xs text-gray-400">Directed arrows show citation relationships — <strong className="text-sky-600">blue</strong> = cites others, <strong className="text-rose-500">red</strong> = cited by · dot size scales with in-degree</p>
                </>
              )}
            </div>
            <div className="relative bg-[#fafbfc] p-2" style={{ minHeight: 380 }}>
              <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="w-full">

                {/* Background grid */}
                {Array.from({ length: 9 }).map((_, i) => (
                  <line key={`vg${i}`} x1={(i / 8) * W} y1={0} x2={(i / 8) * W} y2={H} stroke="#f1f5f9" strokeWidth="1" />
                ))}
                {Array.from({ length: 7 }).map((_, i) => (
                  <line key={`hg${i}`} x1={0} y1={(i / 6) * H} x2={W} y2={(i / 6) * H} stroke="#f1f5f9" strokeWidth="1" />
                ))}

                {/* ══ CLUSTER VIEW ═══════════════════════════════ */}
                {viewMode === 'cluster' && (
                  <>
                    {/* Gap connection lines */}
                    {showGapLines && filteredGaps.map(gap => {
                      const cA = centroids[gap.topicAId];
                      const cB = centroids[gap.topicBId];
                      if (!cA || !cB) return null;
                      if (hiddenTopics.has(gap.topicAId) || hiddenTopics.has(gap.topicBId)) return null;

                      const isHovered = hoveredGapId === gap.id;
                      const isZero = gap.coOccurrenceCount === 0;
                      const strokeColor = gap.severity === 'critical' || isZero ? '#e11d48' : gap.severity === 'moderate' ? '#f59e0b' : '#94a3b8';
                      const strokeW = isHovered ? 2.6 : Math.max(1.1, gap.gapScore * 2.2);
                      const opacity = isHovered ? 0.95 : Math.max(0.18, gap.gapScore * 0.55);
                      const mx = (cA.cx + cB.cx) / 2;
                      const my = (cA.cy + cB.cy) / 2;

                      return (
                        <g key={gap.id}>
                          <line x1={cA.cx} y1={cA.cy} x2={cB.cx} y2={cB.cy} stroke="transparent" strokeWidth={16} className="cursor-pointer" onMouseEnter={() => setHoveredGapId(gap.id)} onMouseLeave={() => setHoveredGapId(null)} />
                          <line x1={cA.cx} y1={cA.cy} x2={cB.cx} y2={cB.cy} stroke={strokeColor} strokeWidth={strokeW} strokeDasharray={isZero ? '7,5' : '4,4'} opacity={opacity} style={{ pointerEvents: 'none' }} />
                          {isHovered && (
                            <g style={{ pointerEvents: 'none' }}>
                              <rect x={mx - 22} y={my - 10} width={44} height={18} rx={5} fill={strokeColor} opacity={0.92} />
                              <text x={mx} y={my + 3} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">{gap.gapScore.toFixed(2)}</text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Paper dots */}
                    {visiblePoints.map((pt, idx) => {
                      const cx = toX(pt.x);
                      const cy = toY(pt.y);
                      const isHov = hoveredPaper?.paperId === pt.paperId;
                      const isSel = selectedPoint?.paperId === pt.paperId;
                      return (
                        <circle key={`${pt.paperId}-${pt.topicId}-${idx}`} cx={cx} cy={cy} r={isSel ? 7 : isHov ? 6.5 : 5} fill={pt.color} opacity={isSel ? 1 : isHov ? 0.95 : 0.78} stroke={isSel ? 'white' : isHov ? 'white' : 'transparent'} strokeWidth={isSel || isHov ? 1.5 : 0} className="cursor-pointer transition-all" onMouseEnter={() => setHoveredPaper(pt)} onMouseLeave={() => setHoveredPaper(null)} onClick={() => setSelectedPoint(pt.paperId === selectedPoint?.paperId ? null : pt)} />
                      );
                    })}

                    {/* Topic centroid rings */}
                    {showCentroids && Object.entries(centroids).map(([tid, c]) => {
                      if (hiddenTopics.has(tid)) return null;
                      return (
                        <g key={`cent-${tid}`} style={{ pointerEvents: 'none' }}>
                          <circle cx={c.cx} cy={c.cy} r={14} fill={c.color} opacity={0.12} />
                          <circle cx={c.cx} cy={c.cy} r={5} fill={c.color} opacity={0.5} stroke="white" strokeWidth={1.5} />
                        </g>
                      );
                    })}

                    {/* Centroid labels */}
                    {showCentroids && Object.entries(centroids).map(([tid, c]) => {
                      if (hiddenTopics.has(tid)) return null;
                      const words = c.name.split(' ');
                      const short = words.length > 2 ? words.slice(0, 2).join(' ') + '…' : c.name;
                      const lx = c.cx > W - 60 ? c.cx - 6 : c.cx + 18;
                      const anchor = c.cx > W - 60 ? 'end' : 'start';
                      return (
                        <text key={`lbl-${tid}`} x={lx} y={c.cy + 4} fontSize="9" fill={c.color} fontWeight="700" textAnchor={anchor} style={{ pointerEvents: 'none' }}>{short}</text>
                      );
                    })}

                    {/* Hover tooltip for paper */}
                    {hoveredPaper && !hoveredGapId && (() => {
                      const cx = toX(hoveredPaper.x);
                      const cy = toY(hoveredPaper.y);
                      const title = hoveredPaper.title.length > 44 ? hoveredPaper.title.slice(0, 44) + '…' : hoveredPaper.title;
                      const tx = cx > W - 190 ? cx - 190 : cx + 12;
                      const ty = cy > H - 52 ? cy - 52 : cy + 8;
                      return (
                        <g style={{ pointerEvents: 'none' }}>
                          <rect x={tx} y={ty} width={185} height={42} rx={7} fill="white" stroke="#e5e7eb" strokeWidth={1} style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.09))' }} />
                          <text x={tx + 9} y={ty + 15} fontSize="9" fill="#1f2937" fontWeight="600">{title}</text>
                          <text x={tx + 9} y={ty + 30} fontSize="8" fill={hoveredPaper.color} fontWeight="500">{hoveredPaper.topicName} · {hoveredPaper.year}</text>
                        </g>
                      );
                    })()}

                    {/* Hover tooltip for gap line */}
                    {hoveredGap && (() => {
                      const cA = centroids[hoveredGap.topicAId];
                      const cB = centroids[hoveredGap.topicBId];
                      if (!cA || !cB) return null;
                      const mx = Math.max(40, Math.min(W - 200, (cA.cx + cB.cx) / 2 - 90));
                      const my = Math.max(10, (cA.cy + cB.cy) / 2 - 52);
                      return (
                        <g style={{ pointerEvents: 'none' }}>
                          <rect x={mx} y={my} width={190} height={60} rx={8} fill="white" stroke="#e5e7eb" strokeWidth={1} style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.10))' }} />
                          <text x={mx + 10} y={my + 15} fontSize="9" fill="#111827" fontWeight="700">{hoveredGap.topicAName} ↔ {hoveredGap.topicBName}</text>
                          <text x={mx + 10} y={my + 29} fontSize="8" fill="#6b7280">Sim: {hoveredGap.similarityScore.toFixed(2)}  ·  Co-occ: {hoveredGap.coOccurrenceCount}  ·  Score: {hoveredGap.gapScore.toFixed(3)}</text>
                          <text x={mx + 10} y={my + 43} fontSize="8" fill={hoveredGap.coOccurrenceCount === 0 ? '#ef4444' : '#f59e0b'} fontWeight="600">{hoveredGap.coOccurrenceCount === 0 ? 'No bridging papers — strong gap' : `${hoveredGap.coOccurrenceCount} bridging paper${hoveredGap.coOccurrenceCount > 1 ? 's' : ''}`}</text>
                          <text x={mx + 10} y={my + 54} fontSize="7.5" fill="#9ca3af">Rank #{hoveredGap.rank}</text>
                        </g>
                      );
                    })()}
                  </>
                )}

                {/* ══ CITATION GRAPH VIEW ═════════════════════════ */}
                {viewMode === 'citation' && (
                  <>
                    {/* All citation edges (dimmed background) */}
                    {[]
                      .map(c => null)}

                    {/* Paper dots sized by in-degree */}
                    {Array.from(paperPositions.entries()).map(([pid, pos]) => {
                      const inDeg = citationInDegree.get(pid) ?? 0;
                      const r = 4 + (inDeg / maxInDegree) * 8;
                      const isActive = pid === activePaperId;
                      const isHighlighted = isHighlightedCitation(pid);
                      const dimmed = activePaperId !== null && !isHighlighted;
                      const pt = allMapPoints.find(p => p.paperId === pid);

                      return (
                        <circle
                          key={`cit-dot-${pid}`}
                          cx={pos.cx} cy={pos.cy} r={isActive ? r + 3 : r}
                          fill={pos.color}
                          opacity={dimmed ? 0.2 : isActive ? 1 : 0.82}
                          stroke={isActive ? 'white' : 'transparent'}
                          strokeWidth={isActive ? 2 : 0}
                          className="cursor-pointer transition-all"
                          onMouseEnter={() => pt && setHoveredPaper(pt)}
                          onMouseLeave={() => setHoveredPaper(null)}
                          onClick={() => {
                            if (selectedPoint?.paperId === pid) {
                              setSelectedPoint(null);
                            } else {
                              const p = allMapPoints.find(mp => mp.paperId === pid);
                              if (p) setSelectedPoint(p);
                            }
                          }}
                        />
                      );
                    })}

                    {/* In-degree labels on most-cited */}
                    {Array.from(paperPositions.entries())
                      .filter(([pid]) => (citationInDegree.get(pid) ?? 0) >= 2)
                      .map(([pid, pos]) => {
                        const inDeg = citationInDegree.get(pid) ?? 0;
                        const dimmed = activePaperId !== null && !isHighlightedCitation(pid);
                        return (
                          <text key={`indeg-${pid}`} x={pos.cx} y={pos.cy + 3} textAnchor="middle" fontSize="8" fill="white" fontWeight="800" opacity={dimmed ? 0.15 : 0.9} style={{ pointerEvents: 'none' }}>{inDeg}</text>
                        );
                      })}

                    {/* Hover tooltip for citation view */}
                    {hoveredPaper && (() => {
                      const pos = paperPositions.get(hoveredPaper.paperId);
                      if (!pos) return null;
                      const outDeg = 0;
                      const inDeg = citationInDegree.get(hoveredPaper.paperId) ?? 0;
                      const title = hoveredPaper.title.length > 40 ? hoveredPaper.title.slice(0, 40) + '…' : hoveredPaper.title;
                      const tx = pos.cx > W - 200 ? pos.cx - 205 : pos.cx + 12;
                      const ty = pos.cy > H - 62 ? pos.cy - 62 : pos.cy + 8;
                      return (
                        <g style={{ pointerEvents: 'none' }}>
                          <rect x={tx} y={ty} width={195} height={54} rx={7} fill="white" stroke="#e5e7eb" strokeWidth={1} style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.09))' }} />
                          <text x={tx + 9} y={ty + 14} fontSize="9" fill="#1f2937" fontWeight="600">{title}</text>
                          <text x={tx + 9} y={ty + 28} fontSize="8" fill={hoveredPaper.color}>{hoveredPaper.topicName} · {hoveredPaper.year}</text>
                          <text x={tx + 9} y={ty + 42} fontSize="8" fill="#0ea5e9">↑ cites {outDeg}</text>
                          <text x={tx + 70} y={ty + 42} fontSize="8" fill="#f43f5e">↓ cited by {inDeg}</text>
                        </g>
                      );
                    })()}
                  </>
                )}

              </svg>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-56 flex-shrink-0 space-y-4">

          {/* Topic legend */}
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Topics</h4>
            <div className="space-y-1">
              {allTopics.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTopic(t.id)}
                  className={`whitespace-nowrap w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors cursor-pointer ${hiddenTopics.has(t.id) ? 'opacity-35' : 'hover:bg-gray-50'}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color }} />
                  <span className="text-[11px] text-gray-700 flex-1 truncate">{t.name}</span>
                  <span className="text-[10px] text-gray-400">{t.paperIds.length}</span>
                </button>
              ))}
            </div>
            {hiddenTopics.size > 0 && (
              <button onClick={() => setHiddenTopics(new Set())} className="whitespace-nowrap mt-2 text-[10px] text-teal-600 hover:underline cursor-pointer w-full text-left">
                Show all
              </button>
            )}
          </div>

          {/* Citation stats panel (only in citation view) */}
          {viewMode === 'citation' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Most Cited</h4>
              <div className="text-[10px] text-gray-500">Citation information is not available for live backend-only data.</div>
            </div>
          )}

          {/* Active gaps list (cluster view) */}
          {viewMode === 'cluster' && (
            <div className="bg-white rounded-2xl border border-gray-100 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Gaps shown <span className="text-gray-300">({filteredGaps.length})</span>
              </h4>
              <div className="space-y-1.5">
                {filteredGaps.slice(0, 5).map(g => (
                  <div key={g.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${hoveredGapId === g.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`} onMouseEnter={() => setHoveredGapId(g.id)} onMouseLeave={() => setHoveredGapId(null)}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${g.coOccurrenceCount === 0 ? 'bg-rose-400' : 'bg-amber-400'}`} />
                    <span className="text-[10px] text-gray-600 truncate flex-1">{g.topicAName} × {g.topicBName}</span>
                    <span className="text-[10px] font-mono font-semibold text-gray-500 flex-shrink-0">{g.gapScore.toFixed(2)}</span>
                  </div>
                ))}
                {filteredGaps.length > 5 && <p className="text-[10px] text-gray-400 px-2">+{filteredGaps.length - 5} more</p>}
              </div>
            </div>
          )}

          {/* Selected paper */}
          {selectedPaper ? (
            <div className="bg-white rounded-2xl border border-teal-100 p-4">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Selected Paper</h4>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: (selectedPoint?.color ?? '#aaa') + '20', color: selectedPoint?.color }}>
                <i className="ri-file-text-line text-sm" />
              </div>
              <p className="text-[11px] font-semibold text-gray-800 leading-snug mb-1.5">{selectedPaper.title}</p>
              <p className="text-[10px] text-gray-400 mb-2">
                {Array.isArray((selectedPaper as { authors?: string[] }).authors)
                  ? (selectedPaper as { authors: string[] }).authors.slice(0, 2).join(', ')
                  : ''} · {selectedPaper.year}
              </p>
              {viewMode === 'citation' && (
                <div className="flex gap-2 mb-2">
                  <span className="text-[9px] bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-semibold">
                    Cites {outgoingCitations.length}
                  </span>
                  <span className="text-[9px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full font-semibold">
                    Cited by {citationInDegree.get(selectedPaper.id) ?? 0}
                  </span>
                </div>
              )}
              <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-4">{selectedPaper.abstract}</p>
              <button onClick={() => setSelectedPoint(null)} className="whitespace-nowrap mt-2 text-[10px] text-teal-600 hover:underline cursor-pointer">
                Deselect
              </button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
              <i className={`${viewMode === 'citation' ? 'ri-node-tree' : 'ri-cursor-line'} text-gray-300 text-xl mb-1 block`} />
              <p className="text-[11px] text-gray-400">
                {viewMode === 'citation' ? 'Click a dot to see citation connections' : 'Click a dot to view paper details'}
              </p>
              <p className="text-[10px] text-gray-300 mt-0.5">
                {viewMode === 'citation' ? 'Dot size = number of citations received' : 'Hover lines to see gap info'}
              </p>
            </div>
          )}

          {/* Map key */}
          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Map Key</p>
            {viewMode === 'cluster' ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-teal-500 opacity-70 flex-shrink-0" /><span className="text-[10px] text-gray-600">Paper dot (color = topic)</span></div>
                <div className="flex items-center gap-2"><span className="w-4 h-4 rounded-full border-2 border-teal-500 flex-shrink-0" style={{ backgroundColor: 'rgba(13,148,136,0.12)' }} /><span className="text-[10px] text-gray-600">Topic centroid</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-7 border-t-2 border-rose-400 border-dashed flex-shrink-0" /><span className="text-[10px] text-gray-600">Strong gap (0 co-occ)</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-7 border-t-2 border-amber-400 border-dashed flex-shrink-0" /><span className="text-[10px] text-gray-600">Partial gap</span></div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-teal-500 opacity-70 flex-shrink-0" /><span className="text-[10px] text-gray-600">Large dot = highly cited</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-gray-400 opacity-70 flex-shrink-0" /><span className="text-[10px] text-gray-600">Small dot = few citations</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-7 border-t-2 border-sky-400 flex-shrink-0" /><span className="text-[10px] text-gray-600">Outgoing citation</span></div>
                <div className="flex items-center gap-2"><span className="inline-block w-7 border-t-2 border-rose-400 flex-shrink-0" /><span className="text-[10px] text-gray-600">Incoming citation</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-white border-2 border-gray-300 text-[7px] font-bold text-gray-500 flex items-center justify-center flex-shrink-0">2</span><span className="text-[10px] text-gray-600">Number inside = in-degree</span></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom summary */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-3 flex flex-wrap gap-5 items-center">
        <i className="ri-information-line text-teal-500 text-sm flex-shrink-0" />
        {viewMode === 'cluster' ? (
          <span className="text-xs text-gray-500">
            UMAP projection preserves local neighborhood structure. Papers close together share similar embeddings.
            Lines connect topic centroids — <strong>dashed red</strong> = zero-bridging gap (strongest opportunity),
            <strong> dashed amber</strong> = partial gap. Avg similarity: <strong>{avgSim}</strong>.
          </span>
        ) : (
          <span className="text-xs text-gray-500">
            Directed arrows show citation relationships between papers. <strong>Dot size scales with in-degree</strong> (how many papers cite it).
            The white number inside large dots = citation count received. Hover or click any dot to isolate its citation network.
            Total citation edges: <strong>{citationEdges.length}</strong>.
          </span>
        )}
      </div>
    </div>
  );
}
