const path = require('path');
const { runPythonJson } = require('./pythonBridge');
const { generateTopicLabel } = require('./ollamaBridge');

const TOPIC_MODELING_SCRIPT = path.resolve(__dirname, '../../python/topic_modeling_cli.py');

/**
 * Enhance topic labels using Ollama LLM reasoning.
 * 
 * @param {object} topic - Topic from Python clustering
 * @param {array} papers - Papers in the topic
 * @returns {Promise<object>} Enhanced topic with LLM labels
 */
async function enrichTopicWithLLMLabel(topic, papers) {
  try {
    // Prepare papers with methodology from fullText if available
    const enrichedPapers = papers.map(p => ({
      title: p.title || 'Unknown',
      abstract: p.abstract || '',
      methodology: p.fullText?.methodology || p.content || p.abstract || '',
      content: p.content || '',
    }));

    // Call Ollama to generate semantic labels
    const llmResult = await generateTopicLabel(enrichedPapers, { temperature: 0.5 });

    // Merge LLM results with heuristic labels
    return {
      ...topic,
      llm_label: llmResult.topic_label,
      llm_domain_summary: llmResult.domain_summary,
      llm_methodological_theme: llmResult.methodological_theme,
      llm_paradigm: llmResult.paradigm,
      llm_confidence: llmResult.confidence,
      // Keep original heuristic label as fallback
      heuristic_label: topic.name,
    };
  } catch (err) {
    console.warn(`LLM label generation failed for topic "${topic.name}": ${err.message}`);
    // Gracefully degrade to heuristic label if Ollama fails
    return {
      ...topic,
      llm_label: null,
      llm_confidence: 0,
      heuristic_label: topic.name,
    };
  }
}

function runModule2TopicModeling(papers) {
  const payload = {
    papers: Array.isArray(papers) ? papers : []
  };

  const result = runPythonJson(TOPIC_MODELING_SCRIPT, payload);

  return {
    module: 'M2 Topic Modeling',
    ...result
  };
}

/**
 * Run topic modeling with LLM enhancement (async version).
 * 
 * @param {array} papers - Papers for analysis
 * @returns {Promise<object>} Topics with LLM labels
 */
async function runModule2TopicModelingWithLLM(papers) {
  // Step 1: Run Python clustering pipeline
  const payload = {
    papers: Array.isArray(papers) ? papers : []
  };

  const result = runPythonJson(TOPIC_MODELING_SCRIPT, payload);

  // Step 2: Enhance each topic with LLM labels (parallel)
  if (result.topics && Array.isArray(result.topics)) {
    try {
      const enrichedTopics = await Promise.all(
        result.topics.map(topic => {
          // Get papers in this topic
          const topicPapers = papers.filter(p => topic.paperIds?.includes(p.id));
          return enrichTopicWithLLMLabel(topic, topicPapers);
        })
      );

      return {
        module: 'M2 Topic Modeling',
        ...result,
        topics: enrichedTopics,
      };
    } catch (err) {
      console.error('LLM enhancement failed, returning heuristic results:', err.message);
      // Fallback to original results if LLM enhancement fails
      return {
        module: 'M2 Topic Modeling',
        ...result,
      };
    }
  }

  return {
    module: 'M2 Topic Modeling',
    ...result
  };
}

module.exports = {
  runModule2TopicModeling,
  runModule2TopicModelingWithLLM,
};
