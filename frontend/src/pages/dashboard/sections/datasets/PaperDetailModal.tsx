import { useEffect } from 'react';
import { type Paper } from '../../../../mocks/papers';
import { mockTopics } from '../../../../mocks/topics';
import { mockGaps } from '../../../../mocks/gaps';
import type { TopicResult, GapResult } from '../../../../lib/api';

// Topic dot colors by index
const TOPIC_COLORS = ['#0f766e','#7c3aed','#d97706','#dc2626','#2563eb','#059669'];

interface Props {
  paper: Paper | null;
  onClose: () => void;
  realTopics?: TopicResult[];
  realGaps?: GapResult[];
}

export default function PaperDetailModal({ paper, onClose, realTopics = [], realGaps = [] }: Props) {
  useEffect(() => {
    if (!paper) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [paper, onClose]);

  if (!paper) return null;

  // Use real topics from backend when available, otherwise fall back to mock
  const useRealData = realTopics.length > 0;

  const topics = useRealData
    ? paper.topics
        .map(tid => realTopics.find(t => t.topicId === tid))
        .filter(Boolean) as TopicResult[]
    : paper.topics.map(tid => mockTopics.find(t => t.id === tid)).filter(Boolean) as typeof mockTopics;

  const relatedGaps = useRealData
    ? realGaps.filter(g => g.evidencePaperIds?.includes(paper.id))
    : mockGaps.filter(g =>
        g.paperIdsInA.includes(paper.id) ||
        g.paperIdsInB.includes(paper.id) ||
        g.paperIdsBridging.includes(paper.id)
      );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.35)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        style={{ animation: 'fadeInUp 0.25s ease both' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 flex items-center justify-center rounded-md bg-teal-50 text-teal-600 shrink-0">
                  <i className="ri-file-text-line text-sm" />
                </div>
                <span className="text-xs font-medium text-teal-600 uppercase tracking-wide">Research Paper</span>
              </div>
              <h2 className="text-base font-semibold text-gray-900 leading-snug">{paper.title}</h2>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <span className="text-xs text-gray-500">
                  {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ` +${paper.authors.length - 3}` : ''}
                </span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className="text-xs text-gray-500">{paper.year}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300" />
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  paper.status === 'processed' ? 'bg-green-50 text-green-700' :
                  paper.status === 'pending' ? 'bg-gray-100 text-gray-500' :
                  paper.status === 'processing' ? 'bg-amber-50 text-amber-700' :
                  'bg-rose-50 text-rose-600'
                }`}>
                  <i className={`${
                    paper.status === 'processed' ? 'ri-checkbox-circle-line' :
                    paper.status === 'pending' ? 'ri-time-line' :
                    paper.status === 'processing' ? 'ri-loader-4-line' :
                    'ri-error-warning-line'
                  } text-[10px]`} />
                  {paper.status}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer shrink-0"
            >
              <i className="ri-close-line" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Abstract */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Abstract</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{paper.abstract}</p>
          </section>

          {/* Keywords */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Keywords</h3>
            <div className="flex flex-wrap gap-1.5">
              {paper.keywords.map((kw) => (
                <span key={kw} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">{kw}</span>
              ))}
            </div>
          </section>

          {/* Topic Assignments */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Topic Assignments
              <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                {topics.length} topic{topics.length !== 1 ? 's' : ''} assigned
              </span>
            </h3>
            {topics.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No topics assigned yet — process the paper to assign topics.</p>
            ) : useRealData ? (
              <div className="space-y-2">
                {(topics as TopicResult[]).map((topic, idx) => (
                  <div key={topic.topicId} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: TOPIC_COLORS[idx % TOPIC_COLORS.length] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 mb-1">{topic.name}</p>
                      <div className="flex flex-wrap gap-1">
                        {topic.keywords.slice(0, 6).map(kw => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-gray-700">{(topic.coherence * 100).toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-400">coherence</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(topics as typeof mockTopics).map((topic) => (
                  <div key={topic.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: topic.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-800">{topic.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          topic.trend === 'rising' ? 'bg-green-50 text-green-700' :
                          topic.trend === 'declining' ? 'bg-rose-50 text-rose-600' :
                          'bg-gray-100 text-gray-500'
                        }`}>{topic.trend === 'rising' ? '↑' : topic.trend === 'declining' ? '↓' : '→'} {topic.trend}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {topic.keywords.slice(0, 5).map(kw => (
                          <span key={kw} className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500">{kw}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-gray-700">{(topic.coherenceScore * 100).toFixed(0)}%</div>
                      <div className="text-[10px] text-gray-400">coherence</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Related Gaps */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">
              Research Gap Involvement
              <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case tracking-normal">
                {relatedGaps.length} gap{relatedGaps.length !== 1 ? 's' : ''} involve this paper
              </span>
            </h3>
            {relatedGaps.length === 0 ? (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 text-sm text-gray-500">
                <i className="ri-information-line text-gray-400" />
                {paper.status === 'pending'
                  ? 'Process the paper to detect research gaps.'
                  : 'This paper is not directly involved in any detected gap.'}
              </div>
            ) : useRealData ? (
              <div className="space-y-2">
                {(relatedGaps as GapResult[]).map((gap, idx) => (
                  <div key={gap.gapId} className="p-3 rounded-xl border border-gray-100 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{gap.topicALabel} × {gap.topicBLabel}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-gray-400">Similarity {gap.similarity.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400">Co-occ {gap.coOccurrence}</span>
                          <span className="text-[10px] font-semibold text-teal-700">Score {gap.gapScore.toFixed(2)}</span>
                        </div>
                        {gap.recommendation && <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">{gap.recommendation}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          gap.severity === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          gap.severity === 'moderate' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}>{gap.severity}</span>
                        <span className="text-[10px] text-gray-400">Gap #{idx + 1}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(relatedGaps as typeof mockGaps).map((gap) => (
                  <div key={gap.id} className="p-3 rounded-xl border border-gray-100 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{gap.topicAName} × {gap.topicBName}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] text-gray-400">Similarity {gap.similarityScore.toFixed(2)}</span>
                          <span className="text-[10px] text-gray-400">Co-occ {gap.coOccurrenceCount}</span>
                          <span className="text-[10px] font-semibold text-teal-700">Score {gap.gapScore.toFixed(2)}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">Rank #{gap.rank}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-400">ID: {paper.id} · Uploaded {paper.uploadDate}</span>
          <button
            onClick={onClose}
            className="whitespace-nowrap px-4 py-2 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
