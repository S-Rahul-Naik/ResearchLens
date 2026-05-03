import { useEffect, useState } from 'react';

interface DemoModalProps {
  onClose: () => void;
}

function AnimatedBar({ value, max = 1, color, delay = 0 }: { value: number; max?: number; color: string; delay?: number }) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const pct = Math.round((value / max) * 100);
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-none"
        style={{
          backgroundColor: color,
          width: started ? `${pct}%` : '0%',
          transition: started ? 'width 0.85s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
        }}
      />
    </div>
  );
}

const DEMO_PAPERS_A = [
  { title: 'Communication-Efficient Learning of Deep Networks from Decentralized Data', authors: 'McMahan et al.', year: 2017 },
  { title: 'Advances and Open Problems in Federated Learning', authors: 'Kairouz et al.', year: 2021 },
];

const DEMO_PAPERS_B = [
  { title: 'Deep Learning for Electronic Health Records', authors: 'Rajpurkar et al.', year: 2022 },
  { title: 'Explainable AI in Clinical Decision Support', authors: 'Tonekaboni et al.', year: 2019 },
];

export default function DemoModal({ onClose }: DemoModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'evidence'>('overview');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl overflow-hidden flex flex-col animate-fade-up">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-gray-700">Sample Gap Analysis</span>
            <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">DEMO</span>
          </div>
          <button
            onClick={onClose}
            className="whitespace-nowrap w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
          >
            <i className="ri-close-line" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Gap header */}
          <div className="bg-gradient-to-r from-emerald-50/60 to-amber-50/40 px-6 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">GAP #1 · TOP DETECTED GAP</span>
              <span className="px-3 py-1 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
                Score 0.435
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-white rounded-xl border border-emerald-100">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide mb-2">Topic A</p>
                <p className="text-sm font-bold text-gray-900 mb-2">Federated Learning</p>
                <div className="flex flex-wrap gap-1">
                  {['federated', 'privacy', 'distributed', 'aggregation'].map(kw => (
                    <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded">{kw}</span>
                  ))}
                </div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide mb-2">Topic B</p>
                <p className="text-sm font-bold text-gray-900 mb-2">Clinical AI & Health</p>
                <div className="flex flex-wrap gap-1">
                  {['EHR', 'clinical', 'diagnosis', 'patient'].map(kw => (
                    <span key={kw} className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">{kw}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6 flex-shrink-0">
            {(['overview', 'evidence'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-3 px-4 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer ${
                  activeTab === tab
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab === 'overview' ? 'Metrics & Formula' : 'Evidence & Papers'}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="px-6 py-5 space-y-5">
              {/* Metric bars */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Computed Scores</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">Semantic Similarity</span>
                      <span className="text-sm font-bold text-emerald-600">0.87</span>
                    </div>
                    <AnimatedBar value={0.87} max={1} color="#059669" delay={150} />
                    <p className="text-[11px] text-gray-400 mt-1">Cosine distance between topic centroid embeddings (all-MiniLM-L6-v2)</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">Co-occurrence Count</span>
                      <span className="text-sm font-bold text-gray-700">1 paper</span>
                    </div>
                    <AnimatedBar value={1} max={10} color="#94a3b8" delay={300} />
                    <p className="text-[11px] text-gray-400 mt-1">Papers in the dataset that discuss both topics simultaneously</p>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">Gap Score</span>
                      <span className="text-sm font-bold text-rose-600">0.435</span>
                    </div>
                    <AnimatedBar value={0.435} max={1} color="#e11d48" delay={450} />
                    <p className="text-[11px] text-gray-400 mt-1">Higher = stronger unexplored intersection</p>
                  </div>
                </div>
              </div>

              {/* Formula */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Formula Applied</p>
                <code className="text-sm font-mono text-gray-800 block mb-3">
                  gap_score = similarity × (1 / (co_occurrence + 1))
                </code>
                <div className="bg-white rounded-lg px-4 py-3 border border-gray-200 text-sm font-mono text-gray-700">
                  = 0.87 × (1 / (1 + 1)){' '}
                  <span className="text-gray-400">=</span>{' '}
                  0.87 × 0.5{' '}
                  <span className="text-gray-400">=</span>{' '}
                  <strong className="text-rose-600">0.435</strong>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <div className="flex gap-2">
                  <i className="ri-lightbulb-flash-line text-emerald-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-emerald-900 leading-relaxed">
                    <strong>Why this is a gap:</strong> Federated Learning and Clinical AI are semantically close — 
                    both deal with sensitive data environments and distributed inference. Yet only 1 paper 
                    co-addresses both topics, signaling a high-impact unexplored intersection.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evidence' && (
            <div className="px-6 py-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-emerald-700 mb-3 flex items-center gap-1.5">
                  <i className="ri-file-list-line" /> Papers in Federated Learning (2 papers)
                </p>
                <div className="space-y-2">
                  {DEMO_PAPERS_A.map(p => (
                    <div key={p.title} className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{p.authors} · {p.year}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-amber-700 mb-3 flex items-center gap-1.5">
                  <i className="ri-file-list-line" /> Papers in Clinical AI & Health (2 papers)
                </p>
                <div className="space-y-2">
                  {DEMO_PAPERS_B.map(p => (
                    <div key={p.title} className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                      <p className="text-sm font-medium text-gray-800 leading-snug">{p.title}</p>
                      <p className="text-[11px] text-gray-400 mt-1">{p.authors} · {p.year}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <i className="ri-error-warning-line text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-rose-700">Only 1 bridging paper found — confirming this as an unexplored intersection with high research potential.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
          <p className="text-sm text-gray-500">Upload your papers to detect gaps in <em>your</em> literature.</p>
          <a
            href="/signup"
            className="whitespace-nowrap px-5 py-2.5 text-sm font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Try it free <i className="ri-arrow-right-line ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
