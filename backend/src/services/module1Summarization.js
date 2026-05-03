const { splitSentences, tokenize, topTerms } = require('../utils/text');

function scoreSentences(sentences, keywordSet) {
  return sentences
    .map((sentence) => {
      const tokens = tokenize(sentence);
      const score = tokens.reduce((acc, token) => acc + (keywordSet.has(token) ? 1 : 0), 0);
      return { sentence, score };
    })
    .sort((a, b) => b.score - a.score);
}

function summarizePaper(paper) {
  const source = `${paper.abstract} ${paper.content}`.trim();
  const sentences = splitSentences(source);
  const keywords = topTerms(tokenize(source), 12);
  const scored = scoreSentences(sentences, new Set(keywords));
  const summarySentences = scored.slice(0, 3).map((item) => item.sentence);

  return {
    paperId: paper.id,
    title: paper.title,
    summary: summarySentences.join(' '),
    keywords
  };
}

function runModule1Summarization(papers) {
  const summaries = papers.map(summarizePaper);

  return {
    module: 'M1 Summarization',
    count: summaries.length,
    summaries
  };
}

module.exports = {
  runModule1Summarization
};
