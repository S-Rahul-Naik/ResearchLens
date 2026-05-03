const {
  splitSentences,
  tokenize,
  buildVocabulary,
  vectorize,
  cosineSimilarity,
  toFixedNumber
} = require('../utils/text');

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

function runModule6Chatbot(papers, question) {
  if (!question || !question.trim()) {
    return {
      module: 'M6 RAG Chatbot',
      answer: 'Please provide a question.',
      citations: []
    };
  }

  const chunks = createChunks(papers);
  const tokenized = chunks.map((chunk) => tokenize(chunk.text));
  const vocabulary = buildVocabulary([...tokenized, tokenize(question)]);
  const chunkVectors = tokenized.map((tokens) => vectorize(tokens, vocabulary));
  const questionVector = vectorize(tokenize(question), vocabulary);

  const ranked = chunks
    .map((chunk, i) => ({
      ...chunk,
      score: cosineSimilarity(questionVector, chunkVectors[i])
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const answer = ranked
    .map((item, idx) => `${idx + 1}. ${item.text}`)
    .join(' ')
    .trim();

  const citations = ranked.map((item) => ({
    paperId: item.paperId,
    title: item.title,
    chunkId: item.chunkId,
    relevance: toFixedNumber(item.score)
  }));

  return {
    module: 'M6 RAG Chatbot',
    answer:
      answer || 'I could not find enough grounded evidence in the uploaded corpus for this question.',
    citations
  };
}

module.exports = {
  runModule6Chatbot
};
