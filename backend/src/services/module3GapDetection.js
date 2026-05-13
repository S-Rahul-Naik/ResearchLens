const path = require('path');
const { runPythonJson } = require('./pythonBridge');

const GAP_DETECTION_SCRIPT = path.resolve(__dirname, '../../python/gap_detection_cli.py');

const { evaluateResearchGap, verifyBridgingPaper } = require('./ollamaBridge');

function runModule3GapDetection(papers, topics) {
  const result = runPythonJson(GAP_DETECTION_SCRIPT, {
    papers: Array.isArray(papers) ? papers : [],
    topics: Array.isArray(topics) ? topics : []
  });

  return {
    module: 'M3 Gap Detection',
    ...result
  };
}

/**
 * Enhance gap detection with LLM reasoning for gap quality assessment.
 * 
 * @param {object} gap - Gap from Python gap detection
 * @param {array} topic1Papers - Papers in topic 1
 * @param {array} topic2Papers - Papers in topic 2
 * @returns {Promise<object>} Enhanced gap with LLM assessment
 */
async function enrichGapWithLLMVerification(gap, topic1Papers, topic2Papers) {
  try {
    // Prepare topic context
    const topic1 = {
      label: gap.topic1Name || 'Unknown Topic 1',
      methodology: topic1Papers.map(p => p.fullText?.methodology || p.content).filter(Boolean).slice(0, 2).join('. '),
      yearRange: `${Math.min(...topic1Papers.map(p => p.year || 2024))} - ${Math.max(...topic1Papers.map(p => p.year || 2024))}`,
    };

    const topic2 = {
      label: gap.topic2Name || 'Unknown Topic 2',
      methodology: topic2Papers.map(p => p.fullText?.methodology || p.content).filter(Boolean).slice(0, 2).join('. '),
      yearRange: `${Math.min(...topic2Papers.map(p => p.year || 2024))} - ${Math.max(...topic2Papers.map(p => p.year || 2024))}`,
    };

    // Evaluate gap quality with LLM
    const gapAssessment = await evaluateResearchGap(topic1, topic2, { temperature: 0.5 });

    // Verify bridging papers if available
    let verifiedBridgingPapers = [];
    if (gap.bridgeCandidates && Array.isArray(gap.bridgeCandidates)) {
      verifiedBridgingPapers = await Promise.all(
        gap.bridgeCandidates.slice(0, 3).map(async (paper) => {
          try {
            const verification = await verifyBridgingPaper(
              { title: paper.title || 'Unknown', abstract: paper.abstract || '', methodology: paper.fullText?.methodology || '' },
              topic1,
              topic2,
              { temperature: 0.5 }
            );
            return {
              ...paper,
              llm_is_bridging: verification.is_bridging,
              llm_bridging_evidence: verification.bridging_evidence,
              llm_bridging_confidence: verification.confidence,
            };
          } catch (err) {
            console.warn(`Bridging paper verification failed: ${err.message}`);
            return { ...paper, llm_is_bridging: null, llm_bridging_confidence: 0 };
          }
        })
      );
    }

    // Merge LLM assessment with original gap
    return {
      ...gap,
      llm_is_gap: gapAssessment.is_gap,
      llm_gap_explanation: gapAssessment.explanation,
      llm_gap_significance: gapAssessment.gap_significance,
      llm_integration_opportunity: gapAssessment.integration_opportunity,
      llm_gap_confidence: gapAssessment.confidence,
      llm_verified_bridging_papers: verifiedBridgingPapers,
    };
  } catch (err) {
    console.warn(`LLM gap enhancement failed for gap "${gap.gapId}": ${err.message}`);
    // Graceful degradation
    return {
      ...gap,
      llm_is_gap: null,
      llm_gap_confidence: 0,
    };
  }
}

/**
 * Run gap detection with LLM enhancement (async version).
 * 
 * @param {array} papers - Papers for analysis
 * @param {array} topics - Topics from module 2
 * @returns {Promise<object>} Gaps with LLM verification
 */
async function runModule3GapDetectionWithLLM(papers, topics) {
  // Step 1: Run Python gap detection pipeline
  const result = runModule3GapDetection(papers, topics);

  // Step 2: Enhance each gap with LLM verification (parallel, limited concurrency)
  if (result.gaps && Array.isArray(result.gaps)) {
    try {
      // Process gaps in batches to avoid overwhelming Ollama
      const batchSize = 3;
      const enrichedGaps = [];

      for (let i = 0; i < result.gaps.length; i += batchSize) {
        const batch = result.gaps.slice(i, i + batchSize);
        const enrichedBatch = await Promise.all(
          batch.map(gap => {
            // Get papers in each topic
            const topic1Papers = papers.filter(p => gap.topic1Papers?.includes(p.id));
            const topic2Papers = papers.filter(p => gap.topic2Papers?.includes(p.id));
            return enrichGapWithLLMVerification(gap, topic1Papers, topic2Papers);
          })
        );
        enrichedGaps.push(...enrichedBatch);
      }

      return {
        module: 'M3 Gap Detection',
        ...result,
        gaps: enrichedGaps,
        llm_enhanced: true,
      };
    } catch (err) {
      console.error('LLM gap enhancement failed, returning heuristic results:', err.message);
      // Fallback to original results if LLM enhancement fails
      return {
        module: 'M3 Gap Detection',
        ...result,
      };
    }
  }

  return {
    module: 'M3 Gap Detection',
    ...result
  };
}

module.exports = {
  runModule3GapDetection,
  runModule3GapDetectionWithLLM,
};

