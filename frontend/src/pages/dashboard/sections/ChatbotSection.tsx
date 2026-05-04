import { useState, useRef, useEffect } from 'react';
import { mockChatSessions, mockQuickSuggestions, type ChatMessage } from '../../../mocks/chatData';
import { mockPapers } from '../../../mocks/papers';
import { mockGaps } from '../../../mocks/gaps';
import { mockTopics } from '../../../mocks/topics';
import { askChatbot, type BackendPaper, type RunAllResult } from '../../../lib/api';

function generateAnswer(query: string, realTopics: RunAllResult['modules']['module2']['topics'], realGaps: RunAllResult['modules']['module3']['gaps'], realPapers: BackendPaper[]): { content: string; citations: { paperId: string; title: string; relevance: number }[] } {
  const q = query.toLowerCase();
  const topics = realTopics.length > 0 ? realTopics : null;
  const gaps = realGaps.length > 0 ? realGaps : null;
  const papers = realPapers.length > 0 ? realPapers : mockPapers;
  if (q.includes('gap') || q.includes('gaps')) {
    const topGap = gaps ? (gaps[0] as RunAllResult['modules']['module3']['gaps'][0]) : mockGaps[0];
    const gapAName = gaps ? (topGap as RunAllResult['modules']['module3']['gaps'][0]).topicALabel : (topGap as typeof mockGaps[0]).topicAName;
    const gapBName = gaps ? (topGap as RunAllResult['modules']['module3']['gaps'][0]).topicBLabel : (topGap as typeof mockGaps[0]).topicBName;
    const gapScore = gaps ? (topGap as RunAllResult['modules']['module3']['gaps'][0]).gapScore : (topGap as typeof mockGaps[0]).gapScore;
    const similarity = gaps ? (topGap as RunAllResult['modules']['module3']['gaps'][0]).similarity : (topGap as typeof mockGaps[0]).similarityScore;
    const coOcc = gaps ? (topGap as RunAllResult['modules']['module3']['gaps'][0]).coOccurrence : (topGap as typeof mockGaps[0]).coOccurrenceCount;
    const explanation = gaps ? (topGap as RunAllResult['modules']['module3']['gaps'][0]).recommendation : (topGap as typeof mockGaps[0]).explanation;
    return {
      content: `Based on the uploaded papers, the top research gap is between **${gapAName}** and **${gapBName}** (gap score: ${gapScore.toFixed(3)}).\n\nSimilarity: ${similarity.toFixed(2)}, Co-occurrence: ${coOcc}.\n\n${explanation}`,
      citations: papers.slice(0, 3).map((p) => ({ paperId: p.id, title: p.title, relevance: 0.88 + Math.random() * 0.1 })),
    };
  }
  if (q.includes('topic') || q.includes('cluster')) {
    const topicsArr = topics ?? mockTopics;
    const top = topicsArr.slice(0, 3);
    const getTopicName = (t: typeof topicsArr[0]) => topics ? (t as RunAllResult['modules']['module2']['topics'][0]).name : (t as typeof mockTopics[0]).name;
    const getTopicPaperCount = (t: typeof topicsArr[0]) => topics ? (t as RunAllResult['modules']['module2']['topics'][0]).paperIds.length : (t as typeof mockTopics[0]).paperIds.length;
    const getTopicCoherence = (t: typeof topicsArr[0]) => topics ? (t as RunAllResult['modules']['module2']['topics'][0]).coherence : (t as typeof mockTopics[0]).coherenceScore;
    return {
      content: `The dataset contains **${topicsArr.length} topics** detected:\n\n${top.map((t) => `• **${getTopicName(t)}** — ${getTopicPaperCount(t)} papers, coherence: ${getTopicCoherence(t).toFixed(2)}`).join('\n')}\n\n...and ${topicsArr.length - 3} more topics.`,
      citations: papers.slice(0, 2).map((p) => ({ paperId: p.id, title: p.title, relevance: 0.82 })),
    };
  }
  if (q.includes('federated') || q.includes('privacy')) {
    const papers = mockPapers.filter((p) => p.topics.includes('t001'));
    return {
      content: `Found **${papers.length} papers** on federated learning:\n\n${papers.slice(0, 3).map((p) => `• "${p.title}" (${p.year})`).join('\n')}\n\nKey themes: privacy-preserving training, non-IID data, Byzantine fault tolerance, gradient aggregation.`,
      citations: papers.slice(0, 3).map((p) => ({ paperId: p.id, title: p.title, relevance: 0.91 + Math.random() * 0.08 })),
    };
  }
  if (q.includes('trend') || q.includes('rising') || q.includes('growing')) {
    return {
      content: `The fastest-growing topics based on year-over-year paper counts:\n\n1. **Large Language Models** (+72% growth rate) — peaking in 2024\n2. **Clinical AI & Health** (+41% growth rate) — strongly rising\n3. **Robotics & Embodied AI** (+38% growth rate) — rising\n\nReinforcement Learning and Computer Vision remain **stable**.`,
      citations: mockPapers.filter((p) => p.topics.includes('t002')).slice(0, 2).map((p) => ({ paperId: p.id, title: p.title, relevance: 0.79 })),
    };
  }
  const relevant = papers.filter((p) =>
    p.title.toLowerCase().includes(q.split(' ')[0]) ||
    (p as typeof mockPapers[0]).keywords?.some((k) => q.includes(k))
  ).slice(0, 3);
  if (relevant.length > 0) {
    return {
      content: `Found ${relevant.length} relevant paper(s) for your query:\n\n${relevant.map((p) => `• **"${p.title}"** — ${p.authors[0]}, ${p.year}\n  ${p.abstract.slice(0, 120)}...`).join('\n\n')}`,
      citations: relevant.map((p) => ({ paperId: p.id, title: p.title, relevance: 0.84 + Math.random() * 0.12 })),
    };
  }
  const topicNames = topics ? topics.map(t => t.name).slice(0, 4).join(', ') : 'Federated Learning, Large Language Models, Computer Vision, Knowledge Graphs';
  return {
    content: `I searched through ${papers.length} uploaded papers for "${query}".\n\nI didn't find highly specific results, but the dataset covers: **${topicNames}** and more.\n\nTry asking about specific topics, research gaps, or paper trends.`,
    citations: papers.slice(0, 2).map((p) => ({ paperId: p.id, title: p.title, relevance: 0.65 })),
  };
}

export default function ChatbotSection({ papers = [], backendResult }: { papers?: BackendPaper[]; backendResult?: RunAllResult | null }) {
  const [sessions] = useState(mockChatSessions);
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id);
  const [messages, setMessages] = useState<ChatMessage[]>(sessions[0].messages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput('');
    const userMsg: ChatMessage = { id: `m-${Date.now()}`, role: 'user', content: q, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    let botMsg: ChatMessage;
    if (papers.length > 0) {
      // Real backend RAG call
      try {
        const result = await askChatbot(papers, q);
        botMsg = {
          id: `m-${Date.now()}-bot`,
          role: 'assistant',
          content: result.answer,
          citations: result.citations.map(c => ({ paperId: c.paperId, title: c.title, relevance: c.relevance })),
          timestamp: new Date().toISOString(),
        };
      } catch {
        botMsg = {
          id: `m-${Date.now()}-bot`,
          role: 'assistant',
          content: 'Sorry, I could not reach the backend. Please check that the server is running.',
          timestamp: new Date().toISOString(),
        };
      }
    } else {
      // Mock fallback when no papers are loaded
      await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));
      const answer = generateAnswer(q, backendResult?.modules.module2.topics ?? [], backendResult?.modules.module3.gaps ?? [], papers);
      botMsg = {
        id: `m-${Date.now()}-bot`,
        role: 'assistant',
        content: answer.content,
        citations: answer.citations,
        timestamp: new Date().toISOString(),
      };
    }

    setMessages((prev) => [...prev, botMsg]);
    setLoading(false);
  };

  const formatContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      return <p key={i} className="mb-1 last:mb-0" dangerouslySetInnerHTML={{ __html: boldLine || '&nbsp;' }} />;
    });
  };

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Session Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col bg-white">
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            <input type="text" placeholder="Search chats..." className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-teal-400 bg-gray-50" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => { setActiveSessionId(s.id); setMessages(s.messages); }}
              className={`whitespace-nowrap w-full text-left p-3 rounded-xl transition-colors cursor-pointer ${activeSessionId === s.id ? 'bg-teal-50 border border-teal-100' : 'hover:bg-gray-50'}`}
            >
              <p className="text-xs font-medium text-gray-800 line-clamp-2 mb-1">{s.title}</p>
              <p className="text-[10px] text-gray-400">{s.paperCount} papers · {new Date(s.createdAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={() => { setMessages([]); setActiveSessionId('new'); }}
            className="whitespace-nowrap w-full py-2 bg-[#0f766e] text-white text-xs font-semibold rounded-lg hover:bg-[#0d6b62] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <i className="ri-add-line" /> New Chat
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <i className="ri-robot-2-line text-sm" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-800">ResearchLens AI</span>
              <span className="ml-2 text-[10px] px-2 py-0.5 bg-green-50 text-green-700 rounded-full font-medium">
              {papers.length > 0 ? `RAG · ${papers.length} papers loaded` : `RAG · ${mockPapers.length} papers (demo)`}
            </span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8f9fb]">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 flex items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-4">
                <i className="ri-chat-3-line text-2xl" />
              </div>
              <h3 className="text-base font-semibold text-gray-800 mb-1">Ask about your research</h3>
              <p className="text-sm text-gray-400 mb-6">I can answer questions about gaps, topics, trends, and specific papers.</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {mockQuickSuggestions.map((s) => (
                  <button key={s} onClick={() => handleSend(s)} className="whitespace-nowrap text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-teal-400 hover:text-teal-700 transition-colors cursor-pointer">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="ri-robot-2-line text-white text-xs" />
                </div>
              )}
              <div className={`max-w-[70%] ${msg.role === 'user' ? 'bg-[#0f766e] text-white rounded-2xl rounded-br-sm' : 'bg-white border border-gray-100 rounded-2xl rounded-bl-sm'} px-4 py-3`}>
                <div className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                  {formatContent(msg.content)}
                </div>
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Sources</p>
                    {msg.citations.map((c, i) => (
                      <div key={`${c.paperId}-${i}`} className="flex items-start gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-teal-600 mt-0.5">[{i + 1}]</span>
                        <div>
                          <p className="text-[10px] text-gray-700 leading-snug font-medium">{c.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 rounded-full" style={{ width: `${c.relevance * 100}%` }} />
                            </div>
                            <span className="text-[9px] text-gray-400">{(c.relevance * 100).toFixed(0)}% relevant</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
                <i className="ri-robot-2-line text-white text-xs" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick Suggestions */}
        {messages.length > 0 && (
          <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto">
            {mockQuickSuggestions.slice(0, 3).map((s) => (
              <button key={s} onClick={() => handleSend(s)} className="whitespace-nowrap text-xs px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-gray-600 hover:border-teal-400 hover:text-teal-700 transition-colors cursor-pointer flex-shrink-0">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
          <div className="flex items-end gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 focus-within:border-teal-400 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask about your research papers..."
              rows={1}
              className="flex-1 text-sm bg-transparent resize-none focus:outline-none text-gray-800 placeholder-gray-400 max-h-32"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="whitespace-nowrap w-8 h-8 flex items-center justify-center rounded-lg bg-[#0f766e] text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#0d6b62] transition-colors flex-shrink-0"
            >
              <i className="ri-send-plane-fill text-sm" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 text-right">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
