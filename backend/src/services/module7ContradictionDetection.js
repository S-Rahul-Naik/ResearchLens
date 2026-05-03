const { splitSentences, tokenize, cosineSimilarity, buildVocabulary, vectorize, toFixedNumber } = require('../utils/text');

const POSITIVE_TERMS = ['improves', 'increase', 'higher', 'better', 'outperforms', 'effective'];
const NEGATIVE_TERMS = ['decrease', 'lower', 'worse', 'fails', 'ineffective', 'not'];

function polarityScore(sentence) {
  const tokens = tokenize(sentence);
  const pos = tokens.filter((token) => POSITIVE_TERMS.includes(token)).length;
  const neg = tokens.filter((token) => NEGATIVE_TERMS.includes(token)).length;
  return pos - neg;
}

function candidateClaims(paper) {
  return splitSentences(`${paper.abstract} ${paper.content}`)
    .filter((sentence) => /show|indicat|suggest|conclude|outperform|improv/i.test(sentence))
    .slice(0, 8)
    .map((sentence) => ({
      paperId: paper.id,
      title: paper.title,
      sentence,
      polarity: polarityScore(sentence)
    }));
}

function runModule7ContradictionDetection(papers, topics) {
  const claims = papers.flatMap(candidateClaims);
  const vocabulary = buildVocabulary(claims.map((item) => tokenize(item.sentence)));

  const contradictions = [];

  for (let i = 0; i < claims.length; i += 1) {
    for (let j = i + 1; j < claims.length; j += 1) {
      if (claims[i].paperId === claims[j].paperId) continue;

      const topicA = topics.find((topic) => topic.paperIds.includes(claims[i].paperId));
      const topicB = topics.find((topic) => topic.paperIds.includes(claims[j].paperId));
      if (!topicA || !topicB || topicA.topicId !== topicB.topicId) continue;

      const vecA = vectorize(tokenize(claims[i].sentence), vocabulary);
      const vecB = vectorize(tokenize(claims[j].sentence), vocabulary);
      const similarity = cosineSimilarity(vecA, vecB);

      const oppositePolarity = claims[i].polarity * claims[j].polarity < 0;

      if (similarity >= 0.2 && oppositePolarity) {
        contradictions.push({
          contradictionId: `C${contradictions.length + 1}`,
          topicId: topicA.topicId,
          topicName: topicA.name,
          claimA: claims[i],
          claimB: claims[j],
          similarity: toFixedNumber(similarity),
          confidence: toFixedNumber(Math.min(0.95, similarity + 0.25))
        });
      }
    }
  }

  return {
    module: 'M7 Contradiction Detection',
    contradictions
  };
}

module.exports = {
  runModule7ContradictionDetection
};
