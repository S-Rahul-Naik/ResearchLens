const {
  tokenize,
  vectorize,
  cosineSimilarity,
  toFixedNumber
} = require('../utils/text');

function topicMemberScore(paperTokens, topicKeywords) {
  const overlap = topicKeywords.filter((word) => paperTokens.includes(word)).length;
  return topicKeywords.length ? overlap / topicKeywords.length : 0;
}

function runModule3GapDetection(papers, topics) {
  const vocabulary = [...new Set(topics.flatMap((topic) => topic.keywords))];
  const topicVectors = topics.map((topic) => vectorize(topic.keywords, vocabulary));
  const paperTokens = papers.map((paper) => tokenize(`${paper.abstract} ${paper.content}`));

  const gaps = [];

  for (let i = 0; i < topics.length; i += 1) {
    for (let j = i + 1; j < topics.length; j += 1) {
      const sim = cosineSimilarity(topicVectors[i], topicVectors[j]);

      const jointPapers = papers.filter((_, paperIndex) => {
        const scoreA = topicMemberScore(paperTokens[paperIndex], topics[i].keywords);
        const scoreB = topicMemberScore(paperTokens[paperIndex], topics[j].keywords);
        return scoreA >= 0.2 && scoreB >= 0.2;
      });

      const coOccurrence = jointPapers.length;
      const normalizedCoOcc = papers.length ? coOccurrence / papers.length : 0;
      const gapScore = sim * (1 - normalizedCoOcc);

      if (sim >= 0.15) {
        gaps.push({
          gapId: `G${gaps.length + 1}`,
          topicA: topics[i].topicId,
          topicB: topics[j].topicId,
          topicALabel: topics[i].name,
          topicBLabel: topics[j].name,
          similarity: toFixedNumber(sim),
          coOccurrence,
          gapScore: toFixedNumber(gapScore),
          severity: gapScore >= 0.5 ? 'critical' : gapScore >= 0.3 ? 'moderate' : 'low',
          evidencePaperIds: jointPapers.slice(0, 3).map((paper) => paper.id),
          recommendation: `Investigate bridging work between ${topics[i].name} and ${topics[j].name}.`
        });
      }
    }
  }

  return {
    module: 'M3 Gap Detection',
    formula: 'gapScore = similarity(topicA, topicB) * (1 - normalizedCoOccurrence)',
    gaps: gaps.sort((a, b) => b.gapScore - a.gapScore)
  };
}

module.exports = {
  runModule3GapDetection
};
