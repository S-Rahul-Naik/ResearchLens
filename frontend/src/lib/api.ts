// Centralised API client for ResearchLens backend
// Set VITE_API_BASE_URL in .env.local to override the default.

const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';

// ─── Auth Types ───────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinedAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

// ─── Token helpers ────────────────────────────────────────

const TOKEN_KEY = 'rl_token';
let onUnauthorized: (() => void) | null = null;

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// ─── Types ────────────────────────────────────────────────

export interface BackendPaper {
  id: string;
  title: string;
  authors: string[];
  year: number;
  abstract: string;
  content?: string;
}

export interface RunAllPayload {
  papers: BackendPaper[];
  question?: string;
  reportName?: string;
}

export interface TopicResult {
  topicId: string;
  name: string;
  keywords: string[];
  paperIds: string[];
  coherence: number;
  // LLM-enhanced fields
  llm_label?: string;
  llm_domain_summary?: string;
  llm_methodological_theme?: string;
  llm_paradigm?: string;
  llm_confidence?: number;
  heuristic_label?: string;
}

export interface GapResult {
  gapId: string;
  topicA: string;
  topicB: string;
  topicALabel: string;
  topicBLabel: string;
  similarity: number;
  temporalDistance?: number | null;
  citationDivergence?: number | null;
  citationAvailable?: boolean;
  bibliographicDivergence?: number;
  methodologyContrast?: number | null;
  taskOverlap?: number | null;
  architectureDistance?: number | null;
  crossDomainRarity?: number;
  coOccurrence: number;
  coOccurrenceScarcity?: number;
  gapScore: number;
  severity: 'low' | 'moderate' | 'critical';
  evidencePaperIds: string[];
  evidenceSnippets?: { paperId: string; title: string; snippet: string; role?: string; relevance?: number }[];
  recommendation: string;
  explanation?: string;
  confidence?: number;
  reliability?: number;
  scoreComponents?: {
    semanticSimilarity: number;
    temporalDistance?: number | null;
    citationDivergence?: number | null;
    methodologyContrast?: number | null;
    taskOverlap?: number | null;
    architectureDistance?: number | null;
    crossDomainRarity: number;
    coOccurrenceScarcity: number;
  };
  // LLM-enhanced fields
  llm_is_gap?: boolean;
  llm_gap_explanation?: string;
  llm_gap_significance?: string;
  llm_integration_opportunity?: string;
  llm_gap_confidence?: number;
  llm_verified_bridging_papers?: Array<{
    title: string;
    llm_is_bridging?: boolean;
    llm_bridging_evidence?: string;
    llm_bridging_confidence?: number;
  }>;
}

export interface MapLinkResult {
  sourceTopicId: string;
  targetTopicId: string;
  gapScore: number;
  severity: 'low' | 'moderate' | 'critical';
  reliability?: number;
  coOccurrence?: number;
  explanation?: string;
}

export interface MapResult {
  module: string;
  map: {
    points: PointResult[];
    topicCenters: { topicId: string; name: string; x: number; y: number }[];
    links: MapLinkResult[];
  };
}

export interface TrendResult {
  topicId: string;
  topicName: string;
  yearlyCounts: { year: number; count: number }[];
  slope: number;
  trend: 'rising' | 'stable' | 'declining' | 'insufficient_data';
  movingAverage?: { year: number; count: number }[];
  normalizedCounts?: { year: number; value: number }[];
  yearOverYearChanges?: { year: number; change: number }[];
  insufficientData?: boolean;
  trendMessage?: string;
  paperCount?: number;
  uniqueYears?: number;
  dataDensity?: number;
  temporalConfidence?: number;
  reliability?: number;
  confidenceInterval?: [number, number];
  temporalEmbedding?: number[];
  yearlyCoverage?: number;
  llm_trend_summary?: string;
  llm_paradigm_shifts?: string[];
  llm_reliability_explanation?: string;
  llm_confidence?: number;
}

export interface ScientificHonestyResult {
  module: string;
  honestyScore: number;
  reliability: number;
  scoreBreakdown: {
    topicConfidence: number;
    topicLabelConfidence: number;
    gapReliability: number;
    trendReliability: number;
    coverage: number;
    gapEvidenceCoverage: number;
    citationAvailability: number;
    trendSufficiency: number;
    mapSupport: number;
  };
  caveats: string[];
  warningCount: number;
  inspected: {
    paperCount: number;
    topicCount: number;
    gapCount: number;
    trendCount: number;
    insufficientTrendCount: number;
  };
  summary: string;
}

export interface PointResult {
  paperId: string;
  title: string;
  topicId: string;
  x: number;
  y: number;
  keywords: string[];
}

export interface ChatbotResult {
  module: string;
  answer: string;
  citations: { paperId: string; title: string; chunkId: string; snippet?: string; relevance: number }[];
  gapEvidences?: { gapId: string | null; evidences: { paperId: string; title: string; snippet: string }[] }[];
}

export interface ContradictionResult {
  contradictionId: string;
  topicId: string;
  topicName: string;
  claimA: { paperId: string; title: string; sentence: string };
  claimB: { paperId: string; title: string; sentence: string };
  similarity: number;
  confidence: number;
}

export interface MatrixResult {
  module: string;
  datasets: string[];
  methods: string[];
  rows: { paperId: string; title: string; datasets: string[]; methods: string[] }[];
  matrix: { paperId: string; title: string; datasets: Record<string, boolean>; methods: Record<string, boolean> }[];
}

export interface RelatedWorkSection {
  topicId: string;
  heading: string;
  paragraph: string;
}

export interface AnalysisReportResult {
  report_title?: string;
  executive_summary?: string;
  key_findings?: string[];
  top_topics?: string[];
  top_gaps?: string[];
  trend_insights?: string[];
  scientific_honesty?: string;
  report_markdown?: string;
  confidence?: number;
}

export interface RunAllResult {
  id: string;
  createdAt: string;
  papersCount: number;
  modulesInOrder: { moduleId: number; name: string; result: unknown }[];
  analysisReport?: AnalysisReportResult;
  modules: {
    module1: { module: string; count: number; summaries: { paperId: string; title: string; summary: string; keywords: string[] }[] };
    module2: { module: string; topics: TopicResult[]; assignments: { paperId: string; topicId: string }[] };
    module3: { module: string; formula: string; gaps: GapResult[] };
    module4: { module: string; trends: TrendResult[] };
    module5: MapResult;
    module6: ChatbotResult;
    module7: { module: string; contradictions: ContradictionResult[] };
    module8: MatrixResult;
    module9: { module: string; sections: RelatedWorkSection[]; draftMarkdown: string };
    module10: ScientificHonestyResult;
  };
}

function extractApiError(text: string, fallback: string): string {
  let msg = text;
  try {
    msg = (JSON.parse(text) as { error?: string }).error ?? text;
  } catch {
    // Ignore JSON parse errors and use raw text message.
  }
  return msg || fallback;
}

function handleUnauthorized(status: number): void {
  if (status !== 401) return;
  clearToken();
  if (onUnauthorized) onUnauthorized();
}

function unwrapSingleItemArray<T>(value: T | T[]): T | T[] {
  return Array.isArray(value) && value.length === 1 ? value[0] : value;
}

export function normalizeRunAllResult(raw: unknown): RunAllResult {
  const value = unwrapSingleItemArray(raw as RunAllResult | RunAllResult[] | null | undefined) as any;
  const modules = value?.modules ?? value ?? {};
  const module2Topics = Array.isArray(modules?.module2?.topics) ? modules.module2.topics : [];
  const normalizedTopics = module2Topics.map((topic: any, index: number) => ({
    ...topic,
    topicId: String(topic.topicId || topic.id || topic.name || `topic_${index + 1}`),
    name: topic.name || topic.topicName || `Topic ${index + 1}`,
  }));
  const topicNameById = new Map(normalizedTopics.map((topic: any) => [String(topic.topicId), topic.name]));
  const topicIdByName = new Map(normalizedTopics.map((topic: any) => [String(topic.name).toLowerCase(), topic.topicId]));
  const topicIdByPaperId = new Map<string, string>();
  normalizedTopics.forEach((topic: any) => {
    (Array.isArray(topic.paperIds) ? topic.paperIds : []).forEach((paperId: string) => {
      topicIdByPaperId.set(String(paperId), topic.topicId);
    });
  });
  const normalizeTrendEntry = (trend: any, index: number) => {
    if (!trend || typeof trend !== 'object') return trend;
    const topicId = String(trend.topicId || trend.id || `topic_${index + 1}`);
    const topicName = trend.topicName || trend.topic || trend.name || topicNameById.get(topicId) || topicNameById.get(topicId.replace(/^topic[-_]?/, 'topic_')) || `Topic ${index + 1}`;
    return {
      ...trend,
      topicId,
      topic: trend.topic || topicName,
      topicName,
    };
  };
  const normalizeMapPoint = (point: any, index: number) => {
    if (!point || typeof point !== 'object') return point;
    const topicId = String(
      point.topicId ||
      topicIdByPaperId.get(String(point.paperId)) ||
      topicIdByName.get(String(point.topicName || '').toLowerCase()) ||
      point.topicName ||
      `topic_${index + 1}`
    );
    return {
      ...point,
      topicId,
      topicName: point.topicName || topicNameById.get(topicId) || point.topicName || topicId,
    };
  };
  const normalizeTopicCenter = (center: any, index: number) => {
    if (!center || typeof center !== 'object') return center;
    const topicId = String(
      center.topicId ||
      topicIdByName.get(String(center.name || center.topicName || '').toLowerCase()) ||
      center.name ||
      `topic_${index + 1}`
    );
    return {
      ...center,
      topicId,
      name: center.name || topicNameById.get(topicId) || center.topicName || topicId,
    };
  };

  const hashCode = (input: string) => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const summariesByPaperId = new Map<string, string>();
  if (Array.isArray(modules?.module1?.summaries)) {
    modules.module1.summaries.forEach((summary: any) => {
      if (!summary) return;
      const paperId = String(summary.paperId || summary.id || '');
      const title = String(summary.title || summary.paper?.title || '').trim();
      if (paperId) summariesByPaperId.set(paperId, title || `Paper ${paperId}`);
    });
  }

  const generatedTopicCenters = normalizedTopics.map((topic: any, index: number) => {
    const total = Math.max(1, normalizedTopics.length);
    const theta = (2 * Math.PI * index) / total;
    return {
      topicId: topic.topicId,
      name: topic.name,
      x: Math.cos(theta) * 0.7,
      y: Math.sin(theta) * 0.7,
    };
  });

  const centerByTopicId = new Map(generatedTopicCenters.map((center) => [String(center.topicId), center]));
  const generatedPoints = normalizedTopics.flatMap((topic: any, topicIndex: number) => {
    const paperIds: string[] = Array.isArray(topic.paperIds) ? topic.paperIds.map((id: unknown) => String(id)) : [];
    const baseCenter = centerByTopicId.get(String(topic.topicId)) || generatedTopicCenters[topicIndex] || { x: 0, y: 0 };
    const total = Math.max(1, paperIds.length);
    return paperIds.map((paperId: string, index: number) => {
      const seed = hashCode(`${topic.topicId}-${paperId}`);
      const angle = ((2 * Math.PI * index) / total) + ((seed % 360) * Math.PI / 1800);
      const radius = 0.14 + ((seed % 40) / 1000) + ((index % 3) * 0.02);
      return {
        paperId,
        title: summariesByPaperId.get(paperId) || `Paper ${paperId}`,
        topicId: String(topic.topicId),
        topicName: topic.name,
        x: baseCenter.x + (Math.cos(angle) * radius),
        y: baseCenter.y + (Math.sin(angle) * radius),
        keywords: [],
      };
    });
  });

  const generatedLinks = Array.isArray(modules?.module3?.gaps)
    ? modules.module3.gaps.map((gap: any) => ({
        sourceTopicId: String(gap.topicA || ''),
        targetTopicId: String(gap.topicB || ''),
        gapScore: Number(gap.gapScore || 0),
        severity: gap.severity || 'moderate',
        reliability: typeof gap.reliability === 'number' ? gap.reliability : undefined,
        coOccurrence: typeof gap.coOccurrence === 'number' ? gap.coOccurrence : undefined,
        explanation: gap.explanation || gap.recommendation,
      })).filter((link: any) => link.sourceTopicId && link.targetTopicId)
    : [];

  const rawMap = modules?.module5?.map ?? {};
  const rawPoints = Array.isArray(rawMap?.points) ? rawMap.points : [];
  const rawCenters = Array.isArray(rawMap?.topicCenters) ? rawMap.topicCenters : [];
  const rawLinks = Array.isArray(rawMap?.links) ? rawMap.links : [];
  const effectivePoints = rawPoints.length > 0 ? rawPoints : generatedPoints;
  const effectiveCenters = rawCenters.length > 0 ? rawCenters : generatedTopicCenters;
  const effectiveLinks = rawLinks.length > 0 ? rawLinks : generatedLinks;

  return {
    id: value?.id ?? `run_${Date.now()}`,
    createdAt: value?.createdAt ?? new Date().toISOString(),
    papersCount: Number(value?.papersCount ?? 0),
    modulesInOrder: Array.isArray(value?.modulesInOrder) ? value.modulesInOrder : [],
    analysisReport: value?.analysisReport,
    modules: {
      module1: modules.module1 ?? { module: 'module1-summarization', count: 0, summaries: [] },
      module2: modules.module2 ?? { module: 'module2-topic-modeling', topics: [], assignments: [] },
      module3: modules.module3 ?? { module: 'module3-gap-detection', formula: '', gaps: [] },
      module4: {
        ...(modules.module4 ?? { module: 'module4-trend-detection', trends: [] }),
        trends: Array.isArray(modules?.module4?.trends)
          ? modules.module4.trends.map((trend: any, index: number) => normalizeTrendEntry(trend, index))
          : Array.isArray(modules?.module4?.module4_trends)
            ? modules.module4.module4_trends.map((trend: any, index: number) => normalizeTrendEntry(trend, index))
            : [],
      },
      module5: {
        ...(modules.module5 ?? { module: 'module5-visualization', map: { points: [], topicCenters: [], links: [] } }),
        map: {
          ...(modules?.module5?.map ?? { points: [], topicCenters: [], links: [] }),
          points: effectivePoints.map((point: any, index: number) => normalizeMapPoint(point, index)),
          topicCenters: effectiveCenters.map((center: any, index: number) => normalizeTopicCenter(center, index)),
          links: effectiveLinks,
        },
      },
      module6: modules.module6 ?? { module: 'module6-chatbot', answer: '', citations: [] },
      module7: modules.module7 ?? { module: 'module7-contradiction-detection', contradictions: [] },
      module8: modules.module8 ?? { module: 'module8-dataset-method-matrix', datasets: [], methods: [], rows: [], matrix: [] },
      module9: modules.module9 ?? { module: 'module9-related-work-draft', sections: [], draftMarkdown: '' },
      module10: modules.module10 ?? { module: 'module10-scientific-honesty', honestyScore: 0, reliability: 0, scoreBreakdown: { topicConfidence: 0, topicLabelConfidence: 0, gapReliability: 0, trendReliability: 0, coverage: 0, gapEvidenceCoverage: 0, citationAvailability: 0, trendSufficiency: 0, mapSupport: 0 }, caveats: [], warningCount: 0, inspected: { paperCount: 0, topicCount: 0, gapCount: 0, trendCount: 0, insufficientTrendCount: 0 }, summary: '' },
    },
  };
}

// ─── Requests ─────────────────────────────────────────────

async function post<T>(path: string, body: unknown, auth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    handleUnauthorized(response.status);
    throw new Error(extractApiError(text, `Request failed (${response.status})`));
  }

  return response.json() as Promise<T>;
}

async function get<T>(path: string, auth = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (auth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE}${path}`, { headers });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    handleUnauthorized(response.status);
    throw new Error(extractApiError(text, `Request failed (${response.status})`));
  }
  return response.json() as Promise<T>;
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    handleUnauthorized(response.status);
    throw new Error(extractApiError(text, `Request failed (${response.status})`));
  }
  return response.json() as Promise<T>;
}

async function del<T>(path: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    handleUnauthorized(response.status);
    throw new Error(extractApiError(text, `Request failed (${response.status})`));
  }
  return response.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────

export async function apiSignup(name: string, email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/api/auth/signup', { name, email, password });
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return post<AuthResponse>('/api/auth/login', { email, password });
}

export async function apiGetMe(): Promise<{ user: AuthUser }> {
  return get<{ user: AuthUser }>('/api/auth/me', true);
}

export async function apiUpdateProfile(name: string): Promise<{ user: AuthUser }> {
  return patch<{ user: AuthUser }>('/api/auth/profile', { name });
}

export async function apiUpdatePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  return patch<AuthResponse>('/api/auth/password', { currentPassword, newPassword });
}

export async function apiUploadAvatar(file: File): Promise<{ user: AuthUser }> {
  const token = getToken();
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await fetch(`${BASE}/api/auth/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    handleUnauthorized(response.status);
    throw new Error(extractApiError(text, `Request failed (${response.status})`));
  }
  return response.json() as Promise<{ user: AuthUser }>;
}

// ─── Public API ───────────────────────────────────────────

export async function apiGetCorpus(): Promise<{ count: number; papers: BackendPaper[] }> {
  return get<{ count: number; papers: BackendPaper[] }>('/api/corpus', true);
}

export async function apiGetUserUploads(): Promise<{ count: number; papers: BackendPaper[] }> {
  return get<{ count: number; papers: BackendPaper[] }>('/api/corpus/user-uploads', true);
}

export async function setCorpus(papers: BackendPaper[]) {
  return post<{ count: number; papers: BackendPaper[] }>('/api/corpus', { papers });
}

export async function apiUploadPdfs(files: File[]): Promise<{ count: number; papers: BackendPaper[] }> {
  const token = getToken();
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const response = await fetch(`${BASE}/api/corpus/upload-pdfs`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    handleUnauthorized(response.status);
    throw new Error(extractApiError(text, `PDF upload failed (${response.status})`));
  }
  return response.json() as Promise<{ count: number; papers: BackendPaper[] }>;
}

export async function apiDeletePapers(paperIds: string[]): Promise<{ success: boolean; deletedCount: number; message: string }> {
  return del<{ success: boolean; deletedCount: number; message: string }>('/api/corpus/papers', { paperIds });
}

export async function runAllModules(payload: RunAllPayload): Promise<RunAllResult> {
  const result = await post<RunAllResult>('/api/modules/run-all', payload, true);
  return normalizeRunAllResult(result);
}

export async function quickAnalysisModules(payload: RunAllPayload): Promise<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }> {
  return post<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }>('/api/modules/quick-analysis', payload, true);
}

export async function n8nAnalysisModules(payload: RunAllPayload): Promise<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }> {
  const startTime = Date.now();
  
  // Get userId from session/auth if available, or use 'anonymous'
  const userId = localStorage.getItem('userId') || 'anonymous';
  
  // Transform RunAllPayload to N8NWebhookPayload
  const n8nPayload: N8NWebhookPayload = {
    userId,
    reportName: payload.reportName || `Analysis Report — ${new Date().toLocaleDateString()}`,
    papers: payload.papers,
    question: payload.question || 'What are the key findings, research gaps and emerging topics?',
  };
  
  try {
    // Call backend which will invoke n8n, process the 4 outputs, store them, and return the run
    const run = await post<{
      id: string;
      createdAt: string;
      papersCount: number;
      analysisReport: AnalysisReportResult;
      reportId: string;
      processingTimeMs: number;
    }>('/api/modules/n8n-analysis', n8nPayload, true);
    return run;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'N8N analysis failed';
    throw new Error(`N8N Analysis Error: ${errorMessage}`);
  }
}

export async function apiGetAnalysisReports(): Promise<{ count: number; reports: RunAllResult[] }> {
  return get<{ count: number; reports: RunAllResult[] }>('/api/reports', true);
}

export async function apiGetAnalysisReport(reportId: string): Promise<RunAllResult> {
  return get<RunAllResult>(`/api/reports/${reportId}`, true);
}

export async function askChatbot(papers: BackendPaper[], question: string): Promise<ChatbotResult> {
  return post<ChatbotResult>('/api/modules/6-chatbot', { papers, question });
}

/**
 * Ask a question about the analysis using n8n payload as RAG context
 * Much faster and more accurate than paper-based RAG
 */
export async function askAboutAnalysis(question: string, backendResult: RunAllResult | null): Promise<ChatbotResult> {
  if (!backendResult) {
    throw new Error('Analysis result is required');
  }
  return post<ChatbotResult>('/api/chat/ask-about-analysis', { question, backendResult });
}

/**
 * Regenerate the research map with Ollama-enhanced force-directed layout
 * Similar to Connected Papers visualization
 */
export async function regenerateVisualizationWithOllama(backendResult: RunAllResult | null): Promise<RunAllResult> {
  if (!backendResult?.modules?.module2?.topics || !backendResult?.modules?.module3?.gaps) {
    throw new Error('Complete analysis data is required (topics and gaps)');
  }

  const papers = backendResult.papers || [];
  const topics = backendResult.modules.module2.topics;
  const gaps = backendResult.modules.module3.gaps;

  const result = await post<any>('/api/visualization/regenerate-with-ollama', { papers, topics, gaps });

  // Merge the new map into the backend result
  return {
    ...backendResult,
    modules: {
      ...backendResult.modules,
      module5: result,
    },
  };
}

// ─── N8N Webhook Integration ──────────────────────────────────

export interface N8NWebhookPayload {
  userId: string;
  reportName: string;
  papers: BackendPaper[];
  question?: string;
}

export interface N8NWebhookResponse {
  success: boolean;
  reportId: string;
  message: string;
  run?: RunAllResult;
}

/**
 * Trigger N8N webhook directly from the frontend
 * This POSTs to the N8N webhook URL configured in your environment
 */
export async function triggerN8NWebhook(payload: N8NWebhookPayload): Promise<any> {
  const n8nWebhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined;
  if (!n8nWebhookUrl) {
    throw new Error('N8N webhook URL not configured. Set VITE_N8N_WEBHOOK_URL in .env.local');
  }
  
  const response = await fetch(n8nWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(extractApiError(text, `N8N webhook failed (${response.status})`));
  }
  
  // N8N responds with the merged result JSON from the workflow
  return normalizeRunAllResult(await response.json());
}

