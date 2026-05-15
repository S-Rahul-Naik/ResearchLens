import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { type Paper } from '../../../mocks/papers';
import PaperDetailModal from './datasets/PaperDetailModal';
import ProcessingPipeline from './datasets/ProcessingPipeline';
import { logExport } from '../../../hooks/useExportHistory';
import type { AnalysisRun } from '../../../hooks/useAnalysisHistory';
import type { RunAllResult, BackendPaper, TopicResult, GapResult } from '../../../lib/api';
import { apiUploadPdfs, apiGetUserUploads, apiDeletePapers } from '../../../lib/api';

const statusColors: Record<Paper['status'], string> = {
  processed: 'bg-green-50 text-green-700',
  pending: 'bg-gray-50 text-gray-500',
  processing: 'bg-amber-50 text-amber-700',
  error: 'bg-rose-50 text-rose-600',
};

const statusIcons: Record<Paper['status'], string> = {
  processed: 'ri-checkbox-circle-line',
  pending: 'ri-time-line',
  processing: 'ri-loader-4-line',
  error: 'ri-error-warning-line',
};

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

/* ─── Report Generators ─────────────────────────────────── */
function buildReportData(
  papers: Paper[],
  processedCount: number,
  avgGapScore: string,
  topics: TopicResult[],
  gaps: GapResult[],
  getTopicName: (topicId: string) => string,
) {
  const safeNumber = (value: unknown, fallback = 0): number => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  return {
    generatedAt: new Date().toISOString(),
    metadata: {
      totalPapers: papers.length,
      processedPapers: processedCount,
      totalTopics: topics.length,
      totalGaps: gaps.length,
      avgGapScore: Number(avgGapScore),
    },
    gaps: gaps.map((g, idx) => ({
      rank: idx + 1,
      topicA: g.topicALabel || getTopicName(g.topicA || ''),
      topicB: g.topicBLabel || getTopicName(g.topicB || ''),
      similarityScore: safeNumber(g.similarity),
      coOccurrenceCount: g.coOccurrence ?? (g as any).coOccurrenceCount ?? 0,
      gapScore: g.gapScore ?? (g as any).gapScore ?? 0,
      topicAKeywords: (g as any).topicAKeywords ?? [],
      topicBKeywords: (g as any).topicBKeywords ?? [],
      explanation: (g as any).explanation ?? '',
    })),
    topics: topics.map((t) => ({
      name: t.name,
      keywords: t.keywords,
      papersCount: t.paperIds?.length || 0,
      coherenceScore: t.coherence || 0,
      trend: (t as any).trend ?? 'stable',
    })),
    papers: papers.map((p) => ({
      title: p.title,
      authors: p.authors,
      year: p.year,
      status: p.status,
      topics: p.topics.map((tid) => getTopicName(tid)),
    })),
  };
}

function generatePrintHTML(papers: Paper[], processedCount: number, avgGapScore: string, topics: TopicResult[], gaps: GapResult[], getTopicName: (topicId: string) => string): string {
  const safeNumber = (value: unknown, fallback = 0): number => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const rows = gaps
    .map((g, idx) =>
      `<tr>
          <td>${idx + 1}</td>
          <td>${g.topicALabel || getTopicName(g.topicA || '')}</td>
          <td>${g.topicBLabel || getTopicName(g.topicB || '')}</td>
          <td>${safeNumber(g.similarity).toFixed(2)}</td>
          <td>${g.coOccurrence ?? (g as any).coOccurrenceCount ?? 0}</td>
          <td><strong>${safeNumber(g.gapScore).toFixed(3)}</strong></td>
        </tr>`
    )
    .join('');

  const topicRows = topics
    .map((t) => `<tr><td>${t.name}</td><td>${t.paperIds?.length || 0}</td><td>${((t.coherence || 0) * 100).toFixed(0)}%</td><td>${(t as any).trend ?? 'stable'}</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>ResearchLens Gap Analysis Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; color: #0f766e; }
    .meta { font-size: 11px; color: #888; margin-bottom: 24px; }
    h2 { font-size: 14px; font-weight: 700; margin: 24px 0 10px; color: #111; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .stats { display: flex; gap: 24px; margin-bottom: 20px; }
    .stat { background: #f0fdf4; border: 1px solid #d1fae5; border-radius: 8px; padding: 12px 20px; }
    .stat .val { font-size: 22px; font-weight: 800; color: #0f766e; }
    .stat .lbl { font-size: 10px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { background: #f9fafb; text-align: left; padding: 7px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; }
    tr:last-child td { border-bottom: none; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>ResearchLens — Gap Analysis Report</h1>
  <div class="meta">Generated ${new Date().toLocaleString()} · ResearchLens v1.0</div>

    <div class="stats">
    <div class="stat"><div class="val">${processedCount}</div><div class="lbl">Total Papers</div></div>
    <div class="stat"><div class="val">${topics.length}</div><div class="lbl">Topics</div></div>
    <div class="stat"><div class="val">${gaps.length}</div><div class="lbl">Gaps Detected</div></div>
    <div class="stat"><div class="val">${avgGapScore}</div><div class="lbl">Avg Gap Score</div></div>
  </div>

  <h2>Detected Research Gaps</h2>
  <table>
    <thead><tr><th>#</th><th>Topic A</th><th>Topic B</th><th>Similarity</th><th>Co-occ</th><th>Gap Score</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <h2>Topic Summary</h2>
  <table>
    <thead><tr><th>Topic</th><th>Papers</th><th>Coherence</th><th>Trend</th></tr></thead>
    <tbody>${topicRows}</tbody>
  </table>
</body>
</html>`;
}

/* ─── Bulk export helpers ────────────────────────────────── */
function bulkExportJSON(papers: Paper[], getTopicName: (topicId: string) => string) {
  const data = papers.map(p => ({
    id: p.id, title: p.title, authors: p.authors, year: p.year,
    abstract: p.abstract, keywords: p.keywords, status: p.status,
    topics: p.topics.map(tid => getTopicName(tid)),
    uploadDate: p.uploadDate,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `researchlens-papers-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  logExport({ type: 'JSON', label: `${papers.length} selected paper${papers.length !== 1 ? 's' : ''}`, itemCount: papers.length, section: 'Datasets' });
}

function bulkExportCSV(papers: Paper[], getTopicName: (topicId: string) => string) {
  const header = ['ID', 'Title', 'Authors', 'Year', 'Status', 'Topics', 'Keywords', 'Upload Date'];
  const rows = papers.map(p => [
    p.id,
    `"${p.title.replace(/"/g, '""')}"`,
    `"${p.authors.join('; ')}"`,
    p.year,
    p.status,
    `"${p.topics.map(tid => getTopicName(tid)).join('; ')}"`,
    `"${p.keywords.join('; ')}"`,
    p.uploadDate,
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `researchlens-papers-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  logExport({ type: 'CSV', label: `${papers.length} selected paper${papers.length !== 1 ? 's' : ''}`, itemCount: papers.length, section: 'Datasets' });
}

/* ─── Main Component ─────────────────────────────────────── */
interface DatasetsSectionProps {
  onShowResults?: (run: Omit<AnalysisRun, 'id' | 'timestamp'>) => void;
}

export default function DatasetsSection({ onShowResults }: DatasetsSectionProps) {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [processDone, setProcessDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isSyncingCorpus, setIsSyncingCorpus] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showResults, setShowResults] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showPipeline, setShowPipeline] = useState(false);
  const [processingPaperIds, setProcessingPaperIds] = useState<Set<string>>(new Set());
  const [selectedAnalysisType, setSelectedAnalysisType] = useState<'quick' | 'full' | 'n8n'>('n8n');
  const [latestRunData, setLatestRunData] = useState<(Omit<AnalysisRun, 'id' | 'timestamp'>) | null>(null);
  const [runName, setRunName] = useState('');
  const [processedTopics, setProcessedTopics] = useState<TopicResult[]>([]);
  const [processedGaps, setProcessedGaps] = useState<GapResult[]>([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const resultsRef = useRef<HTMLDivElement>(null);
  const downloadBtnRef = useRef<HTMLDivElement>(null);

  const [sortCol, setSortCol] = useState<'year' | 'status' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);
  const bulkMenuRef = useRef<HTMLDivElement>(null);

  const allYears = useMemo(
    () => Array.from(new Set(papers.map((p) => p.year))).sort((a, b) => b - a),
    [papers]
  );

  const normalizeBackendPaper = useCallback((paper: Partial<Paper> & { content?: string }, index: number): Paper => {
    const topics = Array.isArray(paper.topics) ? paper.topics : [];
    const keywords = Array.isArray(paper.keywords) && paper.keywords.length
      ? paper.keywords
      : (paper.abstract || paper.content || '')
          .split(/\s+/)
          .map((word) => word.toLowerCase().replace(/[^a-z0-9-]/g, ''))
          .filter(Boolean)
          .slice(0, 8);

    return {
      id: paper.id || `uploaded-${Date.now()}-${index + 1}`,
      title: paper.title || `Untitled Paper ${index + 1}`,
      authors: Array.isArray(paper.authors) ? paper.authors : [],
      year: Number(paper.year) || new Date().getFullYear(),
      abstract: paper.abstract || paper.content || '',
      topics,
      keywords,
      status: (paper.status as Paper['status']) || 'pending',
      uploadDate: new Date().toISOString().split('T')[0],
    };
  }, []);

  // Load user's uploaded papers on mount (not base corpus)
  useEffect(() => {
    apiGetUserUploads()
      .then(({ papers: userPapers }) => {
        if (userPapers.length > 0) {
          const normalized = userPapers.map((p, i) => normalizeBackendPaper(p, i));
          setPapers(normalized);
        }
      })
      .catch(() => {
        // silently ignore — user may not be logged in yet
      });
  }, [normalizeBackendPaper]);

  const syncCorpusToBackend = useCallback(async (payload: Paper[]) => {
    setIsSyncingCorpus(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/corpus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          papers: payload.map((paper) => ({
            id: paper.id,
            title: paper.title,
            authors: paper.authors,
            year: paper.year,
            abstract: paper.abstract,
            content: paper.abstract,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Corpus sync failed with status ${response.status}`);
      }
      return true;
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Failed to sync corpus to backend');
      return false;
    } finally {
      setIsSyncingCorpus(false);
    }
  }, []);

  const loadJsonToCorpus = useCallback(async (file: File) => {
    setUploadMessage(null);
    setIsSyncingCorpus(true);

    try {
      const form = new FormData();
      form.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/corpus/upload-json`, {
        method: 'POST',
        body: form,
      });

      if (!response.ok) {
        throw new Error(`JSON upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const uploaded = Array.isArray(data?.papers) ? data.papers : [];
      const nextPapers = uploaded.map((paper: Partial<Paper>, index: number) => normalizeBackendPaper(paper, index));

      setPapers(nextPapers);
      setProcessDone(false);
      setShowResults(false);
      setSelected(new Set());
      setRunName('');
      setUploadMessage(`Loaded ${nextPapers.length} papers from JSON and synced to backend.`);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Failed to upload JSON file');
    } finally {
      setIsSyncingCorpus(false);
    }
  }, [normalizeBackendPaper]);

  const addPdfFilesToTable = useCallback(async (files: File[]) => {
    if (!files.length) return;

    const today = new Date().toISOString().split('T')[0];

    // Show uploading state immediately so user gets feedback
    const uploading: Paper[] = files.map((file, index) => ({
      id: `pdf-uploading-${Date.now()}-${index}`,
      title: file.name.replace(/\.pdf$/i, ''),
      authors: ['Extracting…'],
      year: new Date().getFullYear(),
      abstract: 'Parsing PDF content…',
      topics: [],
      keywords: [],
      status: 'processing' as Paper['status'],
      uploadDate: today,
    }));

    setPapers((prev) => [...uploading, ...prev]);
    setUploadMessage(`Parsing ${files.length} PDF file${files.length > 1 ? 's' : ''}…`);

    try {
      const result = await apiUploadPdfs(files);
      const parsed: Paper[] = result.papers.map((bp) => ({
        id: bp.id ?? `pdf-${Date.now()}-${Math.random()}`,
        title: bp.title,
        authors: bp.authors ?? ['Unknown'],
        year: bp.year ?? new Date().getFullYear(),
        abstract: bp.abstract ?? '',
        topics: [],
        keywords: [],
        status: 'pending' as Paper['status'],
        uploadDate: today,
      }));
      // Replace the uploading placeholders with real data
      setPapers((prev) => [...parsed, ...prev.filter((p) => !p.id.startsWith('pdf-uploading-'))]);
      setProcessDone(false);
      setShowResults(false);
      setUploadMessage(`Added ${parsed.length} PDF file${parsed.length > 1 ? 's' : ''} to dataset.`);
    } catch (err) {
      // Remove placeholders on failure
      setPapers((prev) => prev.filter((p) => !p.id.startsWith('pdf-uploading-')));
      setUploadMessage(`PDF parsing failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, []);

  const handleFileSelection = useCallback(async (filesList: FileList | null) => {
    if (!filesList?.length) return;

    const files = Array.from(filesList);
    const jsonFiles = files.filter((file) => file.name.toLowerCase().endsWith('.json'));
    const pdfFiles = files.filter((file) => file.name.toLowerCase().endsWith('.pdf'));

    if (jsonFiles.length) {
      await loadJsonToCorpus(jsonFiles[0]);
    }
    if (pdfFiles.length) {
      await addPdfFilesToTable(pdfFiles);
    }
    if (!jsonFiles.length && !pdfFiles.length) {
      setUploadMessage('Please upload a JSON corpus file or PDF files.');
    }
  }, [addPdfFilesToTable, loadJsonToCorpus]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleProcess = async () => {
    setUploadMessage(null);
    
    // Check if papers are selected
    if (selected.size === 0) {
      setUploadMessage('Please select papers to process.');
      return;
    }

    // Process only selected papers
    const selectedPapers = papers.filter(p => selected.has(p.id));
    setProcessingPaperIds(new Set(selected));
    const ok = await syncCorpusToBackend(selectedPapers);
    if (!ok) return;
    // Skip dialog - directly use N8N analysis
    setSelectedAnalysisType('n8n' as any);
    setShowPipeline(true);
  };

  const handleAnalysisTypeChoice = (type: 'quick' | 'full') => {
    setSelectedAnalysisType(type);
    setShowPipeline(true);
  };

  const handlePipelineComplete = useCallback((backendResult: RunAllResult | null) => {
    setShowPipeline(false);
    const topics = backendResult?.modules?.module2?.topics ?? [];
    const gaps = backendResult?.modules?.module3?.gaps ?? [];
    const assignments = backendResult?.modules?.module2?.assignments ?? [];
    // Build paperId -> topicId[] map from backend assignments
    const paperTopicMap = new Map<string, string[]>();
    assignments.forEach(({ paperId, topicId }) => {
      const existing = paperTopicMap.get(paperId) ?? [];
      paperTopicMap.set(paperId, [...existing, topicId]);
    });
    // Only update papers that were selected for processing
    const processed = papers.map(p => {
      if (processingPaperIds.has(p.id)) {
        return {
          ...p,
          status: 'processed' as Paper['status'],
          topics: paperTopicMap.get(p.id) ?? p.topics,
        };
      }
      return p;
    });
    setProcessedTopics(topics);
    setProcessedGaps(gaps);
    setPapers(processed);
    setProcessDone(true);
    setShowResults(true);
    setSelected(new Set());

    // Build run data from the backend result only using selected papers
    const selectedPapersOnly = processed.filter(p => processingPaperIds.has(p.id));
    const topTopics = topics.slice(0, 3).map(t => t.name);
    const topGap = gaps.length
      ? `${gaps[0].topicALabel} ↔ ${gaps[0].topicBLabel}`
      : 'No gaps detected';

    const years = selectedPapersOnly.map(p => p.year);
    const yearRange = years.length
      ? { start: Math.min(...years), end: Math.max(...years) }
      : { start: new Date().getFullYear(), end: new Date().getFullYear() };

    const avgCoherence = topics.length
      ? topics.reduce((sum, t) => sum + t.coherence, 0) / topics.length
      : 0;

    const elapsedMs = backendResult
      ? Math.max(0, Date.now() - new Date(backendResult.createdAt).getTime())
      : 0;

    const paperList: BackendPaper[] = selectedPapersOnly.map(p => ({
      id: p.id,
      title: p.title,
      authors: Array.isArray(p.authors) ? p.authors : [],
      year: Number(p.year) || 0,
      abstract: String(p.abstract || ''),
    }));
    const runData: Omit<AnalysisRun, 'id' | 'timestamp'> = {
      name: runName.trim() || `Analysis Run — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      papers: selectedPapersOnly.length,
      topics: topics.length,
      gaps: gaps.length,
      yearRange,
      topTopics,
      topGap,
      qualityScore: Number(avgCoherence.toFixed(2)),
      processingTime: `${(elapsedMs / 1000).toFixed(1)}s`,
      backendResult,
      backendPapers: paperList,
    };
    if (onShowResults) onShowResults(runData);
    setLatestRunData(runData);
  }, [papers, runName, onShowResults, processingPaperIds]);

  const handlePipelineCancel = useCallback(() => {
    setShowPipeline(false);
  }, []);

  useEffect(() => {
    if (showResults && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [showResults]);

  // Close download menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (downloadBtnRef.current && !downloadBtnRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close bulk menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target as Node)) setBulkMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDeletePapers = async () => {
    const idsToDelete = Array.from(selected);
    try {
      setUploadMessage(null);
      await apiDeletePapers(idsToDelete);
      // Remove from local state after successful deletion
      setPapers((prev) => prev.filter((p) => !selected.has(p.id)));
      setSelected(new Set());
      setUploadMessage(`Successfully deleted ${idsToDelete.length} paper${idsToDelete.length !== 1 ? 's' : ''}.`);
    } catch (err) {
      setUploadMessage(`Failed to delete papers: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const processedCount = papers.filter((p) => p.status === 'processed').length;
  const avgGapScore = processedGaps.length
    ? (processedGaps.reduce((sum, g) => sum + (Number.isFinite(g.gapScore) ? g.gapScore : 0), 0) / processedGaps.length).toFixed(2)
    : '0.00';

  const getTopicName = (topicId: string) => processedTopics.find((t) => t.topicId === topicId)?.name ?? processedTopics.find((t: any) => t.topicId === topicId)?.name ?? topicId;

  // Filtered + sorted papers
  const filteredPapers = useMemo(() => {
    let result = papers.filter(p => {
      const matchTitle = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authors.join(' ').toLowerCase().includes(searchQuery.toLowerCase());
      const matchYear = filterYear === 'all' || p.year === Number(filterYear);
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      return matchTitle && matchYear && matchStatus;
    });
    if (sortCol === 'year') {
      result = [...result].sort((a, b) => sortDir === 'asc' ? a.year - b.year : b.year - a.year);
    } else if (sortCol === 'status') {
      const order: Record<Paper['status'], number> = { processed: 0, processing: 1, pending: 2, error: 3 };
      result = [...result].sort((a, b) => sortDir === 'asc' ? order[a.status] - order[b.status] : order[b.status] - order[a.status]);
    }
    return result;
  }, [papers, searchQuery, filterYear, filterStatus, sortCol, sortDir]);

  const hasActiveFilter = searchQuery !== '' || filterYear !== 'all' || filterStatus !== 'all';

  // Download handlers
  const handleDownloadJSON = () => {
    const processedPapers = papers.filter(p => processingPaperIds.has(p.id));
    const data = buildReportData(processedPapers, processedCount, avgGapScore, processedTopics, processedGaps, getTopicName);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `researchlens-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logExport({ type: 'JSON', label: 'Full gap analysis report', itemCount: processedGaps.length, section: 'Datasets' });
    setShowDownloadMenu(false);
  };

  const handleDownloadPDF = () => {
    const processedPapers = papers.filter(p => processingPaperIds.has(p.id));
    const rawHtml = generatePrintHTML(processedPapers, processedCount, avgGapScore, processedTopics, processedGaps, getTopicName);
    // Inject auto-print script into <head> so it fires after the page loads from blob URL
    const html = rawHtml.replace('</head>', '<script>window.onload=function(){window.print()}<\/script></head>');
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) win.focus();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    logExport({ type: 'PDF', label: 'Gap analysis printable report', itemCount: processedGaps.length, section: 'Datasets' });
    setShowDownloadMenu(false);
  };

  const resultStats = [
    { icon: 'ri-file-text-line', label: 'Papers Analyzed', value: processedCount, color: 'text-teal-600', bg: 'bg-teal-50' },
    { icon: 'ri-price-tag-3-line', label: 'Topics Extracted', value: processedTopics.length, color: 'text-violet-600', bg: 'bg-violet-50' },
    { icon: 'ri-git-branch-line', label: 'Gaps Detected', value: processedGaps.length, color: 'text-amber-600', bg: 'bg-amber-50' },
    { icon: 'ri-bar-chart-line', label: 'Avg Gap Score', value: avgGapScore, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const toggleSort = (col: 'year' | 'status') => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const SortIcon = ({ col }: { col: 'year' | 'status' }) => (
    <i className={`ml-1 text-[10px] ${sortCol === col ? 'text-teal-600' : 'text-gray-300'} ${sortCol === col && sortDir === 'desc' ? 'ri-arrow-down-line' : 'ri-arrow-up-line'}`} />
  );

  const selectedPapersList = papers.filter(p => selected.has(p.id));

  return (
    <div className="p-8 space-y-6">
      {/* Upload Zone */}
      <div
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={async (e) => {
          e.preventDefault();
          setDragOver(false);
          await handleFileSelection(e.dataTransfer.files);
        }}
      >
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mx-auto mb-4">
          <i className="ri-upload-cloud-2-line text-2xl" />
        </div>
        <h3 className="text-base font-semibold text-gray-800 mb-1">Upload research papers</h3>
        <p className="text-sm text-gray-400 mb-4">Drag and drop JSON/PDF files, or click to browse</p>
        <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f766e] text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-[#0d6b62] transition-colors">
          <i className="ri-file-add-line" />
          Choose Files
          <input
            type="file"
            accept=".json,.pdf"
            multiple
            className="hidden"
            onChange={(e) => void handleFileSelection(e.target.files)}
          />
        </label>
        <p className="text-xs text-gray-300 mt-3">Supports JSON corpus and PDF files up to 50MB each</p>
      </div>

      {uploadMessage && (
        <div className={`rounded-xl border px-4 py-3 text-xs ${uploadMessage.toLowerCase().includes('failed') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-teal-200 bg-teal-50 text-teal-700'}`}>
          {uploadMessage}
        </div>
      )}

      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-6 py-4">
        <div>
          <div className="text-sm font-semibold text-gray-800">{selected.size} papers in dataset</div>
          <div className="text-xs text-gray-400 mt-0.5">
            {Array.from(selected).map(id => papers.find(p => p.id === id)).filter(p => p?.status === 'processed').length} processed ·{' '}
            {Array.from(selected).map(id => papers.find(p => p.id === id)).filter(p => p?.status === 'pending').length} pending
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {/* Run name input */}
          <div className="relative">
            <i className="ri-price-tag-3-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
            <input
              type="text"
              value={runName}
              onChange={e => setRunName(e.target.value)}
              placeholder="Name this run (optional)"
              className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors w-52 placeholder:text-gray-400"
            />
          </div>
          {processDone && (
            <>
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <i className="ri-checkbox-circle-fill" /> Processing complete
              </span>
              <button
                onClick={() => {
                  setPapers((prev) => prev.map((paper) => ({ ...paper, status: 'pending' as Paper['status'] })));
                  setProcessDone(false);
                  setShowResults(false);
                  setLatestRunData(null);
                  setRunName('');
                  setSelected(new Set());
                }}
                className="whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-600 text-xs font-medium rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <i className="ri-restart-line" />
                New Analysis
              </button>
            </>
          )}
          <button
            onClick={handleProcess}
            disabled={isSyncingCorpus || papers.length === 0}
            className="whitespace-nowrap flex items-center gap-2 px-5 py-2.5 bg-[#0f766e] disabled:bg-teal-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg hover:bg-[#0d6b62] transition-colors cursor-pointer"
          >
            <i className={`${isSyncingCorpus ? 'ri-loader-4-line animate-spin' : 'ri-cpu-line'}`} />
            {isSyncingCorpus ? 'Syncing Corpus...' : 'Process Papers'}
          </button>
        </div>
      </div>

      {/* Results Summary Panel */}
      {showResults && (
        <div
          ref={resultsRef}
          className="bg-white rounded-2xl border border-teal-100 overflow-hidden"
          style={{ animation: 'fadeInUp 0.4s ease both' }}
        >
          {/* Header */}
          <div className="px-6 py-4 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-600 text-white">
                <i className="ri-checkbox-circle-line text-sm" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Processing Results</h3>
                <p className="text-xs text-gray-500">Analysis completed successfully</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Download Report Button */}
              <div className="relative" ref={downloadBtnRef}>
                <button
                  onClick={() => setShowDownloadMenu((v) => !v)}
                  className="whitespace-nowrap flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <i className="ri-download-2-line" />
                  Download Report
                  <i className={`ri-arrow-down-s-line transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} />
                </button>
                {showDownloadMenu && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-100 overflow-hidden z-20"
                    style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
                  >
                    <button
                      onClick={handleDownloadJSON}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded-md bg-amber-50 text-amber-600 shrink-0">
                        <i className="ri-braces-line text-sm" />
                      </div>
                      <div>
                        <div className="font-medium">Export JSON</div>
                        <div className="text-[10px] text-gray-400">Full structured data</div>
                      </div>
                    </button>
                    <div className="h-px bg-gray-100 mx-3" />
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                    >
                      <div className="w-6 h-6 flex items-center justify-center rounded-md bg-rose-50 text-rose-600 shrink-0">
                        <i className="ri-file-pdf-2-line text-sm" />
                      </div>
                      <div>
                        <div className="font-medium">Export PDF</div>
                        <div className="text-[10px] text-gray-400">Printable report</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-gray-100">
            {resultStats.map((stat) => (
              <div key={stat.label} className="bg-white px-6 py-5">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${stat.bg} ${stat.color}`}>
                    <i className={`${stat.icon} text-sm`} />
                  </div>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Top Gaps Preview */}
          <div className="px-6 py-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top Detected Gaps</p>
            <div className="space-y-2">
              {processedGaps.slice(0, 3).map((gap, idx) => (
                <div key={gap.gapId} className="flex items-center gap-3">
                  <span className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{gap.topicALabel} × {gap.topicBLabel}</p>
                    <p className="text-xs text-gray-400">Similarity: {(Number.isFinite(gap.similarity) ? gap.similarity : 0).toFixed(2)} · Co-occ: {gap.coOccurrence ?? 0}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-20 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-teal-500 transition-all duration-700"
                        style={{ width: `${Math.min(Number.isFinite(gap.gapScore) ? gap.gapScore : 0, 1) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-teal-700">{(Number.isFinite(gap.gapScore) ? gap.gapScore : 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <div className="px-6 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Processing complete — click to explore the full interactive report</p>
            <button
              onClick={() => latestRunData && onShowResults && onShowResults(latestRunData)}
              className="whitespace-nowrap flex items-center gap-1.5 px-4 py-2 bg-[#0f766e] text-white text-xs font-medium rounded-lg hover:bg-[#0d6b62] transition-colors cursor-pointer"
            >
              <i className="ri-file-chart-line" />
              View Full Results
              <i className="ri-arrow-right-line" />
            </button>
          </div>
        </div>
      )}

      {/* Papers Table */}
      {papers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <i className="ri-file-upload-line text-4xl text-gray-300 mb-4 block" />
          <p className="text-lg font-semibold text-gray-600 mb-2">No papers uploaded yet</p>
          <p className="text-sm text-gray-400 mb-6">Upload research papers above to get started</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {/* Table Header + Filters */}
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">
                Select below papers to process
                {hasActiveFilter && (
                  <span className="ml-2 text-xs font-normal text-teal-600">
                    {filteredPapers.length} of {papers.length} shown
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-2">
                {hasActiveFilter && (
                  <button
                    onClick={() => { setSearchQuery(''); setFilterYear('all'); setFilterStatus('all'); }}
                    className="whitespace-nowrap text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <i className="ri-refresh-line" /> Reset
                  </button>
                )}
                {selected.size > 0 && (
                  <div className="flex items-center gap-2">
                    {/* Bulk Export dropdown */}
                    <div className="relative" ref={bulkMenuRef}>
                      <button onClick={() => setBulkMenuOpen(v => !v)} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors cursor-pointer">
                        <i className="ri-download-2-line" />
                        Export {selected.size} selected
                        <i className={`ri-arrow-down-s-line transition-transform ${bulkMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {bulkMenuOpen && (
                        <div className="absolute right-0 top-full mt-1.5 z-20 w-44 bg-white rounded-xl border border-gray-100 py-1" style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                          <button onClick={() => { bulkExportJSON(selectedPapersList, getTopicName); setBulkMenuOpen(false); }} className="whitespace-nowrap w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <i className="ri-braces-line text-amber-500" /> Export as JSON
                          </button>
                          <button onClick={() => { bulkExportCSV(selectedPapersList, getTopicName); setBulkMenuOpen(false); }} className="whitespace-nowrap w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                            <i className="ri-table-line text-teal-500" /> Export as CSV
                          </button>
                        </div>
                      )}
                    </div>
                    <button onClick={handleDeletePapers} className="whitespace-nowrap text-xs text-rose-500 hover:underline cursor-pointer">
                      Delete {selected.size}
                    </button>
                  </div>
                )}
              </div>
            </div>

          {/* Filter Row */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Search */}
            <div className="relative flex-1">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by title or author..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-teal-400 focus:bg-white transition-colors placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <i className="ri-close-circle-line text-sm" />
                </button>
              )}
            </div>

            {/* Year Filter */}
            <div className="relative">
              <i className="ri-calendar-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-teal-400 appearance-none cursor-pointer text-gray-700"
              >
                <option value="all">All Years</option>
                {allYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm" />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <i className="ri-filter-3-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-8 pr-7 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-teal-400 appearance-none cursor-pointer text-gray-700"
              >
                <option value="all">All Status</option>
                <option value="processed">Processed</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="error">Error</option>
              </select>
              <i className="ri-arrow-down-s-line absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-sm" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="w-10 py-3 px-4 text-left">
                  <input
                    type="checkbox"
                    className="rounded"
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(filteredPapers.map((p) => p.id)));
                      else setSelected(new Set());
                    }}
                  />
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Authors</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell cursor-pointer select-none hover:text-gray-800 transition-colors" onClick={() => toggleSort('year')}>
                  Year <SortIcon col="year" />
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Topics</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 transition-colors" onClick={() => toggleSort('status')}>
                  Status <SortIcon col="status" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPapers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-gray-400">
                    <i className="ri-file-search-line text-2xl text-gray-300 block mb-2" />
                    No papers match your filters.{' '}
                    <button
                      onClick={() => { setSearchQuery(''); setFilterYear('all'); setFilterStatus('all'); }}
                      className="text-teal-600 hover:underline cursor-pointer"
                    >
                      Reset filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredPapers.map((paper) => (
                  <tr
                    key={paper.id}
                    className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]')) return;
                      setSelectedPaper(paper);
                    }}
                  >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(paper.id)}
                        onChange={() => toggleSelect(paper.id)}
                        className="rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-gray-800 line-clamp-1 max-w-xs">{paper.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{paper.uploadDate}</p>
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell">
                      <p className="text-xs text-gray-600 truncate max-w-[160px]">
                        {paper.authors.slice(0, 2).join(', ')}
                        {paper.authors.length > 2 ? ` +${paper.authors.length - 2}` : ''}
                      </p>
                    </td>
                    <td className="py-3 px-4 hidden lg:table-cell text-sm text-gray-600">{paper.year}</td>
                    <td className="py-3 px-4 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {paper.topics.slice(0, 2).map((tid) => (
                          <span key={tid} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">
                            {getTopicName(tid)}
                          </span>
                        ))}
                        {paper.topics.length > 2 && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-400 text-[10px] rounded">
                            +{paper.topics.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[paper.status]}`}>
                        <i className={`${statusIcons[paper.status]} text-xs ${paper.status === 'processing' ? 'animate-spin' : ''}`} />
                        {paper.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredPapers.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400">Click any row to view paper details · Click Year or Status to sort</span>
            <span className="text-xs text-gray-400">{filteredPapers.length} result{filteredPapers.length !== 1 ? 's' : ''}</span>
          </div>
        )}
        </div>
      )}

      {/* Paper Detail Modal */}
      <PaperDetailModal
        paper={selectedPaper}
        onClose={() => setSelectedPaper(null)}
        realTopics={processedTopics}
        realGaps={processedGaps}
      />

      {/* Processing Pipeline Modal */}
      {showPipeline && (
        <ProcessingPipeline
          papers={papers.filter(p => processingPaperIds.has(p.id))}
          runName={runName.trim() || undefined}
          analysisType={selectedAnalysisType}
          onComplete={handlePipelineComplete}
          onCancel={handlePipelineCancel}
        />
      )}
    </div>
  );
}
