const STOP_WORDS = new Set([
  // Common English stop words
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he', 'in',
  'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with',
  'this', 'these', 'those', 'their', 'than', 'then', 'into', 'about', 'which', 'can',
  'also', 'our', 'we', 'they', 'using', 'used', 'use', 'been', 'such', 'not', 'or',
  'more', 'more', 'less', 'most', 'least', 'much', 'many', 'large', 'small', 'large',
  'high', 'low', 'good', 'well', 'better', 'best', 'different', 'same', 'similar',
  'other', 'another', 'some', 'any', 'all', 'both', 'each', 'few', 'every', 'only',
  'just', 'very', 'so', 'too', 'also', 'yet', 'still', 'even', 'already',
  // Action/descriptor words too generic for keywords
  'output', 'input', 'available', 'given', 'trained', 'applied', 'apply',
  'across', 'within', 'among', 'along', 'through', 'between', 'against',
  'without', 'while', 'where', 'when', 'since', 'though', 'although',
  'however', 'therefore', 'moreover', 'furthermore', 'thus', 'hence',
  'context', 'strategy', 'path', 'layer', 'layers', 'part', 'parts',
  'show', 'shows', 'shown', 'lead', 'leads', 'allow', 'allows', 'require',
  'requires', 'make', 'made', 'makes', 'set', 'sets', 'per', 'via', 'non',
  'first', 'second', 'third', 'last', 'next', 'prior', 'previous', 'later',
  'number', 'numbers', 'type', 'types', 'form', 'forms', 'level', 'levels',
  // Generic ML/research terms that appear in all papers
  'model', 'models', 'data', 'method', 'methods', 'approach', 'learning', 'network',
  'work', 'paper', 'papers', 'research', 'study', 'proposed', 'propose', 'present',
  'presented', 'result', 'results', 'performance', 'evaluation', 'analysis', 'system',
  'training', 'based', 'improve', 'improved', 'novel', 'new', 'state', 'art', 'sota',
  'demonstrate', 'demonstrates', 'achieve', 'achieved', 'process', 'technique',
  'techniques', 'task', 'tasks', 'problem', 'problems', 'solution', 'solutions',
  'framework', 'frameworks', 'algorithm', 'algorithms', 'feature', 'features',
  'example', 'examples', 'including', 'parameters', 'parameter', 'optimization',
  'optimize', 'loss', 'cost', 'function', 'functions', 'objective',
  'experiment', 'experiments', 'dataset', 'datasets', 'benchmark',
]);

const KEYWORD_NOISE = new Set([
  'become', 'becomes', 'became', 'various', 'overall', 'further',
  'vision', 'image', 'images', 'network', 'networks', 'architecture', 'architectures',
  'several', 'certain', 'multiple', 'general', 'common', 'specific', 'particular',
  'significant', 'important', 'effective', 'efficient', 'able', 'possible',
]);

function normalizeText(text = '') {
  return text
    .replace(/\s+/g, ' ')
    .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
    .toLowerCase()
    .trim();
}

function splitSentences(text = '') {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function tokenize(text = '') {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token && !STOP_WORDS.has(token) && token.length > 2);
}

function termFrequency(tokens) {
  const tf = new Map();
  tokens.forEach((token) => {
    tf.set(token, (tf.get(token) || 0) + 1);
  });
  return tf;
}

function topTerms(tokens, limit = 8) {
  const tf = [...termFrequency(tokens).entries()].sort((a, b) => b[1] - a[1]);
  return tf.slice(0, limit).map(([term]) => term);
}

function extractKeywords(text = '', limit = 12) {
  const freq = termFrequency(tokenize(text));
  const ranked = [...freq.entries()]
    .filter(([term, count]) => {
      if (count < 2) return false;
      if (term.length < 4) return false;
      if (/^\d+$/.test(term)) return false;
      if (/^(19|20)\d{2}$/.test(term)) return false;
      if (KEYWORD_NOISE.has(term)) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1]);
  return ranked.slice(0, limit).map(([term]) => term);
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i += 1) {
    dot += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  if (!magA || !magB) {
    return 0;
  }

  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function buildVocabulary(tokenizedDocs) {
  const vocabSet = new Set();
  tokenizedDocs.forEach((tokens) => tokens.forEach((token) => vocabSet.add(token)));
  return [...vocabSet];
}

function vectorize(tokens, vocabulary) {
  const tf = termFrequency(tokens);
  return vocabulary.map((word) => tf.get(word) || 0);
}

function toFixedNumber(value, digits = 3) {
  return Number(value.toFixed(digits));
}

module.exports = {
  normalizeText,
  splitSentences,
  tokenize,
  topTerms,
  extractKeywords,
  cosineSimilarity,
  buildVocabulary,
  vectorize,
  toFixedNumber
};
