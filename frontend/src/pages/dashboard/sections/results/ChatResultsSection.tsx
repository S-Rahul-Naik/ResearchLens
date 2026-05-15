import { useEffect, useState } from 'react';
import { askChatbot, askAboutAnalysis, type BackendPaper, type ChatbotResult, type RunAllResult } from '../../../../lib/api';

function formatContent(text: string) {
  return text.split('\n\n').map((paragraph, index) => {
    const html = paragraph.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    return <p key={index} className="text-sm text-teal-900 leading-relaxed mb-3 last:mb-0" dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} />;
  });
}

export default function ChatResultsSection({ backendResult, papers = [] }: { backendResult?: RunAllResult | null; papers?: BackendPaper[] }) {
  const [query, setQuery] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [citations, setCitations] = useState<ChatbotResult['citations']>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setQuery('');
    setAnswer('');
    setCitations([]);
    setError('');
    setLoading(false);
  }, [backendResult, papers]);

  const handleAsk = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    // Require either analysis payload or papers
    if (!backendResult && papers.length === 0) {
      setError('Run an analysis or load papers first to ask a question.');
      return;
    }

    setLastQuestion(trimmed);
    setLoading(true);
    setError('');
    setAnswer('');
    setCitations([]);

    try {
      let result: ChatbotResult;

      // Prefer analysis-based chat (faster, uses n8n payload) when available
      if (backendResult) {
        result = await askAboutAnalysis(trimmed, backendResult);
      } else {
        // Fallback to paper-based chat
        result = await askChatbot(papers, trimmed);
      }

      if (!result || typeof result !== 'object') {
        setError('Invalid response from server. Please try again.');
        return;
      }
      setAnswer(result.answer || '');
      setCitations(Array.isArray(result.citations) ? result.citations : []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unable to fetch chat answer.';
      console.error('Chat error:', errorMsg);
      setError(`Error: ${errorMsg}. Make sure the backend server is running.`);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="ml-auto text-xs text-gray-400">Live question support</div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
          <div className="w-5 h-5 flex items-center justify-center rounded-md bg-teal-100 text-teal-700">
            <i className="ri-chat-thread-line text-xs" />
          </div>
          <span className="text-xs font-semibold text-gray-700">Ask anything about your dataset</span>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Your question</p>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
              placeholder="Feel free to ask queries..."
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none"
            />
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                onClick={handleAsk}
                disabled={!query.trim() || loading}
                className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Ask question'}
              </button>
              <p className="text-[10px] text-gray-400">Press Enter to send, Shift+Enter for new line.</p>
            </div>
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          </div>

          {answer && lastQuestion && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Question</p>
              <p className="text-sm text-gray-800">{lastQuestion}</p>
            </div>
          )}

          <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 min-h-[180px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700 mb-3">Answer</p>
            {loading ? (
              <div className="text-sm text-teal-900">Generating an answer from your uploaded papers...</div>
            ) : answer ? (
              <div>{formatContent(answer)}</div>
            ) : (
              <p className="text-sm text-gray-500">Your answer will appear here once you ask a question.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          <strong className="text-gray-700">How RAG works:</strong> The system retrieves the most semantically relevant paper chunks from the dataset and synthesises the answer using the local Ollama backend.
        </p>
      </div>
    </section>
  );
}
