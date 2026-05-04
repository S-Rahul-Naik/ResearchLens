const axios = require('axios');
const {
  splitSentences,
  tokenize,
  buildVocabulary,
  vectorize,
  cosineSimilarity,
  toFixedNumber
} = require('../utils/text');

const OLLAMA_API = process.env.OLLAMA_API || 'http://127.0.0.1:11434/v1/completions';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';

function createChunks(papers) {
  const chunks = [];
  papers.forEach((paper) => {
    const sentences = splitSentences(`${paper.abstract} ${paper.content}`);
    for (let i = 0; i < sentences.length; i += 3) {
      const text = sentences.slice(i, i + 3).join(' ');
      if (text.trim()) {
        chunks.push({
          chunkId: `${paper.id}-C${Math.floor(i / 3) + 1}`,
          paperId: paper.id,
          title: paper.title,
          text
        });
      }
    }
  });
  return chunks;
}

async function callOllama(prompt) {
  try {
    const response = await axios.post(
      OLLAMA_API,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        temperature: 0.7,
        top_p: 0.9,
      },
      { timeout: 60000 }
    );
    
    if (response.data && response.data.response) {
      return response.data.response.trim();
    }
    throw new Error('No response from Ollama');
  } catch (error) {
    console.error('Ollama API Error:', error.message);
    throw error;
  }
}

function buildOllamaPrompt(question, rankedChunks, topics, gaps, trends, papers) {
  // Build comprehensive context for Ollama - optimized for length
  let contextParts = [];

  // 1. Corpus overview
  contextParts.push(`Research Corpus: ${papers.length} papers analyzed`);
  
  // 2. Top papers (just titles + years)
  if (papers.length > 0) {
    contextParts.push('\nKey Papers:');
    papers.slice(0, 5).forEach((paper, idx) => {
      contextParts.push(`${idx + 1}. ${paper.title} (${paper.year})`);
    });
  }

  // 3. Topics summary
  if (topics && topics.length > 0) {
    contextParts.push('\nMain Topics:');
    topics.slice(0, 5).forEach((topic, idx) => {
      contextParts.push(`${idx + 1}. ${topic.name || 'Unknown'}`);
    });
  }

  // 4. Research gaps summary
  if (gaps && gaps.length > 0) {
    contextParts.push('\nResearch Gaps:');
    gaps.slice(0, 3).forEach((gap, idx) => {
      const desc = gap.gapStatement || gap.description || 'Gap between topics';
      contextParts.push(`${idx + 1}. ${desc}`);
    });
  }

  // 5. Trends summary
  if (trends && trends.length > 0) {
    contextParts.push('\nResearch Trends:');
    trends.slice(0, 3).forEach((trend, idx) => {
      contextParts.push(`${idx + 1}. ${trend.topicName || trend.name || 'Unknown'}: ${trend.trend || 'stable'}`);
    });
  }

  // 6. Top relevant passages (main context)
  if (rankedChunks && rankedChunks.length > 0) {
    contextParts.push('\nMost Relevant Content:');
    rankedChunks.slice(0, 4).forEach((chunk, idx) => {
      contextParts.push(`${idx + 1}. From "${chunk.title}":`);
      contextParts.push(`"${chunk.text.substring(0, 300)}..."`);
    });
  }

  contextParts.push('\nUser Question:');
  contextParts.push(question);
  
  contextParts.push('\nInstructions: Answer based on the corpus above. Cite papers when possible. Keep answer under 200 words.');

  return contextParts.join('\n');
}

async function runModule6Chatbot(papers, question, topics = [], gaps = [], trends = []) {
  if (!question || !question.trim()) {
    return {
      module: 'M6 RAG Chatbot',
      answer: 'Please provide a question.',
      citations: []
    };
  }

  try {
    // Create chunks for semantic retrieval
    const chunks = createChunks(papers);
    if (chunks.length === 0) {
      return {
        module: 'M6 RAG Chatbot',
        answer: 'No content found in papers to answer your question.',
        citations: []
      };
    }

    const tokenized = chunks.map((chunk) => tokenize(chunk.text));
    const vocabulary = buildVocabulary([...tokenized, tokenize(question)]);
    const chunkVectors = tokenized.map((tokens) => vectorize(tokens, vocabulary));
    const questionVector = vectorize(tokenize(question), vocabulary);

    // Rank chunks by relevance
    const ranked = chunks
      .map((chunk, i) => ({
        ...chunk,
        score: cosineSimilarity(questionVector, chunkVectors[i])
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Build comprehensive prompt and call Ollama
    const prompt = buildOllamaPrompt(question, ranked, topics, gaps, trends, papers);
    console.log('Calling Ollama with prompt length:', prompt.length);
    
    let answer = '';
    try {
      answer = await callOllama(prompt);
      console.log('Ollama response received, length:', answer.length);
    } catch (ollamaErr) {
      console.error('Ollama failed, using chunk summary fallback:', ollamaErr.message);
      // Fallback: summarize top chunks if Ollama fails
      answer = ranked
        .slice(0, 3)
        .map((chunk, i) => `${i + 1}. From "${chunk.title}": ${chunk.text.substring(0, 200)}`)
        .join('\n\n');
    }

    // Generate citations from ranked chunks
    const citations = ranked
      .filter((item) => item.score > 0.05)
      .map((item) => ({
        paperId: item.paperId,
        title: item.title,
        chunkId: item.chunkId,
        relevance: toFixedNumber(item.score)
      }));

    return {
      module: 'M6 RAG Chatbot',
      answer: answer || 'Unable to generate an answer for this question.',
      citations
    };
  } catch (error) {
    console.error('Module 6 Error:', error);
    throw error;
  }
}

module.exports = {
  runModule6Chatbot
};
