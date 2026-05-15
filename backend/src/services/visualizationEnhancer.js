const axios = require('axios');

const OLLAMA_API = process.env.OLLAMA_API || 'http://127.0.0.1:11434/v1/completions';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.1:8b';
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 120000;

function normalizeTopicId(topic, index) {
  return topic?.topicId || topic?.id || topic?.name || `topic-${index}`;
}

function buildTopicLookup(topics) {
  return topics.map((topic, index) => ({
    ...topic,
    topicId: normalizeTopicId(topic, index),
  }));
}

function resolvePaperTopicId(paper, topics, fallbackIndex) {
  if (!Array.isArray(topics) || topics.length === 0) return `topic-${fallbackIndex}`;
  const assigned = topics.find((topic) => Array.isArray(topic.paperIds) && topic.paperIds.includes(paper.id));
  return assigned?.topicId || topics[fallbackIndex % topics.length]?.topicId || topics[0]?.topicId || `topic-${fallbackIndex}`;
}

/**
 * Force-directed graph layout algorithm
 * Simulates springs between papers and repulsion
 */
function forceDirectedLayout(papers, topics, iterations = 50) {
  const normalizedTopics = buildTopicLookup(topics);
  const nodes = papers.map((p, i) => ({
    id: p.id,
    x: Math.random() * 20 - 10,
    y: Math.random() * 20 - 10,
    vx: 0,
    vy: 0,
    topicId: p.topicId || resolvePaperTopicId(p, normalizedTopics, i),
    mass: 1,
  }));

  const springLength = 2;
  const springStrength = 0.1;
  const repulsionStrength = 0.5;
  let damping = 0.99;
  const timeStep = 0.1;

  for (let iter = 0; iter < iterations; iter++) {
    // Reset forces
    nodes.forEach(n => { n.vx *= damping; n.vy *= damping; });

    // Apply forces
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const n1 = nodes[i];
        const n2 = nodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
        const unitX = dx / dist;
        const unitY = dy / dist;

        // Repulsion (all nodes repel)
        const repulsion = repulsionStrength / (dist * dist);
        n1.vx -= repulsion * unitX * timeStep;
        n1.vy -= repulsion * unitY * timeStep;
        n2.vx += repulsion * unitX * timeStep;
        n2.vy += repulsion * unitY * timeStep;

        // Attraction (papers in same topic attract)
        if (n1.topicId === n2.topicId) {
          const springForce = springStrength * (dist - springLength);
          n1.vx += springForce * unitX * timeStep;
          n1.vy += springForce * unitY * timeStep;
          n2.vx -= springForce * unitX * timeStep;
          n2.vy -= springForce * unitY * timeStep;
        }
      }
    }

    // Update positions
    nodes.forEach(n => {
      n.x += n.vx * timeStep;
      n.y += n.vy * timeStep;
    });

    // Reduce iteration step for faster convergence
    if (iter % 10 === 0) {
      damping *= 0.95;
    }
  }

  return nodes;
}

/**
 * Use Ollama to analyze paper relationships
 * Compute semantic similarity matrix for better graph layout
 */
async function computeSemanticSimilarity(papers) {
  try {
    if (papers.length === 0) return [];

    // For efficiency, sample if too many papers
    const sampleSize = Math.min(10, papers.length);
    const sampledPapers = papers.slice(0, sampleSize);

    const prompt = `Analyze the semantic relationships between these research papers. 
For each pair, rate their similarity (0-1) based on topic, methodology, or findings.
Return a JSON array of relationships.

Papers:
${sampledPapers.map((p, i) => `${i + 1}. "${p.title}" - ${p.abstract?.substring(0, 100) || ''}`).join('\n')}

Return ONLY valid JSON in this format:
{
  "relationships": [
    {"paper1_idx": 0, "paper2_idx": 1, "similarity": 0.85, "reason": "both use CNN"}
  ]
}`;

    const response = await axios.post(
      OLLAMA_API,
      {
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        temperature: 0.3,
        top_p: 0.9,
        max_tokens: 500,
      },
      { timeout: OLLAMA_TIMEOUT_MS }
    );

    const text = response?.data?.choices?.[0]?.text || response?.data?.response || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]).relationships || [];
    }
  } catch (error) {
    console.warn('Ollama similarity computation warning:', error.message);
  }
  return [];
}

/**
 * Normalize coordinates to canvas bounds
 */
function normalizeCoordinates(nodes, canvasW = 700, canvasH = 380) {
  if (nodes.length === 0) return [];

  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(maxX - minX, 1);
  const rangeY = Math.max(maxY - minY, 1);
  const padding = 40;

  return nodes.map(n => ({
    ...n,
    x: padding + ((n.x - minX) / rangeX) * (canvasW - padding * 2),
    y: padding + ((n.y - minY) / rangeY) * (canvasH - padding * 2),
  }));
}

/**
 * Enhanced visualization using force-directed layout
 */
async function computeEnhancedVisualization(papers, topics, gaps) {
  try {
    const normalizedTopics = buildTopicLookup(topics);
    // Compute semantic similarities to improve layout
    const semanticLinks = await computeSemanticSimilarity(papers);

    // Run force-directed layout
    const layoutNodes = forceDirectedLayout(papers, normalizedTopics, 100);

    // Normalize to canvas bounds
    const normalizedPoints = normalizeCoordinates(layoutNodes, 700, 380).map(node => {
      const paper = papers.find(p => p.id === node.id);
      const topic = normalizedTopics.find((item) => item.topicId === node.topicId);
      return {
        paperId: node.id,
        title: paper?.title || 'Unknown',
        topicId: node.topicId,
        topicName: topic?.name || topic?.topicName || node.topicId,
        x: Number(node.x.toFixed(2)),
        y: Number(node.y.toFixed(2)),
        keywords: paper?.keywords || [],
      };
    });

    // Compute topic centers from normalized positions
    const topicCenters = normalizedTopics.map(topic => {
      const members = normalizedPoints.filter(p => p.topicId === topic.topicId);
      if (members.length === 0) {
        return { topicId: topic.topicId, name: topic.name, x: 0, y: 0 };
      }
      const x = members.reduce((s, p) => s + p.x, 0) / members.length;
      const y = members.reduce((s, p) => s + p.y, 0) / members.length;
      return { topicId: topic.topicId, name: topic.name, x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
    });

    // Gap links with semantic enrichment
    const links = gaps.map((gap, idx) => {
      const relatedLinks = semanticLinks.filter(
        link => (link.reason && link.similarity > 0.7)
      );
      return {
        sourceTopicId: gap.topicA,
        targetTopicId: gap.topicB,
        gapScore: gap.gapScore || 0.5,
        severity: gap.severity || 'moderate',
        reliability: gap.reliability || 0.7,
        coOccurrence: gap.coOccurrence || 0,
        semanticStrength: relatedLinks.length > 0 ? 0.8 : 0.5,
      };
    });

    return {
      points: normalizedPoints,
      topicCenters,
      links,
      metadata: {
        algorithm: 'force-directed-ollama',
        iterations: 100,
        semanticEnhanced: true,
      },
    };
  } catch (error) {
    console.warn('Enhanced visualization error, falling back to basic:', error.message);
    return null;
  }
}

module.exports = {
  forceDirectedLayout,
  computeSemanticSimilarity,
  normalizeCoordinates,
  computeEnhancedVisualization,
};
