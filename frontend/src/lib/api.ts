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
}

export interface TopicResult {
  topicId: string;
  name: string;
  keywords: string[];
  paperIds: string[];
  coherence: number;
}

export interface GapResult {
  gapId: string;
  topicA: string;
  topicB: string;
  topicALabel: string;
  topicBLabel: string;
  similarity: number;
  coOccurrence: number;
  gapScore: number;
  severity: 'low' | 'moderate' | 'critical';
  evidencePaperIds: string[];
  recommendation: string;
}

export interface TrendResult {
  topicId: string;
  topicName: string;
  yearlyCounts: { year: number; count: number }[];
  slope: number;
  trend: 'rising' | 'stable' | 'declining';
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
  citations: { paperId: string; title: string; chunkId: string; relevance: number }[];
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

export interface RunAllResult {
  id: string;
  createdAt: string;
  papersCount: number;
  modulesInOrder: { moduleId: number; name: string; result: unknown }[];
  modules: {
    module1: { module: string; count: number; summaries: { paperId: string; title: string; summary: string; keywords: string[] }[] };
    module2: { module: string; topics: TopicResult[]; assignments: { paperId: string; topicId: string }[] };
    module3: { module: string; formula: string; gaps: GapResult[] };
    module4: { module: string; trends: TrendResult[] };
    module5: { module: string; map: { points: PointResult[]; topicCenters: { topicId: string; name: string; x: number; y: number }[]; links: unknown[] } };
    module6: ChatbotResult;
    module7: { module: string; contradictions: ContradictionResult[] };
    module8: MatrixResult;
    module9: { module: string; sections: RelatedWorkSection[]; draftMarkdown: string };
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

export async function runAllModules(payload: RunAllPayload): Promise<RunAllResult> {
  return post<RunAllResult>('/api/modules/run-all', payload);
}

export async function askChatbot(papers: BackendPaper[], question: string): Promise<ChatbotResult> {
  return post<ChatbotResult>('/api/modules/6-chatbot', { papers, question });
}

