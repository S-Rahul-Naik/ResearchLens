const {
  tokenize,
  buildVocabulary,
  vectorize,
  cosineSimilarity,
  topTerms,
  toFixedNumber
} = require('../utils/text');

function inferTopicCount(docCount) {
  if (docCount <= 4) return 2;
  if (docCount <= 10) return 3;
  if (docCount <= 20) return 4;
  return 5;
}

function nearestCentroidIndex(vector, centroids) {
  let best = 0;
  let bestScore = -Infinity;

  centroids.forEach((centroid, index) => {
    const score = cosineSimilarity(vector, centroid);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  });

  return best;
}

function averageVectors(vectors, vectorLength) {
  if (!vectors.length) return new Array(vectorLength).fill(0);

  const sum = new Array(vectorLength).fill(0);
  vectors.forEach((vec) => {
    vec.forEach((value, i) => {
      sum[i] += value;
    });
  });

  return sum.map((value) => value / vectors.length);
}

function runSimpleKMeans(vectors, k, maxIterations = 10) {
  const vectorLength = vectors[0]?.length || 0;
  let centroids = vectors.slice(0, k).map((vec) => [...vec]);
  let assignments = new Array(vectors.length).fill(0);

  for (let iter = 0; iter < maxIterations; iter += 1) {
    assignments = vectors.map((vec) => nearestCentroidIndex(vec, centroids));

    const grouped = Array.from({ length: k }, () => []);
    assignments.forEach((clusterIndex, i) => {
      grouped[clusterIndex].push(vectors[i]);
    });

    const nextCentroids = grouped.map((clusterVectors, clusterIndex) => {
      if (!clusterVectors.length) {
        return centroids[clusterIndex];
      }
      return averageVectors(clusterVectors, vectorLength);
    });

    const converged = nextCentroids.every((centroid, i) => {
      const drift = centroid.reduce((acc, value, j) => acc + Math.abs(value - centroids[i][j]), 0);
      return drift < 0.0001;
    });

    centroids = nextCentroids;
    if (converged) break;
  }

  return { centroids, assignments };
}

function topicKeywordsFromMembers(memberDocs, limit = 8) {
  // Build a more sophisticated keyword extraction that prefers domain-specific terms
  const tokenFreq = new Map();
  memberDocs.forEach((doc) => {
    const tokens = tokenize(`${doc.abstract} ${doc.title} ${doc.content}`);
    tokens.forEach((token) => {
      // Boost score for longer, more specific terms (likely domain-specific)
      const boost = token.length >= 8 ? 2 : token.length >= 6 ? 1.5 : 1;
      tokenFreq.set(token, (tokenFreq.get(token) || 0) + boost);
    });
  });
  // Sort by frequency and return top terms
  const sorted = [...tokenFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit * 2) // Get extra to filter
    .filter(([term]) => term.length >= 4) // Only substantial terms
    .slice(0, limit)
    .map(([term]) => term);
  return sorted.length > 0 ? sorted : ['domain-specific', 'topics', 'detected'];
}

function runModule2TopicModeling(papers) {
  const tokenizedDocs = papers.map((paper) => tokenize(`${paper.abstract} ${paper.content}`));
  const vocabulary = buildVocabulary(tokenizedDocs);
  const vectors = tokenizedDocs.map((tokens) => vectorize(tokens, vocabulary));

  const k = Math.min(Math.max(inferTopicCount(papers.length), 2), Math.max(papers.length, 2));
  const { centroids, assignments } = runSimpleKMeans(vectors, k);

  const topics = centroids
    .map((centroid, topicIndex) => {
      const memberIndexes = assignments
        .map((clusterIndex, docIndex) => ({ clusterIndex, docIndex }))
        .filter((item) => item.clusterIndex === topicIndex)
        .map((item) => item.docIndex);

      const memberDocs = memberIndexes.map((docIndex) => papers[docIndex]);
      if (!memberDocs.length) return null;

      const keywords = topicKeywordsFromMembers(memberDocs, 10);
      const coherenceSamples = memberIndexes.map((docIndex) =>
        cosineSimilarity(vectors[docIndex], centroid)
      );
      const coherence = coherenceSamples.reduce((a, b) => a + b, 0) / coherenceSamples.length;

      return {
        topicId: `T${topicIndex + 1}`,
        name: keywords.slice(0, 3).join(' / ') || `Topic ${topicIndex + 1}`,
        keywords,
        paperIds: memberDocs.map((doc) => doc.id),
        centroid,
        coherence: toFixedNumber(coherence)
      };
    })
    .filter(Boolean);

  return {
    module: 'M2 Topic Modeling',
    topics,
    assignments: papers.map((paper, index) => ({
      paperId: paper.id,
      topicId: topics[assignments[index]]?.topicId || topics[0]?.topicId || 'T1'
    })),
    vocabulary
  };
}

module.exports = {
  runModule2TopicModeling
};
