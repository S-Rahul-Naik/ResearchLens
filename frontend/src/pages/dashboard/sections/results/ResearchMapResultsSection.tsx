import { useEffect, useMemo, useRef, useState } from 'react';
import { mockMapPoints } from '../../../../mocks/mapData';
import { mockTopics } from '../../../../mocks/topics';
import { mockGaps } from '../../../../mocks/gaps';
import type { RunAllResult } from '../../../../lib/api';

const TOPIC_COLORS = ['#0d9488', '#f59e0b', '#8b5cf6', '#e11d48', '#3b82f6', '#ec4899', '#10b981', '#f97316'];

const CANVAS_W = 700;
const CANVAS_H = 380;

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  topicName: string;
  color: string;
  year: number;
}

interface AdaptedGap {
  id: string;
  topicAId: string;
  topicBId: string;
  topicAName: string;
  topicBName: string;
  gapScore: number;
  explanation: string;
}

interface AdaptedPoint {
  paperId: string;
  title: string;
  x: number;
  y: number;
  topicId: string;
  topicName: string;
  color: string;
  year: number;
}

interface Centroid {
  x: number;
  y: number;
  topicId: string;
  topicName: string;
  color: string;
  paperCount: number;
}

function bezierCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature = 0.3
) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const cx = mx + nx * dist * curvature;
  const cy = my + ny * dist * curvature;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}


function getCentroid(topicId: string, points: AdaptedPoint[]): Centroid | null {
  const pts = points.filter((p) => p.topicId === topicId);
  if (pts.length === 0) return null;
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  return { x, y, topicId, topicName: pts[0].topicName, color: pts[0].color, paperCount: pts.length };
}

export default function ResearchMapResultsSection({ backendResult }: { backendResult?: RunAllResult | null }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    topicName: '',
    color: '',
    year: 0,
  });
  const [hoveredGap, setHoveredGap] = useState<string | null>(null);
  const [hoveredTopic, setHoveredTopic] = useState<string | null>(null);

  const br = backendResult;

  // Adapt real or mock data
  const adaptedPoints = useMemo(() => {
    if (br) {
      const topicColorMap = new Map<string, string>();
      const topicNameMap = new Map<string, string>();
      br.modules.module2.topics.forEach((t, i) => {
        topicColorMap.set(t.topicId, TOPIC_COLORS[i % TOPIC_COLORS.length]);
        topicNameMap.set(t.topicId, t.name);
      });
      return br.modules.module5.map.points.map(p => ({
        paperId: p.paperId,
        title: p.title,
        x: p.x,
        y: p.y,
        topicId: p.topicId,
        topicName: topicNameMap.get(p.topicId) ?? p.topicId,
        color: topicColorMap.get(p.topicId) ?? '#6b7280',
        year: p.year ?? 2020,
      }));
    }
    return mockMapPoints.map(p => ({
      paperId: p.paperId,
      title: p.title,
      x: p.x,
      y: p.y,
      topicId: p.topicId,
      topicName: p.topicName,
      color: p.color,
      year: p.year,
    }));
  }, [br]);

  const adaptedGaps = useMemo(() => {
    if (br) {
      return br.modules.module5.map.links.map((link, i) => ({
        id: `gap-${i}`,
        topicAId: link.topicA,
        topicBId: link.topicB,
        topicAName: br.modules.module2.topics.find(t => t.topicId === link.topicA)?.name ?? link.topicA,
        topicBName: br.modules.module2.topics.find(t => t.topicId === link.topicB)?.name ?? link.topicB,
        gapScore: 0.85,
        explanation: `Gap between ${br.modules.module2.topics.find(t => t.topicId === link.topicA)?.name ?? link.topicA} and ${br.modules.module2.topics.find(t => t.topicId === link.topicB)?.name ?? link.topicB}.`,
      }));
    }
    return mockGaps.filter((g) => g.coOccurrenceCount === 0).map(g => ({
      id: g.id,
      topicAId: g.topicAId,
      topicBId: g.topicBId,
      topicAName: g.topicAName,
      topicBName: g.topicBName,
      gapScore: g.gapScore,
      explanation: g.explanation,
    }));
  }, [br]);

  const allTopicIds = useMemo(() => {
    if (br) {
      return br.modules.module2.topics.map(t => t.topicId);
    }
    return mockTopics.map(t => t.id);
  }, [br]);

  const topicLabels = useMemo(() => {
    if (br) {
      return br.modules.module2.topics.map((t, i) => ({
        id: t.topicId,
        name: t.name,
        color: TOPIC_COLORS[i % TOPIC_COLORS.length],
        paperIds: t.paperIds,
      }));
    }
    return mockTopics.map(t => ({ id: t.id, name: t.name, color: t.color, paperIds: t.paperIds }));
  }, [br]);

  const centroids = useMemo(() => {
    return allTopicIds
      .map((id) => getCentroid(id, adaptedPoints))
      .filter((c): c is Centroid => c !== null);
  }, [allTopicIds, adaptedPoints]);

  // Topic halos
  const topicHalos = useMemo(() => {
    return centroids.map((c) => {
      const pts = adaptedPoints.filter((p) => p.topicId === c.topicId);
      const maxDist = Math.max(
        ...pts.map((p) =>
          Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2)
        ),
        40
      );
      return { ...c, radius: maxDist + 28 };
    });
  }, [centroids, adaptedPoints]);

  const activeGap = useMemo(() => {
    if (!hoveredGap) return null;
    return adaptedGaps.find(g => g.id === hoveredGap) || null;
  }, [hoveredGap, adaptedGaps]);

  const handlePaperEnter = (
    e: React.MouseEvent,
    pt: AdaptedPoint
  ) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible: true,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 16,
      title: pt.title,
      topicName: pt.topicName,
      color: pt.color,
      year: pt.year,
    });
  };

  const handlePaperMove = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 16,
    }));
  };

  const handlePaperLeave = () => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!tooltip.visible) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip((prev) => ({
        ...prev,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 16,
      }));
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [tooltip.visible]);

  return (
    <section id="result-map" className="mb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
          <i className="ri-map-2-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Section 5
          </p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            Research Map Visualization
          </h2>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {/* Top bar: legend + stats */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
              <span className="text-[11px] text-gray-500">Paper</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full border-2 border-gray-400 bg-transparent" />
              <span className="text-[11px] text-gray-500">Topic center</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="18" height="8">
                <path
                  d="M 0 4 Q 9 -4 18 4"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
              </svg>
              <span className="text-[11px] text-gray-500">Research gap</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-gray-400">
              {adaptedPoints.length} papers
            </span>
            <span className="w-px h-3 bg-gray-200" />
            <span className="text-[11px] text-gray-400">
              {centroids.length} topics
            </span>
            <span className="w-px h-3 bg-gray-200" />
            <span className="text-[11px] text-rose-500 font-medium">
              {adaptedGaps.length} critical gaps
            </span>
          </div>
        </div>

        {/* SVG Map */}
        <div className="relative bg-[#f8fafc] select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
            className="w-full h-auto block"
            style={{ maxHeight: 480 }}
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Soft radial gradient for topic halos */}
              {topicLabels.map((t) => (
                <radialGradient
                  key={`grad-${t.id}`}
                  id={`halo-${t.id}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop offset="0%" stopColor={t.color} stopOpacity="0.10" />
                  <stop
                    offset="70%"
                    stopColor={t.color}
                    stopOpacity="0.04"
                  />
                  <stop offset="100%" stopColor={t.color} stopOpacity="0" />
                </radialGradient>
              ))}
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="1"
                  stdDeviation="2"
                  floodColor="#000000"
                  floodOpacity="0.08"
                />
              </filter>
            </defs>

            {/* Topic halos */}
            {topicHalos.map((h) => (
              <circle
                key={`halo-${h.topicId}`}
                cx={h.x}
                cy={h.y}
                r={h.radius}
                fill={`url(#halo-${h.topicId})`}
                className="transition-opacity duration-300"
                opacity={hoveredTopic && hoveredTopic !== h.topicId ? 0.3 : 1}
              />
            ))}

            {/* Gap connection curves */}
            {adaptedGaps.map((gap) => {
              const ca = centroids.find(c => c.topicId === gap.topicAId);
              const cb = centroids.find(c => c.topicId === gap.topicBId);
              if (!ca || !cb) return null;
              const isHovered = hoveredGap === gap.id;
              const isDimmed = hoveredGap && !isHovered;
              return (
                <g key={gap.id}>
                  <path
                    d={bezierCurve(ca.x, ca.y, cb.x, cb.y)}
                    fill="none"
                    stroke={isHovered ? '#e11d48' : '#f43f5e'}
                    strokeWidth={isHovered ? 2.2 : 1.2}
                    strokeDasharray={isHovered ? 'none' : '4 4'}
                    opacity={isDimmed ? 0.15 : isHovered ? 0.85 : 0.35}
                    className="transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredGap(gap.id)}
                    onMouseLeave={() => setHoveredGap(null)}
                  />
                  {/* Gap midpoint marker */}
                  <circle
                    cx={(ca.x + cb.x) / 2}
                    cy={(ca.y + cb.y) / 2 - 10}
                    r={isHovered ? 5 : 3}
                    fill="#e11d48"
                    opacity={isDimmed ? 0 : isHovered ? 0.9 : 0.45}
                    className="transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredGap(gap.id)}
                    onMouseLeave={() => setHoveredGap(null)}
                  />
                </g>
              );
            })}

            {/* Centroid rings + labels */}
            {centroids.map((c) => {
              const isHovered = hoveredTopic === c.topicId;
              const isDimmed = hoveredTopic && !isHovered;
              return (
                <g
                  key={c.topicId}
                  onMouseEnter={() => setHoveredTopic(c.topicId)}
                  onMouseLeave={() => setHoveredTopic(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Outer ring */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={isHovered ? 18 : 14}
                    fill="none"
                    stroke={c.color}
                    strokeWidth={isHovered ? 2.5 : 1.8}
                    opacity={isDimmed ? 0.2 : isHovered ? 0.9 : 0.5}
                    className="transition-all duration-200"
                  />
                  {/* Center dot */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    r={3}
                    fill={c.color}
                    opacity={isDimmed ? 0.2 : 1}
                    className="transition-opacity duration-200"
                  />
                  {/* Label pill */}
                  <g
                    transform={`translate(${c.x}, ${c.y + 24})`}
                    opacity={isDimmed ? 0.2 : 1}
                    className="transition-opacity duration-200"
                  >
                    <rect
                      x={-(
                        (c.topicName.length > 14
                          ? c.topicName.slice(0, 13) + '…'
                          : c.topicName
                        ).length *
                          5 +
                        10
                      )}
                      y={-9}
                      width={
                        (c.topicName.length > 14
                          ? c.topicName.slice(0, 13) + '…'
                          : c.topicName
                        ).length *
                          5 +
                        20
                      }
                      height={18}
                      rx={9}
                      fill="white"
                      stroke={c.color + '40'}
                      strokeWidth={1}
                      filter="url(#shadow)"
                    />
                    <text
                      textAnchor="middle"
                      y={3}
                      fill={c.color}
                      fontSize={10}
                      fontWeight={600}
                      fontFamily="Inter, system-ui, sans-serif"
                    >
                      {c.topicName.length > 14
                        ? c.topicName.slice(0, 13) + '…'
                        : c.topicName}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Paper dots */}
            {adaptedPoints.map((pt, idx) => {
              const topicHovered = hoveredTopic === pt.topicId;
              const topicDimmed = hoveredTopic && !topicHovered;
              const gapHovered = activeGap
                ? activeGap.topicAId === pt.topicId ||
                  activeGap.topicBId === pt.topicId
                : false;
              const gapDimmed =
                hoveredGap && activeGap
                  ? !(
                      activeGap.topicAId === pt.topicId ||
                      activeGap.topicBId === pt.topicId
                    )
                  : false;

              const isHighlighted = topicHovered || gapHovered;
              const isDimmed = topicDimmed || gapDimmed;

              return (
                <circle
                  key={`${pt.paperId}-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isHighlighted ? 7 : 5.5}
                  fill={pt.color}
                  fillOpacity={isDimmed ? 0.2 : 0.85}
                  stroke="white"
                  strokeWidth={isHighlighted ? 2.2 : 1.5}
                  className="transition-all duration-200"
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={(e) => handlePaperEnter(e, pt)}
                  onMouseMove={handlePaperMove}
                  onMouseLeave={handlePaperLeave}
                />
              );
            })}

            {/* Tooltip inside SVG so it tracks zoom */}
            {tooltip.visible && (
              <g
                transform={`translate(${tooltip.x}, ${tooltip.y})`}
                pointerEvents="none"
              >
                <rect
                  x={-140}
                  y={-48}
                  width={280}
                  height={44}
                  rx={8}
                  fill="white"
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  filter="url(#shadow)"
                />
                <rect
                  x={-139}
                  y={-47}
                  width={278}
                  height={42}
                  rx={7}
                  fill="white"
                />
                {/* Color indicator */}
                <circle
                  cx={-124}
                  cy={-34}
                  r={4}
                  fill={tooltip.color}
                />
                <text
                  x={-114}
                  y={-30}
                  fill={tooltip.color}
                  fontSize={9}
                  fontWeight={600}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {tooltip.topicName}
                </text>
                <text
                  x={114}
                  y={-30}
                  textAnchor="end"
                  fill="#9ca3af"
                  fontSize={9}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {tooltip.year}
                </text>
                <text
                  x={0}
                  y={-12}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize={10}
                  fontWeight={500}
                  fontFamily="Inter, system-ui, sans-serif"
                >
                  {tooltip.title.length > 52
                    ? tooltip.title.slice(0, 50) + '…'
                    : tooltip.title}
                </text>
              </g>
            )}
          </svg>

          {/* Hover gap detail panel */}
          {activeGap && (
            <div className="absolute top-3 right-3 w-64 bg-white rounded-lg border border-gray-100 p-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <p className="text-[11px] font-semibold text-rose-600">
                  Gap detected
                </p>
                <span className="ml-auto text-[10px] text-gray-400">
                  Score {activeGap.gapScore.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mb-2">
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: topicLabels.find((t) => t.id === activeGap.topicAId)?.color + '18',
                    color: topicLabels.find((t) => t.id === activeGap.topicAId)?.color,
                  }}
                >
                  {activeGap.topicAName}
                </span>
                <i className="ri-arrow-right-line text-[10px] text-gray-400" />
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: topicLabels.find((t) => t.id === activeGap.topicBId)?.color + '18',
                    color: topicLabels.find((t) => t.id === activeGap.topicBId)?.color,
                  }}
                >
                  {activeGap.topicBName}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {activeGap.explanation.slice(0, 140)}
                {activeGap.explanation.length > 140 ? '…' : ''}
              </p>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong className="text-gray-700">How to read this map:</strong>{' '}
            Each dot is a paper positioned by semantic similarity. Dense
            clusters = well-studied areas. Sparse zones = potential gaps. Red
            dashed curves connect topics with zero co-occurrence papers.{' '}
            <span className="text-gray-400">
              Hover any dot for details, or hover a gap line to learn more.
            </span>
          </p>
        </div>
      </div>

      {/* Topic color key — compact horizontal row */}
      <div className="mt-4 flex flex-wrap gap-2">
        {topicLabels.map((t) => (
          <button
            key={t.id}
            className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2 hover:border-gray-200 transition-colors"
            onMouseEnter={() => setHoveredTopic(t.id)}
            onMouseLeave={() => setHoveredTopic(null)}
          >
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: t.color }}
            />
            <span className="text-[11px] text-gray-600 whitespace-nowrap">
              {t.name}
            </span>
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {t.paperIds.length}p
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

