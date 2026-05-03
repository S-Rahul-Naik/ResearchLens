import { mockChatSessions } from '../../../../mocks/chatData';
import type { RunAllResult } from '../../../../lib/api';

export default function ChatResultsSection({ backendResult }: { backendResult?: RunAllResult | null }) {
  const module6 = backendResult?.modules.module6;

  if (module6) {
    return (
      <section id="result-chat" className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
            <i className="ri-chat-3-line text-sm" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 6</p>
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Chat Results (RAG Output)</h2>
          </div>
          <div className="ml-auto text-xs text-gray-400">1 session · live backend</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
            <div className="w-5 h-5 flex items-center justify-center rounded-md bg-teal-100 text-teal-700">
              <i className="ri-chat-thread-line text-xs" />
            </div>
            <span className="text-xs font-semibold text-gray-700">Research Gap Analysis</span>
            <span className="text-[10px] text-gray-400 ml-auto">
              {module6.citations.length} source chunk{module6.citations.length !== 1 ? 's' : ''} retrieved
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Question */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <i className="ri-user-3-line text-xs text-gray-600" />
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Question</p>
                <p className="text-sm text-gray-800">Where are the key gaps and what evidence supports them?</p>
              </div>
            </div>

            {/* Answer */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-2-line text-xs text-teal-700" />
              </div>
              <div className="flex-1">
                <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-2">Answer</p>
                  {module6.answer.split('\n\n').map((para, i) => (
                    <p key={i} className="text-xs text-teal-900 leading-relaxed mb-2 last:mb-0">{para}</p>
                  ))}
                </div>

                {module6.citations.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                      <i className="ri-book-open-line" />
                      Sources ({module6.citations.length})
                    </p>
                    <div className="space-y-1.5">
                      {module6.citations.map(c => (
                        <div key={c.chunkId} className="flex items-start gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                          <i className="ri-file-text-line text-[11px] text-gray-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-gray-700 leading-snug">{c.title}</p>
                          </div>
                          <div className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded flex-shrink-0">
                            {(c.relevance * 100).toFixed(0)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
          <p className="text-[11px] text-gray-500 leading-relaxed">
            <strong className="text-gray-700">How RAG works:</strong> The system retrieves the most semantically relevant paper chunks
            using TF-IDF vector similarity, then synthesises the answer from retrieved context.
            Citation relevance scores (%) show how strongly each chunk influenced the answer.
          </p>
        </div>
      </section>
    );
  }

  // Fallback to mock sessions
  const sessions = mockChatSessions;
  return (
    <section id="result-chat" className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900 text-white">
          <i className="ri-chat-3-line text-sm" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Section 6</p>
          <h2 className="text-lg font-bold text-gray-900 leading-tight">Sample Chat Results (RAG Output)</h2>
        </div>
        <div className="ml-auto text-xs text-gray-400">{sessions.length} sessions</div>
      </div>

      <div className="space-y-6">
        {sessions.map(session => {
          const userMsg = session.messages.find(m => m.role === 'user');
          const assistantMsg = session.messages.find(m => m.role === 'assistant');

          return (
            <div key={session.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Session header */}
              <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center rounded-md bg-teal-100 text-teal-700">
                  <i className="ri-chat-thread-line text-xs" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{session.title}</span>
                <span className="text-[10px] text-gray-400 ml-auto">
                  {session.paperCount} papers analysed · {new Date(session.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>

              <div className="p-5 space-y-4">
                {/* Question */}
                {userMsg && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <i className="ri-user-3-line text-xs text-gray-600" />
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Question</p>
                      <p className="text-sm text-gray-800">{userMsg.content}</p>
                    </div>
                  </div>
                )}

                {/* Answer */}
                {assistantMsg && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                      <i className="ri-robot-2-line text-xs text-teal-700" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-teal-50 border border-teal-100 rounded-xl px-4 py-3 mb-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-2">Answer</p>
                        {assistantMsg.content.split('\n\n').map((para, i) => {
                          if (para.startsWith('**')) {
                            const text = para.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                            return (
                              <p key={i} className="text-xs text-teal-900 leading-relaxed mb-2 last:mb-0"
                                dangerouslySetInnerHTML={{ __html: text }} />
                            );
                          }
                          return (
                            <p key={i} className="text-xs text-teal-900 leading-relaxed mb-2 last:mb-0">{para}</p>
                          );
                        })}
                      </div>

                      {/* Citations */}
                      {assistantMsg.citations && assistantMsg.citations.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1">
                            <i className="ri-book-open-line" />
                            Sources ({assistantMsg.citations.length})
                          </p>
                          <div className="space-y-1.5">
                            {assistantMsg.citations.map(c => (
                              <div key={c.paperId} className="flex items-start gap-2 bg-white border border-gray-100 rounded-lg px-3 py-2">
                                <i className="ri-file-text-line text-[11px] text-gray-400 flex-shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] text-gray-700 leading-snug">{c.title}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <div className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                    {(c.relevance * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <strong className="text-gray-700">How RAG works:</strong> When you ask a question, the system retrieves the most semantically relevant paper chunks using vector similarity,
          then passes them as context to the language model. Citation relevance scores (%) show how strongly each paper influenced the answer.
        </p>
      </div>
    </section>
  );
}
