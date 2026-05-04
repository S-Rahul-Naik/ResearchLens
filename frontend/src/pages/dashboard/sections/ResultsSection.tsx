import { useRef, useState, useEffect } from 'react';
import type { AnalysisRun } from '../../../hooks/useAnalysisHistory';
import type { BackendPaper, RunAllResult } from '../../../lib/api';
import DatasetSummarySection from './results/DatasetSummarySection';
import TopicModelingSection from './results/TopicModelingSection';
import GapDetectionSection from './results/GapDetectionSection';
import TrendAnalysisSection from './results/TrendAnalysisSection';
import ResearchMapResultsSection from './results/ResearchMapResultsSection';
import ChatResultsSection from './results/ChatResultsSection';
import EvaluationSummarySection from './results/EvaluationSummarySection';
import { useSnapshots } from '../../../hooks/useSnapshots';
import SnapshotsPanel from '../components/SnapshotsPanel';

const NAV_ITEMS = [
  { id: 'result-dataset', label: 'Dataset', icon: 'ri-database-2-line' },
  { id: 'result-topics', label: 'Topics', icon: 'ri-price-tag-3-line' },
  { id: 'result-gaps', label: 'Gaps', icon: 'ri-radar-line' },
  { id: 'result-trends', label: 'Trends', icon: 'ri-line-chart-line' },
  { id: 'result-map', label: 'Map', icon: 'ri-map-2-line' },
  { id: 'result-chat', label: 'Chat', icon: 'ri-chat-3-line' },
  { id: 'result-eval', label: 'Evaluation', icon: 'ri-bar-chart-grouped-line' },
];

const METHODOLOGY_SECTIONS = [
  {
    id: 'tm',
    icon: 'ri-price-tag-3-line',
    color: 'bg-slate-700',
    title: 'Topic Modeling',
    steps: [
      { step: 'Embed', detail: 'Each paper\'s abstract is encoded with a BERT sentence-transformer into a 768-dim vector.' },
      { step: 'Reduce', detail: 'UMAP reduces embeddings to 5 dimensions for clustering stability.' },
      { step: 'Cluster', detail: 'HDBSCAN groups papers into dense topic clusters; outlier papers are reassigned to nearest centroid.' },
      { step: 'Label', detail: 'Top TF-IDF terms per cluster become the topic keywords.' },
    ],
    note: 'Coherence score uses the UMass metric on within-topic paper pairs.',
  },
  {
    id: 'gd',
    icon: 'ri-radar-line',
    color: 'bg-rose-600',
    title: 'Gap Detection',
    steps: [
      { step: 'Similarity', detail: 'Cosine similarity between topic centroid embeddings — high similarity means topics are conceptually close.' },
      { step: 'Co-occurrence', detail: 'Count of papers assigned to both topics simultaneously — low = under-explored bridge.' },
      { step: 'Score', detail: 'gap_score = similarity × 1/(co_occurrence+1) — rewards high similarity AND low co-occurrence.' },
      { step: 'Rank', detail: 'Gaps sorted descending by score; zero co-occurrence gaps flagged as strongest.' },
    ],
    note: 'A gap score ≥ 0.6 is considered high confidence.',
  },
  {
    id: 'ta',
    icon: 'ri-line-chart-line',
    color: 'bg-indigo-600',
    title: 'Trend Analysis',
    steps: [
      { step: 'Bucket', detail: 'Papers binned by publication year; topics with no year data are excluded.' },
      { step: 'Growth', detail: 'Linear regression slope over the last 3 years determines Rising / Stable / Declining label.' },
      { step: 'Annotate', detail: 'First-appearance year and bridging-paper years overlaid as timeline markers.' },
    ],
    note: 'Growth ≥ +15%/yr = Rising; ≤ −10%/yr = Declining.',
  },
  {
    id: 'rm',
    icon: 'ri-map-2-line',
    color: 'bg-teal-600',
    title: 'Research Map',
    steps: [
      { step: 'Project', detail: 'UMAP projects the 768-dim paper embeddings into 2D for visualization.' },
      { step: 'Cluster', detail: 'Each dot is colored by its assigned topic cluster.' },
      { step: 'Centroids', detail: 'Geometric center of each cluster shown as a glowing ring with a label.' },
      { step: 'Gaps', detail: 'Lines drawn between centroids — red = zero co-occurrence, amber = partial gap.' },
    ],
    note: 'Dense dot regions = well-studied; sparse regions = potential gaps.',
  },
  {
    id: 'rag',
    icon: 'ri-chat-3-line',
    color: 'bg-violet-600',
    title: 'RAG Chatbot',
    steps: [
      { step: 'Index', detail: 'Paper chunks stored in a vector index (FAISS) keyed by BERT embedding.' },
      { step: 'Retrieve', detail: 'User query embedded and top-k most similar chunks fetched.' },
      { step: 'Augment', detail: 'Retrieved chunks passed to the LLM as grounding context.' },
      { step: 'Cite', detail: 'Source paper titles and relevance scores attached to each answer.' },
    ],
    note: 'Answers are grounded only in the uploaded papers — no hallucination from world knowledge.',
  },
];

function SaveSnapshotModal({ summary, onSave, onClose }: { summary: { papers: number; topics: number; gaps: number }; onSave: (name: string, notes: string) => void; onClose: () => void }) {
  const [name, setName] = useState(`Analysis ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white rounded-2xl border border-gray-100 w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <i className="ri-bookmark-3-line text-base" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Save Snapshot</p>
            <h3 className="text-base font-bold text-gray-900">Bookmark this analysis</h3>
          </div>
        </div>

        {/* Stats preview */}
        <div className="flex gap-2 mb-5">
          {[
            { label: 'Papers', value: summary.papers, color: 'bg-slate-50 text-slate-700' },
            { label: 'Topics', value: summary.topics, color: 'bg-teal-50 text-teal-700' },
            { label: 'Gaps', value: summary.gaps, color: 'bg-rose-50 text-rose-600' },
          ].map(s => (
            <div key={s.label} className={`flex-1 text-center py-2.5 rounded-xl ${s.color}`}>
              <div className="text-lg font-bold">{s.value}</div>
              <div className="text-[10px]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Snapshot name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 bg-gray-50"
              placeholder="e.g. LLM gap analysis v1"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 200))}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-violet-400 bg-gray-50 resize-none"
              placeholder="Add a note about this analysis state..."
            />
            <p className="text-[10px] text-gray-400 text-right mt-1">{notes.length}/200</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="whitespace-nowrap flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(name, notes)}
            className="whitespace-nowrap flex-1 py-2.5 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <i className="ri-bookmark-3-fill text-sm" />
            Save Snapshot
          </button>
        </div>
      </div>
    </div>
  );
}

function MethodologyPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>('gd');

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/10 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white z-50 flex flex-col transition-transform duration-300 border-l border-gray-100 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <i className="ri-flask-line text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Methodology</p>
              <p className="text-[10px] text-gray-400">How each result was computed</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="whitespace-nowrap w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
          >
            <i className="ri-close-line text-sm" />
          </button>
        </div>

        <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 text-[11px] text-indigo-700 flex items-start gap-2 flex-shrink-0">
          <i className="ri-information-line flex-shrink-0 mt-0.5" />
          <span>Click any section to expand the step-by-step explanation of how that result was produced.</span>
        </div>

        {/* Accordion */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {METHODOLOGY_SECTIONS.map(sec => {
            const isOpen = expanded === sec.id;
            return (
              <div key={sec.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : sec.id)}
                  className="whitespace-nowrap w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                >
                  <div className={`w-6 h-6 flex items-center justify-center rounded-lg ${sec.color} text-white flex-shrink-0`}>
                    <i className={`${sec.icon} text-xs`} />
                  </div>
                  <span className="text-xs font-semibold text-gray-800 flex-1">{sec.title}</span>
                  <i className={`ri-arrow-${isOpen ? 'up' : 'down'}-s-line text-sm text-gray-400`} />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="space-y-2.5 mt-3">
                      {sec.steps.map((s, i) => (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className="w-5 h-5 flex items-center justify-center rounded-full bg-white border border-gray-200 text-[9px] font-bold text-gray-500 flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-gray-800">{s.step}</p>
                            <p className="text-[11px] text-gray-600 leading-relaxed">{s.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-[10px] text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 leading-relaxed">
                        <i className="ri-lightbulb-line mr-1" />
                        {sec.note}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function scrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) {
    const offset = 80;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

function buildPrintHTML(backendResult?: RunAllResult | null): string {
  const topics = backendResult?.modules.module2.topics ?? [];
  const summaries = backendResult?.modules.module1.summaries ?? [];
  const gaps = backendResult?.modules.module3.gaps ?? [];

  const topicsRows = topics
    .map(t => {
      const trendEntry = backendResult?.modules.module4.trends.find(tr => tr.topicId === t.topicId);
      const paperCount = t.paperIds.length;
      return `<tr><td>${t.name}</td><td>${t.keywords.slice(0, 4).join(', ')}</td><td>${paperCount}</td><td>${(t.coherence * 100).toFixed(0)}%</td><td>${trendEntry?.trend ?? 'stable'}</td></tr>`;
    })
    .join('');

  const gapsRows = [...gaps]
    .sort((a, b) => b.gapScore - a.gapScore)
    .map((g, i) => `<tr><td>#${i + 1}</td><td>${g.topicALabel}</td><td>${g.topicBLabel}</td><td>${g.similarity.toFixed(2)}</td><td>${g.coOccurrence}</td><td>${g.gapScore.toFixed(3)}</td></tr>`)
    .join('');

  const papersCount = backendResult?.papersCount ?? 0;
  const yearRange = backendResult
    ? { start: Math.min(...backendResult.modules.module4.trends.flatMap(t => t.yearlyCounts.map(yc => yc.year))), end: Math.max(...backendResult.modules.module4.trends.flatMap(t => t.yearlyCounts.map(yc => yc.year))) }
    : { start: new Date().getFullYear(), end: new Date().getFullYear() };
  const qualityScore = backendResult
    ? (() => {
        const totalTopics = topics.length;
        const totalGaps = gaps.length;
        const avgCoherence = totalTopics > 0 ? topics.reduce((sum, t) => sum + t.coherence, 0) / totalTopics : 0;
        const coverage = papersCount > 0 ? Math.min(1, topics.reduce((sum, t) => sum + t.paperIds.length, 0) / papersCount) : 0;
        const novelty = totalGaps > 0 ? Math.min(1, gaps.reduce((sum, g) => sum + g.gapScore, 0) / totalGaps) : 0;
        return (avgCoherence * 0.4 + coverage * 0.3 + novelty * 0.3);
      })()
    : 0;
  const highConfidenceGaps = gaps.filter(g => g.gapScore > 0.5).length;
  const topicCoherence = topics.length > 0 ? topics.reduce((sum, t) => sum + t.coherence, 0) / topics.length : 0;
  const topicCoverage = papersCount > 0 ? Math.min(1, topics.reduce((sum, t) => sum + t.paperIds.length, 0) / papersCount) : 0;
  const gapNovelty = gaps.length > 0 ? Math.min(1, gaps.reduce((sum, g) => sum + g.gapScore, 0) / gaps.length) : 0;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>ResearchLens Analysis Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 48px; font-size: 13px; line-height: 1.6; }
  .header { border-bottom: 3px solid #0d9488; padding-bottom: 24px; margin-bottom: 36px; }
  .header h1 { font-size: 28px; font-weight: 800; color: #0d9488; margin-bottom: 6px; }
  .header p { color: #6b7280; font-size: 13px; }
  .stat-row { display: flex; gap: 20px; margin-bottom: 36px; }
  .stat-card { flex: 1; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; text-align: center; background: #f9fafb; }
  .stat-card .val { font-size: 26px; font-weight: 800; color: #0d9488; }
  .stat-card .lbl { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px; }
  .section { margin-bottom: 40px; }
  .section-title { font-size: 17px; font-weight: 700; color: #1f2937; border-left: 4px solid #0d9488; padding-left: 12px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; font-weight: 700; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 8px 12px; text-align: left; }
  td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; color: #374151; }
  tr:last-child td { border-bottom: none; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; }
  .badge-rose { background: #fee2e2; color: #b91c1c; }
  .badge-teal { background: #ccfbf1; color: #0f766e; }
  .quality-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
  .quality-item { flex: 1; min-width: 180px; }
  .quality-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; display: flex; justify-content: space-between; }
  .quality-bar { height: 6px; background: #e5e7eb; border-radius: 9999px; overflow: hidden; }
  .quality-fill { height: 100%; background: #0d9488; border-radius: 9999px; }
  .gap-formula { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; font-family: monospace; font-size: 12px; color: #374151; margin-bottom: 16px; }
  .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 40px; text-align: center; color: #9ca3af; font-size: 11px; }
  @media print { body { padding: 32px; } }
</style>
</head>
<body>
<div class="header">
  <h1>ResearchLens — Analysis Report</h1>
  <p>Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;|&nbsp; Dataset: ${papersCount} papers &nbsp;|&nbsp; ${yearRange.start}–${yearRange.end}</p>
</div>

<div class="stat-row">
  <div class="stat-card"><div class="val">${papersCount}</div><div class="lbl">Papers</div></div>
  <div class="stat-card"><div class="val">${topics.length}</div><div class="lbl">Topics</div></div>
  <div class="stat-card"><div class="val">${gaps.length}</div><div class="lbl">Gaps Found</div></div>
  <div class="stat-card"><div class="val">${highConfidenceGaps}</div><div class="lbl">High-Confidence Gaps</div></div>
  <div class="stat-card"><div class="val">${(qualityScore * 100).toFixed(0)}%</div><div class="lbl">Model Quality</div></div>
</div>

<div class="section">
  <div class="section-title">Model Quality Metrics</div>
  <div class="quality-row">
    ${[
      { label: 'Topic Coherence', val: topicCoherence },
      { label: 'Topic Coverage', val: topicCoverage },
      { label: 'Gap Novelty', val: gapNovelty },
      { label: 'Overall Quality', val: qualityScore },
    ].map(m => `<div class="quality-item">
      <div class="quality-label"><span>${m.label}</span><span>${(m.val * 100).toFixed(0)}%</span></div>
      <div class="quality-bar"><div class="quality-fill" style="width:${m.val * 100}%"></div></div>
    </div>`).join('')}
  </div>
</div>

<div class="section">
  <div class="section-title">Topic Modeling Results</div>
  <table>
    <thead><tr><th>Topic Name</th><th>Top Keywords</th><th>Papers</th><th>Coherence</th><th>Trend</th></tr></thead>
    <tbody>${topicsRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Gap Detection Results</div>
  <div class="gap-formula">gap_score = similarity × 1 / (co_occurrence + 1) &nbsp;·&nbsp; Higher score = stronger gap</div>
  <table>
    <thead><tr><th>Rank</th><th>Topic A</th><th>Topic B</th><th>Similarity</th><th>Co-occurrence</th><th>Gap Score</th></tr></thead>
    <tbody>${gapsRows}</tbody>
  </table>
</div>

<div class="footer">
  Generated by ResearchLens &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
</div>

<script>window.onload = () => { setTimeout(() => window.print(), 400); }<\/script>
</body>
</html>`;
}

// ── Share Report helpers ──────────────────────────────────────────────────────
function buildTextSummary(backendResult?: RunAllResult | null): string {
  const topics = backendResult?.modules.module2.topics ?? [];
  const gaps = [...(backendResult?.modules.module3.gaps ?? [])].sort((a, b) => b.gapScore - a.gapScore);
  const top3Gaps = gaps.slice(0, 3);
  const risingTopics = backendResult?.modules.module4.trends.filter(t => t.trend === 'rising') ?? [];
  const papers = backendResult?.papersCount ?? 0;
  const yearRange = backendResult
    ? { start: Math.min(...backendResult.modules.module4.trends.flatMap(t => t.yearlyCounts.map(yc => yc.year))), end: Math.max(...backendResult.modules.module4.trends.flatMap(t => t.yearlyCounts.map(yc => yc.year))) }
    : { start: new Date().getFullYear(), end: new Date().getFullYear() };
  const modelQuality = backendResult
    ? (() => {
        const totalTopics = topics.length;
        const totalGaps = gaps.length;
        const avgCoherence = totalTopics > 0 ? topics.reduce((sum, t) => sum + t.coherence, 0) / totalTopics : 0;
        const coverage = papers > 0 ? Math.min(1, topics.reduce((sum, t) => sum + t.paperIds.length, 0) / papers) : 0;
        const novelty = totalGaps > 0 ? Math.min(1, gaps.reduce((sum, g) => sum + g.gapScore, 0) / totalGaps) : 0;
        return avgCoherence * 0.4 + coverage * 0.3 + novelty * 0.3;
      })()
    : 0;

  return [
    '=== ResearchLens — Analysis Report Summary ===',
    `Generated: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    '── DATASET ─────────────────────────────────',
    `Papers Analysed : ${papers}`,
    `Topics Detected : ${topics.length}`,
    `Gaps Identified : ${gaps.length}`,
    `Year Range      : ${yearRange.start} – ${yearRange.end}`,
    `Model Quality   : ${(modelQuality * 100).toFixed(0)}%`,
    '',
    '── TOP RESEARCH GAPS ───────────────────────',
    ...top3Gaps.map((g, i) =>
      `#${i + 1}  ${g.topicALabel}  ↔  ${g.topicBLabel}\n     Score: ${g.gapScore.toFixed(3)}  |  Similarity: ${g.similarity.toFixed(2)}  |  Co-occurrence: ${g.coOccurrence}`
    ),
    '',
    '── RISING TOPICS ───────────────────────────',
    ...risingTopics.map(t => `• ${t.topicName} (${t.yearlyCounts.length} years)`),
    '',
    '── ALL DETECTED TOPICS ─────────────────────',
    ...topics.map(t => `• ${t.name}  [${t.keywords.slice(0, 4).join(', ')}]`),
    '',
    '─────────────────────────────────────────────',
    'Full interactive report: ResearchLens Dashboard',
  ].join('\n');
}

function generateShareId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function ShareDropdown({ backendResult, onClose }: { backendResult?: RunAllResult | null; onClose: () => void }) {
  const [textCopied, setTextCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareId] = useState(() => generateShareId());
  const shareUrl = `https://researchlens.app/report/${shareId}`;

  const copyText = async () => {
    await navigator.clipboard.writeText(buildTextSummary(backendResult));
    setTextCopied(true);
    setTimeout(() => { setTextCopied(false); onClose(); }, 1800);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    setTimeout(() => { setLinkCopied(false); onClose(); }, 1800);
  };

  return (
    <div className="absolute top-full right-0 mt-1.5 z-50 w-72 bg-white rounded-xl border border-gray-100 py-2 overflow-hidden" style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }}>
      <div className="px-4 py-2 border-b border-gray-50 mb-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Share Analysis Report</p>
      </div>

      {/* Copy text summary */}
      <button
        onClick={copyText}
        className="whitespace-nowrap w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
      >
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5 ${textCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
          <i className={`${textCopied ? 'ri-check-line' : 'ri-file-copy-line'} text-sm`} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800">{textCopied ? 'Copied to clipboard!' : 'Copy Text Summary'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Formatted key findings — paste into Slack, email, or docs</p>
        </div>
      </button>

      {/* Copy share link */}
      <button
        onClick={copyLink}
        className="whitespace-nowrap w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
      >
        <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 mt-0.5 ${linkCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-teal-50 text-teal-600'}`}>
          <i className={`${linkCopied ? 'ri-check-line' : 'ri-link-m'} text-sm`} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-800">{linkCopied ? 'Link copied!' : 'Copy Share Link'}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">{shareUrl}</p>
        </div>
      </button>

      <div className="mx-4 mt-1 pt-2 border-t border-gray-50">
        <p className="text-[9px] text-gray-300 leading-relaxed">Anyone with the link can view a read-only snapshot of this analysis report.</p>
      </div>
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function ResultsSection({ onClose, run }: { onClose?: () => void; run?: AnalysisRun | null }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const backendResult = run?.backendResult ?? null;
  const papers = run?.backendPapers ?? [];
  const { addSnapshot } = useSnapshots();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);
  const [snapshotsPanelOpen, setSnapshotsPanelOpen] = useState(false);
  const [shareDropdownOpen, setShareDropdownOpen] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  // Close share dropdown on outside click
  useEffect(() => {
    if (!shareDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [shareDropdownOpen]);

  const handlePrint = () => {
    const html = buildPrintHTML(backendResult);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  };

  const handleSaveSnapshot = (name: string, notes: string) => {
    addSnapshot(name, {
      papers: run?.papers ?? 0,
      topics: run?.topics ?? 0,
      gaps: run?.gaps ?? 0,
      yearRange: run?.yearRange ?? { start: new Date().getFullYear(), end: new Date().getFullYear() },
    }, notes);
    setSaveModalOpen(false);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 3000);
  };

  return (
    <div className="min-h-full bg-[#f8f9fb]">
      {/* Sticky section nav */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100" style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.05)' }}>
        <div className="max-w-5xl mx-auto px-8 flex items-center gap-0 h-12">
          {/* Back button — only shown when opened as overlay */}
          {onClose && (
            <button
              onClick={onClose}
              className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer mr-2 flex-shrink-0"
            >
              <i className="ri-arrow-left-line text-sm" />
              Back
            </button>
          )}

          {/* Title chip */}
          <div className="flex items-center gap-2 mr-4 flex-shrink-0">
            <div className="w-5 h-5 flex items-center justify-center rounded bg-teal-600 text-white">
              <i className="ri-file-chart-line text-[11px]" />
            </div>
            <span className="text-xs font-bold text-gray-800">Analysis Report</span>
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-0 flex-1 overflow-x-auto">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                <i className={`${item.icon} text-[11px]`} />
                {item.label}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Methodology toggle */}
            <button
              onClick={() => setMethodologyOpen(true)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${methodologyOpen ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'border-gray-200 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}`}
            >
              <i className="ri-flask-line text-xs" />
              Methodology
            </button>

            {/* Save Snapshot */}
            <button
              onClick={() => setSaveModalOpen(true)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${savedFeedback ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'border-gray-200 text-gray-500 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200'}`}
            >
              {savedFeedback ? (
                <><i className="ri-check-line text-xs" />Saved!</>
              ) : (
                <><i className="ri-bookmark-3-line text-xs" />Save Snapshot</>
              )}
            </button>

            {/* Snapshots list */}
            <button
              onClick={() => setSnapshotsPanelOpen(true)}
              title="View all snapshots"
              className="whitespace-nowrap w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:text-violet-600 hover:bg-violet-50 hover:border-violet-200 transition-colors cursor-pointer"
            >
              <i className="ri-bookmark-2-line text-xs" />
            </button>

            {/* Share Report */}
            <div ref={shareRef} className="relative">
              <button
                onClick={() => setShareDropdownOpen(prev => !prev)}
                className={`whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${shareDropdownOpen ? 'bg-teal-50 text-teal-700 border-teal-200' : 'border-gray-200 text-gray-500 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200'}`}
              >
                <i className="ri-share-line text-xs" />
                Share
                <i className={`ri-arrow-${shareDropdownOpen ? 'up' : 'down'}-s-line text-xs`} />
              </button>
              {shareDropdownOpen && <ShareDropdown backendResult={backendResult} onClose={() => setShareDropdownOpen(false)} />}
            </div>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <i className="ri-printer-line text-xs" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Page header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">ResearchLens · Research Analysis Report</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Analysis Results</h1>
              <p className="text-sm text-gray-500">
                Processed <strong className="text-gray-700">{run?.papers ?? 0} papers</strong> &middot;
                Detected <strong className="text-gray-700">{run?.topics ?? 0} topics</strong> &middot;
                Found <strong className="text-gray-700">{run?.gaps ?? 0} research gaps</strong> &middot;
                {(run?.yearRange ?? { start: new Date().getFullYear(), end: new Date().getFullYear() }).start}–{(run?.yearRange ?? { start: new Date().getFullYear(), end: new Date().getFullYear() }).end}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-emerald-700">{((run?.qualityScore ?? 0) * 100).toFixed(0)}%</div>
                <div className="text-[10px] text-emerald-600 font-medium">Quality Score</div>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-center">
                <div className="text-lg font-bold text-rose-700">{run?.gaps ?? 0}</div>
                <div className="text-[10px] text-rose-600 font-medium">Key Gaps</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef} className="max-w-5xl mx-auto px-8 py-10">
        <DatasetSummarySection run={run} />
        <TopicModelingSection backendResult={backendResult} />
        <GapDetectionSection backendResult={backendResult} />
        <TrendAnalysisSection backendResult={backendResult} />
        <ResearchMapResultsSection backendResult={backendResult} />
        <ChatResultsSection backendResult={backendResult} papers={papers} />
        <EvaluationSummarySection backendResult={backendResult} />

        {/* Footer stamp */}
        <div className="text-center py-8 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Generated by <strong className="text-gray-600">ResearchLens</strong> &middot; {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Modals & Panels */}
      {saveModalOpen && (
        <SaveSnapshotModal
          summary={{
            papers: run?.papers ?? 0,
            topics: run?.topics ?? 0,
            gaps: run?.gaps ?? 0,
          }}
          onSave={handleSaveSnapshot}
          onClose={() => setSaveModalOpen(false)}
        />
      )}
      <MethodologyPanel open={methodologyOpen} onClose={() => setMethodologyOpen(false)} />
      <SnapshotsPanel open={snapshotsPanelOpen} onClose={() => setSnapshotsPanelOpen(false)} />
    </div>
  );
}
