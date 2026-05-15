import { useEffect, useState } from 'react';
import { type ResearchGap } from '../../../../mocks/gaps';
import type { BackendPaper, ChatbotResult } from '../../../../lib/api';
import { askChatbot } from '../../../../lib/api';

function ShareToast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2600); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full flex items-center gap-2" style={{ animation: 'fadeInUp .2s ease' }}>
      <i className="ri-checkbox-circle-line text-teal-400" />{message}
    </div>
  );
}

interface Props {
  gap: ResearchGap;
  papers?: BackendPaper[];
  currentIndex: number;
  totalCount: number;
  onNavigate: (dir: 'prev' | 'next') => void;
  onClose: () => void;
}

export default function EvidenceModal({ gap, papers = [], currentIndex, totalCount, onNavigate, onClose }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<ChatbotResult | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); onNavigate('next'); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); onNavigate('prev'); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onNavigate]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?gap=${gap.id}`);
    setToast('Link copied!');
  };

  const topicAName = gap.topicAName || gap.topicAId || 'Topic A';
  const topicBName = gap.topicBName || gap.topicBId || 'Topic B';

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div
        className="fixed inset-x-8 top-20 bottom-20 z-50 bg-white rounded-2xl flex flex-col overflow-hidden max-w-2xl mx-auto"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">EVIDENCE PANEL</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full">{topicAName}</span>
              <i className="ri-arrow-left-right-line text-gray-300 text-sm" />
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">{topicBName}</span>
            </div>
            <p className="text-xs text-gray-400">Gap #{gap.rank} · Score {gap.gapScore.toFixed(3)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer">
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-8 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 flex-shrink-0">
          <button onClick={() => onNavigate('prev')} disabled={currentIndex === 0} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
            <i className="ri-arrow-left-line" /> Previous
          </button>
          <span className="text-xs font-mono text-gray-400">{currentIndex + 1} / {totalCount}</span>
          <button onClick={() => onNavigate('next')} disabled={currentIndex === totalCount - 1} className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
            Next <i className="ri-arrow-right-line" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8">
          {/* Metrics */}
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Similarity Score', value: gap.similarityScore.toFixed(2), icon: 'ri-node-tree', color: '#0d9488', bg: 'bg-teal-50' },
                { label: 'Co-occurrence', value: gap.coOccurrenceCount.toString(), icon: 'ri-link', color: '#f59e0b', bg: 'bg-amber-50' },
                { label: 'Gap Score', value: gap.gapScore.toFixed(3), icon: 'ri-radar-line', color: '#e11d48', bg: 'bg-rose-50' },
              ].map(m => (
                <div key={m.label} className={`${m.bg} rounded-xl px-4 py-4 text-center`}>
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-white mx-auto mb-3" style={{ color: m.color }}>
                    <i className={`${m.icon} text-base`} />
                  </div>
                  <div className="text-2xl font-bold mb-1" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-xs text-gray-600">{m.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Explanation */}
          <section className="space-y-3">
            <div className="border-l-4 border-teal-400 bg-teal-50 rounded-lg p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-3">Gap Explanation</p>
              <p className="text-sm text-gray-700 leading-relaxed">{gap.explanation}</p>
              {gap.llm_gap_explanation && (
                <p className="text-sm text-teal-700 leading-relaxed mt-4 font-medium border-t border-teal-200 pt-4">{gap.llm_gap_explanation}</p>
              )}
              {gap.llm_gap_significance && (
                <p className="text-sm text-gray-600 leading-relaxed mt-3">
                  <strong>Why it matters:</strong> {gap.llm_gap_significance}
                </p>
              )}
              {gap.llm_integration_opportunity && (
                <p className="text-sm text-gray-600 leading-relaxed mt-3">
                  <strong>Integration opportunity:</strong> {gap.llm_integration_opportunity}
                </p>
              )}
            </div>
          </section>

          {/* Papers */}
          <section className="space-y-3">
            <div className="space-y-3">
              {(gap.paperIdsInA ?? []).length > 0 && (
                <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-4">
                  <p className="text-xs font-semibold text-teal-800 mb-2">Papers in {topicAName} ({(gap.paperIdsInA ?? []).length})</p>
                  <div className="flex flex-wrap gap-2">
                    {(gap.paperIdsInA ?? []).slice(0, 5).map(id => (
                      <span key={id} className="text-xs px-2.5 py-1 bg-white border border-teal-200 text-teal-700 rounded-full font-medium">{id}</span>
                    ))}
                    {(gap.paperIdsInA ?? []).length > 5 && <span className="text-xs px-2.5 py-1 text-teal-600 font-medium">+{(gap.paperIdsInA ?? []).length - 5} more</span>}
                  </div>
                </div>
              )}
              {(gap.paperIdsInB ?? []).length > 0 && (
                <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-2">Papers in {topicBName} ({(gap.paperIdsInB ?? []).length})</p>
                  <div className="flex flex-wrap gap-2">
                    {(gap.paperIdsInB ?? []).slice(0, 5).map(id => (
                      <span key={id} className="text-xs px-2.5 py-1 bg-white border border-amber-200 text-amber-700 rounded-full font-medium">{id}</span>
                    ))}
                    {(gap.paperIdsInB ?? []).length > 5 && <span className="text-xs px-2.5 py-1 text-amber-600 font-medium">+{(gap.paperIdsInB ?? []).length - 5} more</span>}
                  </div>
                </div>
              )}
              {(gap.paperIdsBridging ?? []).length > 0 && (
                <div className="rounded-lg border border-violet-100 bg-violet-50/50 p-4">
                  <p className="text-xs font-semibold text-violet-800 mb-2">Bridging Papers ({(gap.paperIdsBridging ?? []).length})</p>
                  <div className="flex flex-wrap gap-2">
                    {(gap.paperIdsBridging ?? []).slice(0, 5).map(id => (
                      <span key={id} className="text-xs px-2.5 py-1 bg-white border border-violet-200 text-violet-700 rounded-full font-medium">{id}</span>
                    ))}
                    {(gap.paperIdsBridging ?? []).length > 5 && <span className="text-xs px-2.5 py-1 text-violet-600 font-medium">+{(gap.paperIdsBridging ?? []).length - 5} more</span>}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white transition-colors cursor-pointer">
              <i className="ri-share-line text-teal-600" /> Share
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-gray-500 font-mono">Esc</kbd>
            Close
          </div>
        </div>
      </div>

      {toast && <ShareToast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}
