import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointResult, RunAllResult } from '../../../../lib/api';
import { regenerateVisualizationWithOllama } from '../../../../lib/api';

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
  reliability?: number;
  severity?: 'low' | 'moderate' | 'critical';
  similarityScore?: number;
  coOccurrenceCount?: number;
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

interface TopicLabel {
  key: string;
  id: string;
  name: string;
  color: string;
  paperIds: string[];
}

function normalizeTopicId(topic: { topicId?: string; id?: string; name?: string }, index: number) {
  return topic.topicId || topic.id || topic.name || `topic-${index}`;
}

function normalizeKey(value: string | undefined | null) {
  return String(value ?? '').trim().toLowerCase();
}

function stableHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
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
  const [selectedPoint, setSelectedPoint] = useState<AdaptedPoint | null>(null);
  const [selectedGap, setSelectedGap] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [mapOverride, setMapOverride] = useState<RunAllResult['modules']['module5'] | null>(null);
  const [showMapGuide, setShowMapGuide] = useState(false);
  const autoRegeneratedForRef = useRef<string | null>(null);

  useEffect(() => {
    setMapOverride(null);
    autoRegeneratedForRef.current = null;
  }, [backendResult]);

  const br = useMemo(() => {
    if (!backendResult) return backendResult;
    if (!mapOverride) return backendResult;
    return {
      ...backendResult,
      modules: {
        ...backendResult.modules,
        module5: mapOverride,
      },
    };
  }, [backendResult, mapOverride]);

  const topics = br?.modules?.module2?.topics ?? [];
  const mapPoints = br?.modules?.module5?.map?.points ?? [];
  const mapLinks = br?.modules?.module5?.map?.links ?? [];
  const gaps = br?.modules?.module3?.gaps ?? [];

  const normalizedTopics = useMemo(() => {
    return topics.map((topic, index) => ({
      ...topic,
      topicId: normalizeTopicId(topic, index),
    }));
  }, [topics]);

  const paperTopicMap = useMemo(() => {
    const map = new Map<string, string>();
    normalizedTopics.forEach((topic) => {
      (topic.paperIds || []).forEach((paperId: string) => {
        map.set(paperId, topic.topicId);
      });
    });
    return map;
  }, [normalizedTopics]);

  const topicIdByName = useMemo(() => {
    const map = new Map<string, string>();
    normalizedTopics.forEach((topic) => {
      map.set(normalizeKey(topic.name), topic.topicId);
      map.set(normalizeKey(topic.topicName), topic.topicId);
    });
    return map;
  }, [normalizedTopics]);

  const generatedMapPoints = useMemo<PointResult[]>(() => {
    if (normalizedTopics.length === 0) return [];

    const centers = normalizedTopics.map((topic, index) => {
      const total = Math.max(1, normalizedTopics.length);
      const theta = (2 * Math.PI * index) / total;
      return {
        topicId: topic.topicId,
        x: Math.cos(theta) * 0.7,
        y: Math.sin(theta) * 0.7,
      };
    });
    const centerByTopicId = new Map(centers.map((center) => [center.topicId, center]));

    return normalizedTopics.flatMap((topic) => {
      const paperIds = Array.isArray(topic.paperIds) ? topic.paperIds.map((id) => String(id)) : [];
      const center = centerByTopicId.get(topic.topicId) ?? { x: 0, y: 0 };
      const total = Math.max(1, paperIds.length);
      return paperIds.map((paperId, index) => {
        const seed = stableHash(`${topic.topicId}-${paperId}`);
        const angle = ((2 * Math.PI * index) / total) + ((seed % 360) * Math.PI / 1800);
        const radius = 0.14 + ((seed % 40) / 1000) + ((index % 3) * 0.02);
        return {
          paperId,
          title: `Paper ${paperId}`,
          topicId: topic.topicId,
          x: center.x + (Math.cos(angle) * radius),
          y: center.y + (Math.sin(angle) * radius),
          keywords: [],
        };
      });
    });
  }, [normalizedTopics]);

  const effectiveMapPoints = mapPoints.length > 0 ? mapPoints : generatedMapPoints;

  const adaptedPoints = useMemo(() => {
    if (!br || effectiveMapPoints.length === 0) return [];

    const topicColorMap = new Map<string, string>();
    const topicNameMap = new Map<string, string>();
    normalizedTopics.forEach((t, i) => {
      topicColorMap.set(t.topicId, TOPIC_COLORS[i % TOPIC_COLORS.length]);
      topicNameMap.set(t.topicId, t.name);
    });

    return effectiveMapPoints.map((p) => {
      const point = p as PointResult & { year?: number };
      const pointTopicId =
        point.topicId ||
        paperTopicMap.get(point.paperId) ||
        topicIdByName.get(normalizeKey((point as any).topicName)) ||
        topicIdByName.get(normalizeKey(point.title)) ||
        normalizedTopics[0]?.topicId ||
        point.topicName ||
        point.title;
      return {
        paperId: point.paperId,
        title: point.title,
        x: point.x,
        y: point.y,
        topicId: pointTopicId,
        topicName: topicNameMap.get(pointTopicId) ?? (point as any).topicName ?? pointTopicId,
        color: topicColorMap.get(pointTopicId) ?? '#6b7280',
        year: point.year ?? new Date().getFullYear(),
      };
    });
  }, [br, effectiveMapPoints, normalizedTopics, paperTopicMap, topicIdByName]);

  const normalizedPoints = useMemo(() => {
    if (adaptedPoints.length === 0) return [];

    const xs = adaptedPoints.map((p) => p.x);
    const ys = adaptedPoints.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 48;
    const width = CANVAS_W - padding * 2;
    const height = CANVAS_H - padding * 2;

    return adaptedPoints.map((p) => ({
      ...p,
      x: padding + ((p.x - minX) / rangeX) * width,
      y: padding + ((p.y - minY) / rangeY) * height,
    }));
  }, [adaptedPoints]);

  const adaptedGaps = useMemo(() => {
    if (!br || mapLinks.length === 0) return [];

    const gapLookup = new Map(
      gaps.map((gap) => [`${gap.topicA}|${gap.topicB}`, gap])
    );

    return mapLinks.map((link, i) => {
      const mapLink = link as { sourceTopicId: string; targetTopicId: string; gapScore?: number; severity?: 'low' | 'moderate' | 'critical' };
      const gap = gapLookup.get(`${mapLink.sourceTopicId}|${mapLink.targetTopicId}`) ?? gapLookup.get(`${mapLink.targetTopicId}|${mapLink.sourceTopicId}`);
      return {
        id: gap?.gapId ?? `gap-${i}`,
        topicAId: mapLink.sourceTopicId,
        topicBId: mapLink.targetTopicId,
        topicAName: normalizedTopics.find(t => t.topicId === mapLink.sourceTopicId)?.name ?? mapLink.sourceTopicId,
        topicBName: normalizedTopics.find(t => t.topicId === mapLink.targetTopicId)?.name ?? mapLink.targetTopicId,
        gapScore: gap?.gapScore ?? mapLink.gapScore ?? 0,
        explanation: gap?.explanation ?? gap?.recommendation ?? `Gap between ${normalizedTopics.find(t => t.topicId === mapLink.sourceTopicId)?.name ?? mapLink.sourceTopicId} and ${normalizedTopics.find(t => t.topicId === mapLink.targetTopicId)?.name ?? mapLink.targetTopicId}.`,
        reliability: gap?.reliability,
        severity: gap?.severity ?? mapLink.severity,
        similarityScore: gap?.similarity,
        coOccurrenceCount: gap?.coOccurrence,
      };
    });
  }, [br, gaps, mapLinks, normalizedTopics]);

  const allTopicIds = useMemo(() => {
    return normalizedTopics.map((t) => t.topicId);
  }, [normalizedTopics]);

  const topicLabels = useMemo<TopicLabel[]>(() => {
    return normalizedTopics.map((t, i) => {
      const safeId = t.topicId;
      return {
        key: safeId,
        id: safeId,
        name: t.name,
        color: TOPIC_COLORS[i % TOPIC_COLORS.length],
        paperIds: t.paperIds,
      };
    });
  }, [normalizedTopics]);

  const centroids = useMemo(() => {
    const byTopic = allTopicIds
      .map((id) => getCentroid(id, normalizedPoints))
      .filter((c): c is Centroid => c !== null);

    if (byTopic.length > 0) return byTopic;

    const fallbackCenters = br?.modules?.module5?.map?.topicCenters ?? [];
    return normalizedTopics.map((topic, index) => {
      const fallback = fallbackCenters.find((center: any) => normalizeKey(center.topicId) === normalizeKey(topic.topicId) || normalizeKey(center.name) === normalizeKey(topic.name));
      return {
        x: Number(fallback?.x ?? 120 + (index % 3) * 180),
        y: Number(fallback?.y ?? 120 + Math.floor(index / 3) * 120),
        topicId: topic.topicId,
        topicName: topic.name,
        color: TOPIC_COLORS[index % TOPIC_COLORS.length],
        paperCount: (topic.paperIds || []).length,
      };
    });
  }, [allTopicIds, br, normalizedPoints, normalizedTopics]);

  // Topic halos
  const topicHalos = useMemo(() => {
    return centroids.map((c) => {
      const pts = normalizedPoints.filter((p) => p.topicId === c.topicId);
      const maxDist = Math.max(
        ...pts.map((p) =>
          Math.sqrt((p.x - c.x) ** 2 + (p.y - c.y) ** 2)
        ),
        40
      );
      return { ...c, radius: maxDist + 28 };
    });
  }, [centroids, normalizedPoints]);

  const selectedGapObj = useMemo(() => {
    if (!selectedGap) return null;
    return adaptedGaps.find((g) => g.id === selectedGap) || null;
  }, [selectedGap, adaptedGaps]);

  const hoveredGapObj = useMemo(() => {
    if (!hoveredGap) return null;
    return adaptedGaps.find((g) => g.id === hoveredGap) || null;
  }, [hoveredGap, adaptedGaps]);

  const activeGap = selectedGapObj ?? hoveredGapObj;

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

  const handlePaperClick = (pt: AdaptedPoint) => {
    if (selectedPoint?.paperId === pt.paperId) {
      setSelectedPoint(null);
    } else {
      setSelectedPoint(pt);
      setSelectedGap(null);
    }
  };

  const handleGapClick = (gapId: string) => {
    setSelectedGap((prev) => (prev === gapId ? null : gapId));
    setSelectedPoint(null);
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

  const handleRegenerateMap = async () => {
    try {
      setRegenerating(true);
      setRegenerateError(null);
      if (!backendResult) {
        setRegenerateError('Analysis data is missing');
        return;
      }
      const updated = await regenerateVisualizationWithOllama(backendResult);
      setMapOverride(updated.modules?.module5 ?? null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to regenerate map';
      setRegenerateError(msg);
      console.error('Map regeneration error:', error);
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    const runKey = backendResult?.id || backendResult?.createdAt || null;
    if (!backendResult || !runKey) return;
    if (autoRegeneratedForRef.current === runKey) return;
    if (regenerating || mapPoints.length === 0 || topics.length === 0 || gaps.length === 0) return;

    autoRegeneratedForRef.current = runKey;
    void handleRegenerateMap();
  }, [backendResult, gaps.length, mapPoints.length, regenerating, topics.length]);

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
        <button
          type="button"
          onClick={() => setShowMapGuide((prev) => !prev)}
          className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${showMapGuide ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          title="Explain how to read the research map"
        >
          <i className="ri-information-line text-sm" />
          Info
        </button>
      </div>

      {showMapGuide && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white shrink-0">
              <i className="ri-lightbulb-line text-sm" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">How to analyse this visual map</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Start with the topic centers at the bottom. Each color represents one topic cluster. Papers that sit closer to the same center are more related, while papers farther away are more unique or cross-topic.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Look for dense clusters to identify well-studied areas, isolated dots to find outliers, and dashed red links to spot research gaps between topics. Hover over papers and gap lines to see details.
              </p>
            </div>
          </div>
        </div>
      )}

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
            <span className="w-px h-3 bg-gray-200" />
            <button
              onClick={handleRegenerateMap}
              disabled={regenerating}
              className="px-3 py-1 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              title="Regenerate with AI-powered force-directed layout (like Connected Papers)"
            >
              <i className={`ri-refresh-line ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating...' : 'Regenerate Map'}
            </button>
            {regenerateError && (
              <span className="text-[11px] text-red-500">{regenerateError}</span>
            )}
          </div>
        </div>

        <div className="px-5 pt-4 pb-3 border-b border-gray-100 bg-slate-50/70">
          <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-900 mb-1">How to read this map</p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Each dot is a paper. Dots near the same topic center are more semantically similar.
              Hollow circles show topic clusters, the soft glow shows the cluster area, and dashed red curves
              connect topics with detected gaps or weak overlap. Use hover to inspect paper titles and gap details.
            </p>
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
                  key={`grad-${t.key}`}
                  id={`halo-${t.key}`}
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
                key={`halo-${h.topicId || h.topicName}`}
                cx={h.x}
                cy={h.y}
                r={h.radius}
                fill={`url(#halo-${h.topicId || h.topicName})`}
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
              const strokeColor = gap.severity === 'critical' ? '#e11d48' : gap.severity === 'moderate' ? '#f59e0b' : '#94a3b8';
              const strokeWidth = isHovered ? 2.6 : Math.max(1.2, gap.gapScore * 2.2);
              return (
                <g key={gap.id}>
                  <path
                    d={bezierCurve(ca.x, ca.y, cb.x, cb.y)}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={isHovered ? 'none' : '4 4'}
                    opacity={isDimmed ? 0.12 : isHovered ? 0.9 : Math.max(0.2, gap.gapScore * 0.55)}
                    className="transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredGap(gap.id)}
                    onMouseLeave={() => setHoveredGap(null)}
                    onClick={() => handleGapClick(gap.id)}
                  />
                  {/* Gap midpoint marker */}
                  <circle
                    cx={(ca.x + cb.x) / 2}
                    cy={(ca.y + cb.y) / 2 - 10}
                    r={isHovered ? 5 : 3}
                    fill={strokeColor}
                    opacity={isDimmed ? 0 : isHovered ? 0.95 : Math.max(0.3, gap.gapScore * 0.7)}
                    className="transition-all duration-200"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredGap(gap.id)}
                    onMouseLeave={() => setHoveredGap(null)}
                    onClick={() => handleGapClick(gap.id)}
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
            {normalizedPoints.map((pt, idx) => {
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
                  onClick={() => handlePaperClick(pt)}
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
          {!selectedGapObj && activeGap && (
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

          {(selectedPoint || selectedGapObj) && (
            <div className="absolute top-3 right-3 w-72 bg-white rounded-lg border border-gray-100 p-4 shadow-sm z-10">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold">
                    {selectedPoint ? 'Selected paper' : 'Selected gap'}
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {selectedPoint ? selectedPoint.title : `${selectedGapObj?.topicAName} ↔ ${selectedGapObj?.topicBName}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPoint(null);
                    setSelectedGap(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Close details"
                >
                  <i className="ri-close-line text-lg" />
                </button>
              </div>
              {selectedPoint && (
                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedPoint.color }} />
                    <span>{selectedPoint.topicName}</span>
                  </div>
                  <div className="text-slate-400">Year {selectedPoint.year}</div>
                  <div className="text-slate-500 leading-relaxed">
                    Click another dot to inspect a different paper, or click this dot again to close details.
                  </div>
                </div>
              )}
              {selectedGapObj && (
                <div className="space-y-2 text-[11px] text-slate-600">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: topicLabels.find((t) => t.id === selectedGapObj.topicAId)?.color + '18',
                        color: topicLabels.find((t) => t.id === selectedGapObj.topicAId)?.color,
                      }}
                    >
                      {selectedGapObj.topicAName}
                    </span>
                    <span className="text-[10px] text-slate-400">↔</span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: topicLabels.find((t) => t.id === selectedGapObj.topicBId)?.color + '18',
                        color: topicLabels.find((t) => t.id === selectedGapObj.topicBId)?.color,
                      }}
                    >
                      {selectedGapObj.topicBName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px]">
                    <span>Score {selectedGapObj.gapScore.toFixed(2)}</span>
                    {selectedGapObj.severity && <span>· {selectedGapObj.severity}</span>}
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    {selectedGapObj.explanation}
                  </p>
                </div>
              )}
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
            key={t.key}
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

