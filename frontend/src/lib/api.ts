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
  return post<RunAllResult>('/api/modules/run-all', payload, true);
}

export async function quickAnalysisModules(payload: RunAllPayload): Promise<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }> {
  return post<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }>('/api/modules/quick-analysis', payload, true);
}

export async function n8nAnalysisModules(payload: RunAllPayload): Promise<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }> {
  return post<{ id: string; createdAt: string; papersCount: number; analysisReport: AnalysisReportResult; reportId: string; processingTimeMs: number }>('/api/modules/n8n-analysis', payload, true);
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

