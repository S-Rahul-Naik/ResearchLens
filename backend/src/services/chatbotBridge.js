const axios = require('axios');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_API = process.env.OLLAMA_CHAT_API || `${OLLAMA_BASE_URL}/api/generate`;
const OLLAMA_CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || process.env.OLLAMA_MODEL || 'gemma3:1b';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_CHAT_TIMEOUT_MS, 10) || 60000;
const OLLAMA_MAX_TOKENS = parseInt(process.env.OLLAMA_CHAT_MAX_TOKENS, 10) || 128;

/**
 * Format n8n analysis payload as context for Ollama
 * Extracts key modules (summaries, topics, gaps, trends) for RAG
 */
function formatAnalysisAsContext(backendResult) {
  const contextParts = [];

  // Module 1: Summaries
  if (backendResult?.modules?.module1?.summaries) {
    contextParts.push('## Key Summaries:');
    const summaries = backendResult.modules.module1.summaries;
    if (Array.isArray(summaries) && summaries.length > 0) {
      summaries.slice(0, 3).forEach((summary) => {
        const title = summary.paper?.title || summary.title || 'Unknown paper';
        const text = summary.summary || summary.content || '';
        contextParts.push(`- ${title}: ${text.substring(0, 200).replace(/\s+/g, ' ').trim()}`);
      });
    }
  }

  // Module 2: Topics
  if (backendResult?.modules?.module2?.topics) {
    contextParts.push('\n## Main Research Topics:');
    const topics = backendResult.modules.module2.topics;
    if (Array.isArray(topics) && topics.length > 0) {
      topics.slice(0, 5).forEach((topic, idx) => {
        const name = topic.name || topic.label || `Topic ${idx + 1}`;
        contextParts.push(`${idx + 1}. ${name}`);
      });
    }
  }

  // Module 3: Research Gaps
  if (backendResult?.modules?.module3?.gaps) {
    contextParts.push('\n## Research Gaps Identified:');
    const gaps = backendResult.modules.module3.gaps;
    if (Array.isArray(gaps) && gaps.length > 0) {
      gaps.slice(0, 5).forEach((gap, idx) => {
        const statement = gap.gapStatement || gap.description || gap.explanation || 'Gap identified';
        contextParts.push(`${idx + 1}. ${statement.substring(0, 150).replace(/\s+/g, ' ').trim()}`);
      });
    }
  }

  // Module 4: Trends
  if (backendResult?.modules?.module4) {
    contextParts.push('\n## Research Trends:');
    const trends = backendResult.modules.module4.module4_trends || backendResult.modules.module4.trends || [];
    if (Array.isArray(trends) && trends.length > 0) {
      trends.slice(0, 5).forEach((trend, idx) => {
        const name = trend.topic || trend.topicName || trend.name || `Trend ${idx + 1}`;
        const trendDir = trend.trend || 'stable';
        contextParts.push(`${idx + 1}. ${name} (${trendDir})`);
      });
    }
  }

  // Module 5: Visualization/Insights
  if (backendResult?.modules?.module5?.insights) {
    contextParts.push('\n## Key Insights:');
    const insights = backendResult.modules.module5.insights;
    if (Array.isArray(insights) && insights.length > 0) {
      insights.slice(0, 3).forEach((insight) => {
        if (typeof insight === 'string') {
          contextParts.push(`- ${insight.substring(0, 150).replace(/\s+/g, ' ').trim()}`);
        } else if (insight?.description) {
          contextParts.push(`- ${insight.description.substring(0, 150).replace(/\s+/g, ' ').trim()}`);
        }
      });
    }
  }

  return contextParts.join('\n');
}

/**
 * Build prompt for Ollama using analysis payload as RAG context
 */
function buildAnalysisPrompt(question, backendResult) {
  const context = formatAnalysisAsContext(backendResult);

  return `You are a research analyst assistant. Based on the following analysis of research papers, answer the user's question concisely and accurately.

ANALYSIS CONTEXT:
${context}

USER QUESTION: ${question}

ANSWER:`;
}

/**
 * Call Ollama with analysis payload as context
 */
async function askAboutAnalysis(question, backendResult) {
  try {
    if (!question || !question.trim()) {
      throw new Error('Question cannot be empty');
    }

    if (!backendResult) {
      throw new Error('Analysis payload is required');
    }

    const prompt = buildAnalysisPrompt(question.trim(), backendResult);

    const response = await axios.post(
      OLLAMA_API,
      {
        model: OLLAMA_CHAT_MODEL,
        prompt,
        stream: false,
        temperature: 0.3,
        top_p: 0.9,
        num_predict: OLLAMA_MAX_TOKENS,
      },
      { timeout: OLLAMA_TIMEOUT_MS }
    );

    const answer = response?.data?.response || response?.data?.choices?.[0]?.text || '';

    if (!answer || typeof answer !== 'string') {
      throw new Error('No valid response from Ollama');
    }

    return {
      answer: answer.trim(),
      question,
      model: OLLAMA_CHAT_MODEL,
      timestamp: new Date().toISOString(),
      citations: [], // Could extract cited papers from context
    };
  } catch (error) {
    console.error('Chat error:', error.message);
    throw error;
  }
}

module.exports = {
  askAboutAnalysis,
  formatAnalysisAsContext,
  buildAnalysisPrompt,
};
