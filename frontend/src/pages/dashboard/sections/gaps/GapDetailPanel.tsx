import { useEffect, useRef, useState } from 'react';
import { type ResearchGap } from '../../../../mocks/gaps';
import type { BackendPaper, ChatbotResult } from '../../../..//lib/api';
import { askChatbot } from '../../../../lib/api';
import ResearchProposal from './ResearchProposal';

function ShareToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full flex items-center gap-2" style={{ animation: 'fadeInUp .2s ease' }}>
      <i className="ri-checkbox-circle-line text-teal-400" />{message}
    </div>
  );
}

function PrintReport({ gap }: { gap: ResearchGap }) {
  const pA = gap.paperIdsInA ?? [];
  const pB = gap.paperIdsInB ?? [];
  const pBr = gap.paperIdsBridging ?? [];
  return (
    <div id="print-gap-report" className="hidden print:block p-10 font-sans text-gray-900">
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="text-xs tracking-widest text-gray-400 uppercase font-bold mb-1">ResearchLens · Gap Analysis Report</div>
        <h1 className="text-2xl font-bold mb-1">{gap.topicAName} ↔ {gap.topicBName}</h1>
        <p className="text-sm text-gray-500">Gap #{gap.rank} · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div className="grid grid-cols-3 gap-6 mb-6 p-4 border border-gray-200 rounded-lg">
        {[['Similarity', gap.similarityScore.toFixed(3), '#0d9488'], ['Co-occurrence', `${gap.coOccurrenceCount} papers`, '#64748b'], ['Gap Score', gap.gapScore.toFixed(3), '#e11d48']].map(([l, v, c]) => (
          <div key={String(l)}><div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{l}</div><div className="text-2xl font-bold" style={{ color: String(c) }}>{v}</div></div>
        ))}
      </div>
      <div className="mb-4 p-3 bg-gray-50 rounded font-mono text-sm">Formula: {gap.similarityScore.toFixed(3)} × (1/({gap.coOccurrenceCount}+1)) = <strong>{gap.gapScore.toFixed(3)}</strong></div>
      <div className="mb-6"><h2 className="text-sm font-bold uppercase text-gray-500 mb-2">Explanation</h2><p className="text-sm leading-relaxed">{gap.explanation}</p></div>
      {pBr.length === 0 && <div className="p-3 bg-rose-50 rounded text-sm text-rose-700">No bridging papers found.</div>}
      {pBr.map(id => (<div key={id} className="p-2 border border-violet-100 rounded mb-2"><div className="text-xs font-medium">{id}</div></div>))}
      {[...pA.map(id => ({ id, side: 'A' })), ...pB.map(id => ({ id, side: 'B' }))].map(({ id, side }) => (
        <div key={id + side} className="mb-1.5 p-2 border border-gray-100 rounded"><div className="text-xs font-medium">{id}</div></div>
      ))}
    </div>
  );
}

function PaperRow({ id, accent }: { id: string; accent: 'teal' | 'amber' | 'violet' }) {
  const bg = { teal: 'bg-teal-50 border-teal-100', amber: 'bg-amber-50 border-amber-100', violet: 'bg-violet-50 border-violet-100' }[accent];
  return (
    <div className={`p-3 rounded-lg border ${bg}`}>
      <p className="text-xs font-medium text-gray-800 leading-snug">{id}</p>
    </div>
  );
}

function ProfileBar({ label, count, max, color, note }: { label: string; count: number; max: number; color: string; note?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full flex items-center justify-end pr-1.5 transition-all duration-700" style={{ backgroundColor: color, width: max > 0 ? `${Math.max((count / max) * 100, count > 0 ? 8 : 0)}%` : '0%' }}>
          {count > 0 && <span className="text-[9px] text-white font-bold">{count}</span>}
        </div>
      </div>
      <span className="text-[10px] text-gray-500 w-14 text-right flex-shrink-0">{count} {note ?? 'papers'}</span>
    </div>
  );
}

interface Props { gap: ResearchGap; papers?: BackendPaper[]; currentIndex: number; totalCount: number; onNavigate: (dir: 'prev' | 'next') => void; onClose: () => void; }

export default function GapDetailPanel({ gap, papers = [], currentIndex, totalCount, onNavigate, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'evidence' | 'proposal'>('evidence');
  const shareRef = useRef<HTMLDivElement>(null);

  const papersA = gap.paperIdsInA ?? [];
  const papersB = gap.paperIdsInB ?? [];
  const papersBridge = gap.paperIdsBridging ?? [];
  const topicAName = gap.topicAName || gap.topicAId || 'Topic A';
  const topicBName = gap.topicBName || gap.topicBId || 'Topic B';
  const maxProfile = Math.max(papersA.length, papersB.length, 1);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<ChatbotResult | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onNavigate('next'); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onNavigate('prev'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNavigate]);

  useEffect(() => { if (panelRef.current) panelRef.current.scrollTop = 0; setActiveTab('evidence'); }, [gap.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?gap=${gap.id}`);
    setToast('Link copied!'); setShareOpen(false);
  };

  const fetchRag = async () => {
    if (!papers || papers.length === 0) return;
    setRagLoading(true); setRagResult(null);
    try {
      const question = `Explain why the gap between "${gap.topicAName}" and "${gap.topicBName}" is significant, and cite evidence paper IDs: ${gap.paperIdsBridging?.join(', ') || ''}`;
      const res = await askChatbot(papers, question);
      setRagResult(res as ChatbotResult);
    } catch (err) {
      console.error('RAG fetch failed', err);
    } finally {
      setRagLoading(false);
    }
  };

  return (
    <>
      <PrintReport gap={gap} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[580px] bg-white flex flex-col" style={{ boxShadow: '-8px 0 40px rgba(0,0,0,0.12)' }}>

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1 pr-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded-full">{gap.topicAName}</span>
              <i className="ri-arrow-left-right-line text-gray-300 text-sm" />
              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">{gap.topicBName}</span>
            </div>
            <p className="text-[11px] text-gray-400">Gap #{gap.rank} · Score {gap.gapScore.toFixed(3)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative" ref={shareRef}>
              <button onClick={() => setShareOpen(v => !v)} className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
                <i className="ri-share-line" /> Share
              </button>
              {shareOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-[60] w-48 bg-white rounded-xl border border-gray-100 py-1" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                  <button onClick={copyLink} className="whitespace-nowrap w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"><i className="ri-link text-teal-500" /> Copy link</button>
                  <button onClick={() => { setShareOpen(false); setTimeout(() => window.print(), 80); }} className="whitespace-nowrap w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer"><i className="ri-file-pdf-line text-rose-500" /> Export PDF</button>
                </div>
              )}
            </div>
            <button onClick={onClose} className="whitespace-nowrap w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer"><i className="ri-close-line" /></button>
          </div>
        </div>

        {/* Nav strip */}
        <div className="flex items-center justify-between px-6 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <button onClick={() => onNavigate('prev')} disabled={currentIndex === 0} className="whitespace-nowrap flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"><i className="ri-arrow-left-line" /> Prev</button>
          <div className="text-[10px] text-gray-400 font-mono">{currentIndex + 1} / {totalCount}</div>
          <button onClick={() => onNavigate('next')} disabled={currentIndex === totalCount - 1} className="whitespace-nowrap flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">Next <i className="ri-arrow-right-line" /></button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-100 flex-shrink-0 bg-white px-2">
          {([
            { id: 'evidence' as const, icon: 'ri-file-search-line', label: 'Evidence' },
            { id: 'proposal' as const, icon: 'ri-lightbulb-flash-line', label: 'Research Direction' },
          ]).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors cursor-pointer border-b-2 -mb-px ${activeTab === tab.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-400 hover:text-gray-700'}`}>
              <i className={`${tab.icon} text-sm`} />
              {tab.label}
              {tab.id === 'proposal' && <span className="px-1.5 py-px bg-teal-100 text-teal-700 text-[9px] rounded-full font-bold ml-0.5">AI</span>}
            </button>
          ))}
        </div>

        {/* Body */}
        <div ref={panelRef} className="flex-1 overflow-y-auto">

          {activeTab === 'proposal' ? (
            <div className="px-6 py-5">
              <ResearchProposal gap={gap} />
            </div>
          ) : (
            <>
              {/* § 1 Metrics */}
              <section className="px-6 pt-6 pb-6 space-y-6">
                <div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Similarity Score', value: gap.similarityScore.toFixed(2), icon: 'ri-node-tree', color: '#0d9488', bg: 'bg-teal-50' },
                      { label: 'Co-occurrence', value: gap.coOccurrenceCount.toString(), icon: 'ri-link', color: '#f59e0b', bg: 'bg-amber-50' },
                      { label: 'Gap Score', value: gap.gapScore.toFixed(3), icon: 'ri-radar-line', color: '#e11d48', bg: 'bg-rose-50' },
                    ].map(m => (
                      <div key={m.label} className={`${m.bg} rounded-xl px-4 py-3 text-center`}>
                        <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-white mx-auto mb-2" style={{ color: m.color }}>
                          <i className={`${m.icon} text-sm`} />
                        </div>
                        <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
                        <div className="text-[11px] text-gray-500">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explanation */}
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-teal-400">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700 mb-2">Gap Explanation</p>
                  <p className="text-xs text-gray-700 leading-relaxed">{gap.explanation}</p>
                  {gap.llm_gap_explanation && (
                    <p className="text-xs text-gray-700 leading-relaxed mt-3 font-medium">{gap.llm_gap_explanation}</p>
                  )}
                  {gap.llm_gap_significance && (
                    <p className="text-xs text-gray-600 leading-relaxed mt-3 border-t border-gray-200 pt-3"><strong>Why it matters:</strong> {gap.llm_gap_significance}</p>
                  )}
                  {gap.llm_integration_opportunity && (
                    <p className="text-xs text-gray-600 leading-relaxed mt-2 border-t border-gray-200 pt-3"><strong>Integration opportunity:</strong> {gap.llm_integration_opportunity}</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-4 flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">←</kbd>
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">→</kbd>
            Navigate gaps
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">Esc</kbd>
            Close
          </div>
        </div>
      </div>

      {toast && <ShareToast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
