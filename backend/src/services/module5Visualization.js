const { tokenize, topTerms, toFixedNumber } = require('../utils/text');
const { computeEnhancedVisualization } = require('./visualizationEnhancer');

function normalizeTopicId(topic, index) {
  return topic?.topicId || topic?.id || topic?.name || `topic-${index}`;
}

function buildTopicLookup(topics) {
  return topics.map((topic, index) => ({
    ...topic,
    topicId: normalizeTopicId(topic, index),
  }));
}

function resolveTopicForPaper(paper, topics, fallbackIndex) {
  if (!Array.isArray(topics) || topics.length === 0) return null;
  const assigned = topics.find((topic) => Array.isArray(topic.paperIds) && topic.paperIds.includes(paper.id));
  if (assigned) return assigned;
  return topics[fallbackIndex % topics.length] || topics[0] || null;
}

function hashToUnit(value) {
  let hash = 0;
  const input = String(value || '0');
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 1000) / 1000;
}

function paperToPoint(paper, topicIndex) {
  const centerX = (topicIndex % 3) * 4 - 4;
  const centerY = Math.floor(topicIndex / 3) * 4 - 2;
  const noiseX = hashToUnit(`${paper.id}-x`) - 0.5;
  const noiseY = hashToUnit(`${paper.id}-y`) - 0.5;

  return {
    paperId: paper.id,
    title: paper.title,
    topicId: paper.topicId,
    topicName: paper.topicName,
    x: toFixedNumber(centerX + noiseX * 1.8),
    y: toFixedNumber(centerY + noiseY * 1.8),
    keywords: topTerms(tokenize(`${paper.abstract} ${paper.content}`), 5)
  };
}

function runModule5Visualization(papers, topics, gaps) {
  const normalizedTopics = buildTopicLookup(topics);
  const topicIndexMap = new Map(normalizedTopics.map((topic, idx) => [topic.topicId, idx]));

  // Improve spacing: assign papers to topics more deliberately with better distribution
  const points = papers.map((paper, paperIdx) => {
    const topicAssignment = resolveTopicForPaper(paper, normalizedTopics, paperIdx);
    const topicId = topicAssignment?.topicId || normalizedTopics[paperIdx % normalizedTopics.length]?.topicId || normalizedTopics[0]?.topicId;
    const topicIdx = topicIndexMap.get(topicId) ?? (normalizedTopics.length > 0 ? paperIdx % normalizedTopics.length : 0);
    return paperToPoint({ ...paper, topicId, topicName: topicAssignment?.name || topicAssignment?.topicName || topicId }, topicIdx);
  });

  // Calculate topic centers with better distribution based on actual member positions
  const topicCenters = normalizedTopics.map((topic, topicIdx) => {
    const members = points.filter((point) => point.topicId === topic.topicId);
    if (members.length === 0) {
      // Unassigned topic: position it on grid
      return {
        topicId: topic.topicId,
        name: topic.name,
        x: toFixedNumber((topicIdx % 3) * 4 - 4),
        y: toFixedNumber(Math.floor(topicIdx / 3) * 4 - 2)
      };
    }
    const x = members.reduce((acc, item) => acc + item.x, 0) / members.length;
    const y = members.reduce((acc, item) => acc + item.y, 0) / members.length;

    return {
      topicId: topic.topicId,
      name: topic.name,
      x: toFixedNumber(x),
      y: toFixedNumber(y)
    };
  });

  const links = gaps.map((gap) => ({
    sourceTopicId: gap.topicA,
    targetTopicId: gap.topicB,
    gapScore: gap.gapScore,
    severity: gap.severity,
    reliability: gap.reliability,
    coOccurrence: gap.coOccurrence,
  }));

  return {
    module: 'M5 Visualization Map',
    map: {
      points,
      topicCenters,
      links
    }
  };
}

/**
 * Enhanced async version using Ollama-powered force-directed layout
 * Provides better semantic positioning like Connected Papers
 */
async function runModule5VisualizationWithOllama(papers, topics, gaps) {
  try {
    // Try to compute enhanced visualization using Ollama
    const enhanced = await computeEnhancedVisualization(papers, topics, gaps);
    
    if (enhanced) {
      return {
        module: 'M5 Visualization Map - Enhanced',
        map: enhanced,
        enhancedLayout: true,
      };
    }
  } catch (error) {
    console.warn('Enhanced visualization failed, falling back to basic:', error.message);
  }

  // Fallback to basic visualization
  return runModule5Visualization(papers, topics, gaps);
}

module.exports = {
  runModule5Visualization,
  runModule5VisualizationWithOllama
};
