const http = require('http');

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b-instruct';
const REQUEST_TIMEOUT = 60000; // 60s timeout

/**
 * Call Ollama API with structured JSON output.
 * 
 * @param {string} prompt - The user prompt
 * @param {object} options - Configuration options
 * @param {string} options.model - Model name (default: qwen2.5:7b-instruct)
 * @param {boolean} options.stream - Whether to stream response (default: false)
 * @param {number} options.temperature - Sampling temperature (0-1, default: 0.7)
 * @param {number} options.top_p - Nucleus sampling parameter (default: 0.9)
 * @param {number} options.timeout - Request timeout in ms (default: 60000)
 * @returns {Promise<object>} Parsed JSON response from Ollama
 */
function callOllama(prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const {
      model = DEFAULT_MODEL,
      stream = false,
      temperature = 0.7,
      top_p = 0.9,
      num_predict,
      timeout = REQUEST_TIMEOUT,
    } = options;

    const requestBody = {
      model,
      prompt,
      stream,
      temperature,
      top_p,
      format: 'json', // Request JSON format output
    };

    if (typeof num_predict === 'number') {
      requestBody.num_predict = num_predict;
    }

    const urlObj = new URL(`${OLLAMA_BASE_URL}/api/generate`);
    const timeoutId = setTimeout(() => {
      reject(new Error(`Ollama request timeout after ${timeout}ms`));
    }, timeout);

    const req = http.request(
      {
        method: 'POST',
        hostname: urlObj.hostname,
        port: urlObj.port || 11434,
        path: urlObj.pathname,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(JSON.stringify(requestBody)),
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          clearTimeout(timeoutId);
          try {
            // Parse streaming response (one JSON object per line) or single response
            const lines = data.trim().split('\n').filter(Boolean);
            let fullResponse = '';

            for (const line of lines) {
              const parsed = JSON.parse(line);
              if (parsed.response) {
                fullResponse += parsed.response;
              }
            }

            // Try to parse the accumulated response as JSON
            try {
              const result = JSON.parse(fullResponse);
              resolve(result);
            } catch (parseErr) {
              // Attempt to extract JSON object from response (handle cases where Ollama adds extra text)
              const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const extracted = JSON.parse(jsonMatch[0]);
                  console.log('Successfully extracted valid JSON from Ollama response');
                  resolve(extracted);
                } catch (extractErr) {
                  // Could not extract valid JSON
                  console.warn(`Ollama response contains JSON-like structure but is invalid: ${extractErr.message}`);
                  console.warn(`First 300 chars: ${fullResponse.substring(0, 300)}`);
                  resolve({ raw_response: fullResponse, error: 'not_json' });
                }
              } else {
                // No JSON structure found at all
                console.warn(`Ollama response is not valid JSON and contains no JSON structure`);
                console.warn(`Response: ${fullResponse.substring(0, 300)}`);
                resolve({ raw_response: fullResponse, error: 'not_json' });
              }
            }
          } catch (err) {
            reject(new Error(`Failed to parse Ollama response: ${err.message}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      clearTimeout(timeoutId);
      reject(new Error(`Ollama API call failed: ${err.message}`));
    });

    req.write(JSON.stringify(requestBody));
    req.end();
  });
}

/**
 * Generate topic labels for a cluster of papers using Ollama.
 * 
 * @param {array} papers - Papers in the cluster (with title, abstract, methodology)
 * @param {object} options - Configuration options
 * @returns {Promise<object>} { topic_label, domain_summary, methodological_theme, paradigm, confidence }
 */
async function generateTopicLabel(papers, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  
  const paperContext = papers
    .map(p => `- Title: ${p.title}\n  Abstract: ${p.abstract}\n  Methodology: ${p.methodology || p.content || 'N/A'}`)
    .join('\n\n');

  const prompt = `Analyze these research papers and generate a single, concise research-domain topic label that captures their shared research direction.

Papers:
${paperContext}

Return a JSON object with:
{
  "topic_label": "concise research-domain topic name (3-5 words, no generic terms)",
  "domain_summary": "one-sentence description of the research domain",
  "methodological_theme": "common methodological approach or architecture",
  "paradigm": "research paradigm or computational framework",
  "confidence": 0.0-1.0 confidence score
}

Focus on:
- Meaningful research concepts, not keywords
- Methodological connections
- Paradigm alignment
- Avoid: generic terms (method, system, model), keyword dumps, repetitive phrases

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.5, timeout: 30000 });
    
    // Ensure result has required fields with defaults
    return {
      topic_label: result.topic_label || 'Unknown Research Direction',
      domain_summary: result.domain_summary || '',
      methodological_theme: result.methodological_theme || '',
      paradigm: result.paradigm || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.7,
    };
  } catch (err) {
    console.error('Topic label generation failed:', err.message);
    throw err;
  }
}

/**
 * Evaluate whether a research gap exists between two topics using Ollama.
 * 
 * @param {object} topic1 - First topic with label, papers, methodologies
 * @param {object} topic2 - Second topic with label, papers, methodologies
 * @param {object} options - Configuration options
 * @returns {Promise<object>} { is_gap, explanation, gap_significance, integration_opportunity, confidence }
 */
async function evaluateResearchGap(topic1, topic2, options = {}) {
  const model = options.model || DEFAULT_MODEL;

  const topic1Context = `Topic: ${topic1.label}\nMethodology: ${topic1.methodology || 'unknown'}\nYears: ${topic1.yearRange || 'unknown'}`;
  const topic2Context = `Topic: ${topic2.label}\nMethodology: ${topic2.methodology || 'unknown'}\nYears: ${topic2.yearRange || 'unknown'}`;

  const prompt = `Analyze these two research topics and determine if there is a meaningful research gap between them.

Topic 1:
${topic1Context}

Topic 2:
${topic2Context}

Return a JSON object with:
{
  "is_gap": true/false,
  "explanation": "detailed explanation of why this is or is not a research gap",
  "gap_significance": "why this gap matters for the research community",
  "integration_opportunity": "how these topics could be meaningfully combined",
  "confidence": 0.0-1.0 confidence in the gap assessment
}

A research gap should:
- Represent fundamentally different methodologies or domains
- Have potential for meaningful integration
- Address a real scientific opportunity, not just semantic dissimilarity

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.5, timeout: 30000 });
    
    return {
      is_gap: result.is_gap || false,
      explanation: result.explanation || '',
      gap_significance: result.gap_significance || '',
      integration_opportunity: result.integration_opportunity || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (err) {
    console.error('Gap evaluation failed:', err.message);
    throw err;
  }
}

/**
 * Verify if a candidate paper genuinely bridges two research topics.
 * 
 * @param {object} paper - Candidate bridging paper
 * @param {object} sourceTopic - Source research topic
 * @param {object} targetTopic - Target research topic
 * @param {object} options - Configuration options
 * @returns {Promise<object>} { is_bridging, bridging_evidence, confidence }
 */
async function verifyBridgingPaper(paper, sourceTopic, targetTopic, options = {}) {
  const model = options.model || DEFAULT_MODEL;

  const prompt = `Analyze whether this paper genuinely bridges two research topics or is merely similar to both.

Paper:
- Title: ${paper.title}
- Abstract: ${paper.abstract}
- Content: ${(paper.methodology || paper.content || '').slice(0, 500)}

Source Topic: ${sourceTopic.label}
Target Topic: ${targetTopic.label}

Return a JSON object with:
{
  "is_bridging": true/false,
  "bridging_evidence": "specific evidence from the paper that connects both topics",
  "confidence": 0.0-1.0 confidence in the assessment
}

A bridging paper must:
- Connect BOTH topics through shared methodologies or concepts
- Not just be similar to both independently
- Demonstrate actual integration of ideas

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.5, timeout: 30000 });
    
    return {
      is_bridging: result.is_bridging || false,
      bridging_evidence: result.bridging_evidence || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (err) {
    console.error('Bridging paper verification failed:', err.message);
    throw err;
  }
}

/**
 * Assess the novelty of a research intersection using Ollama.
 * 
 * @param {object} intersection - Research intersection with topics and papers
 * @param {object} options - Configuration options
 * @returns {Promise<object>} { novelty_score, novelty_explanation, confidence }
 */
async function assessNovelty(intersection, options = {}) {
  const model = options.model || DEFAULT_MODEL;

  const prompt = `Evaluate the novelty and unexploredness of this research intersection.

Topics: ${intersection.topics?.map(t => t.label).join(', ') || 'unknown'}
Papers: ${intersection.paperCount || 0}
Methodology: ${intersection.methodology || 'unknown'}

Return a JSON object with:
{
  "novelty_score": 0.0-1.0,
  "novelty_explanation": "why is this intersection novel or underexplored",
  "confidence": 0.0-1.0 confidence in the novelty assessment
}

Consider:
- Cross-domain novelty (combining different fields)
- Temporal emergence (new in recent years)
- Methodological uniqueness
- Limited existing work

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.6, timeout: 30000 });
    
    return {
      novelty_score: typeof result.novelty_score === 'number' ? result.novelty_score : 0.5,
      novelty_explanation: result.novelty_explanation || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (err) {
    console.error('Novelty assessment failed:', err.message);
    throw err;
  }
}

function buildTrendPaperContext(papers) {
  return papers
    .map((paper) => {
      const intro = paper.fullText?.introduction || '';
      const method = paper.fullText?.methodology || paper.methodology || '';
      const results = paper.fullText?.results || '';
      const conclusion = paper.fullText?.conclusion || '';
      const abstract = paper.abstract || '';
      return [
        `- Title: ${paper.title}`,
        `  Year: ${paper.year || 'unknown'}`,
        `  Abstract: ${abstract}`,
        `  Introduction: ${intro.slice(0, 500)}`,
        `  Methodology: ${method.slice(0, 500)}`,
        `  Results: ${results.slice(0, 400)}`,
        `  Conclusion: ${conclusion.slice(0, 400)}`,
      ].join('\n');
    })
    .join('\n\n');
}

async function assessTrendEvolution(topicLabel, papers, yearRange, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const paperContext = buildTrendPaperContext(papers);

  const prompt = `Analyze the temporal evolution of this research topic using the full paper context below.

Topic: ${topicLabel}
Year range: ${yearRange?.start || 'unknown'}-${yearRange?.end || 'unknown'}

Paper context:
${paperContext}

Return a JSON object with:
{
  "llm_trend_summary": "2-3 sentence summary of how the topic evolved over time",
  "llm_paradigm_shifts": ["short phrase for each major methodological or conceptual shift"],
  "llm_confidence": 0.0-1.0 confidence in the interpretation
}

Focus on:
- Temporal shifts in methods, framing, or application focus
- Apparent transitions in paradigm or research emphasis
- Distinguish real evolution from sparse sampling noise

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.55, timeout: 30000 });

    return {
      llm_trend_summary: result.llm_trend_summary || result.temporal_summary || '',
      llm_paradigm_shifts: Array.isArray(result.llm_paradigm_shifts)
        ? result.llm_paradigm_shifts.filter(Boolean)
        : Array.isArray(result.paradigm_shifts)
          ? result.paradigm_shifts.filter(Boolean)
          : [],
      llm_confidence: typeof result.llm_confidence === 'number'
        ? result.llm_confidence
        : typeof result.confidence === 'number'
          ? result.confidence
          : 0.5,
    };
  } catch (err) {
    console.warn('Trend evolution assessment failed:', err.message);
    return { llm_trend_summary: '', llm_paradigm_shifts: [], llm_confidence: 0 };
  }
}

async function detectParadigmShifts(topicLabel, papers, yearRange, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const paperContext = buildTrendPaperContext(papers);

  const prompt = `Identify major paradigm shifts in the evolution of this topic.

Topic: ${topicLabel}
Year range: ${yearRange?.start || 'unknown'}-${yearRange?.end || 'unknown'}

Paper context:
${paperContext}

Return a JSON object with:
{
  "llm_paradigm_shifts": ["shift description 1", "shift description 2"],
  "llm_reliability_explanation": "brief explanation of how reliable this trend interpretation is",
  "llm_confidence": 0.0-1.0 confidence in the shift detection
}

Only report shifts supported by the paper evidence.

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.55, timeout: 30000 });

    return {
      llm_paradigm_shifts: Array.isArray(result.llm_paradigm_shifts)
        ? result.llm_paradigm_shifts.filter(Boolean)
        : [],
      llm_reliability_explanation: result.llm_reliability_explanation || result.reliability_explanation || '',
      llm_confidence: typeof result.llm_confidence === 'number'
        ? result.llm_confidence
        : typeof result.confidence === 'number'
          ? result.confidence
          : 0.5,
    };
  } catch (err) {
    console.warn('Paradigm shift detection failed:', err.message);
    return { llm_paradigm_shifts: [], llm_reliability_explanation: '', llm_confidence: 0 };
  }
}

async function summarizeTrendReliability(topicLabel, paperCount, yearSpan, dataDensity, options = {}) {
  const model = options.model || DEFAULT_MODEL;

  const prompt = `Assess how reliable a temporal trend interpretation would be for this topic.

Topic: ${topicLabel}
Paper count: ${paperCount}
Year span: ${yearSpan}
Data density: ${dataDensity}

Return a JSON object with:
{
  "llm_reliability_explanation": "short explanation of data sufficiency and caveats",
  "llm_confidence": 0.0-1.0 confidence in this reliability assessment
}

Consider coverage, sparsity, and whether the available papers are enough to support a robust narrative.

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.4, timeout: 30000 });

    return {
      llm_reliability_explanation: result.llm_reliability_explanation || result.reliability_explanation || '',
      llm_confidence: typeof result.llm_confidence === 'number'
        ? result.llm_confidence
        : typeof result.confidence === 'number'
          ? result.confidence
          : 0.5,
    };
  } catch (err) {
    console.warn('Trend reliability assessment failed:', err.message);
    return { llm_reliability_explanation: '', llm_confidence: 0 };
  }
}

function buildReportContext({ papers, module1, module2, module3, module4, module5, module6, module7, module8, module9, module10, reportName, yearRange }) {
  const topTopics = (module2?.topics || []).slice(0, 5).map((topic) => ({
    name: topic.name,
    keywords: (topic.keywords || []).slice(0, 6),
    confidence: topic.llm_confidence ?? topic.labelConfidence ?? topic.coherence,
    paperCount: topic.paperIds?.length || 0,
  }));

  const topGaps = [...(module3?.gaps || [])]
    .sort((a, b) => (b.gapScore || 0) - (a.gapScore || 0))
    .slice(0, 5)
    .map((gap) => ({
      topicA: gap.topicALabel || gap.topicA,
      topicB: gap.topicBLabel || gap.topicB,
      gapScore: gap.gapScore,
      severity: gap.severity,
      explanation: gap.llm_gap_explanation || gap.explanation || gap.recommendation,
      evidencePaperIds: gap.evidencePaperIds || [],
      llmGapConfidence: gap.llm_gap_confidence,
    }));

  const topTrends = (module4?.trends || []).slice(0, 5).map((trend) => ({
    topicName: trend.topicName,
    trend: trend.trend,
    trendMessage: trend.trendMessage,
    llmTrendSummary: trend.llm_trend_summary,
    llmParadigmShifts: trend.llm_paradigm_shifts || [],
    llmConfidence: trend.llm_confidence,
    reliability: trend.reliability,
  }));

  const topCitations = (module6?.citations || []).slice(0, 8).map((citation) => ({
    paperId: citation.paperId,
    title: citation.title,
    relevance: citation.relevance,
  }));

  const relatedWork = module9?.draftMarkdown || '';

  return {
    reportName,
    yearRange,
    paperCount: papers.length,
    module1Summary: module1?.summaries?.slice(0, 5) || [],
    topTopics,
    topGaps,
    topTrends,
    topCitations,
    relatedWork,
    scientificHonesty: module10,
    module5Map: module5?.map,
    contradictionCount: module7?.contradictions?.length || 0,
    datasetMatrix: module8,
  };
}

async function generateAnalysisReport(context, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const prompt = `You are writing the final ResearchLens analysis report from structured pipeline outputs.

Use the evidence below. Do not invent findings that are not supported. If confidence is low, say so explicitly.

Return a JSON object with:
{
  "report_title": "short report title",
  "executive_summary": "2-4 paragraph plain-language summary",
  "key_findings": ["finding 1", "finding 2"],
  "top_topics": ["topic 1", "topic 2"],
  "top_gaps": ["gap 1", "gap 2"],
  "trend_insights": ["trend insight 1"],
  "scientific_honesty": "short caveat paragraph about evidence strength and limitations",
  "report_markdown": "full markdown report with headings, bullets, and caveats",
  "confidence": 0.0-1.0
}

Report context:
${JSON.stringify(context, null, 2)}

Write a report that emphasizes:
- what the corpus actually shows
- the strongest topics and gaps
- trend evolution where supported
- limitations and uncertainty
- practical interpretation for researchers

Generate ONLY valid JSON, no additional text.`;

  try {
    const result = await callOllama(prompt, { model, temperature: 0.45, timeout: 60000 });
    return {
      reportTitle: result.report_title || result.reportTitle || context.reportName || 'ResearchLens Analysis Report',
      reportSummary: result.executive_summary || result.reportSummary || '',
      reportHighlights: Array.isArray(result.key_findings) ? result.key_findings.filter(Boolean) : (Array.isArray(result.reportHighlights) ? result.reportHighlights : []),
      top_topics: Array.isArray(result.top_topics) ? result.top_topics.filter(Boolean) : [],
      top_gaps: Array.isArray(result.top_gaps) ? result.top_gaps.filter(Boolean) : [],
      trend_insights: Array.isArray(result.trend_insights) ? result.trend_insights.filter(Boolean) : [],
      scientific_honesty: result.scientific_honesty || '',
      reportMarkdown: result.report_markdown || result.reportMarkdown || '',
      confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
    };
  } catch (err) {
    console.warn('Analysis report generation failed:', err.message);
    return {
      reportTitle: context.reportName || 'ResearchLens Analysis Report',
      reportSummary: '',
      reportHighlights: [],
      top_topics: [],
      top_gaps: [],
      trend_insights: [],
      scientific_honesty: '',
      reportMarkdown: '',
      confidence: 0,
    };
  }
}

module.exports = {
  callOllama,
  generateTopicLabel,
  evaluateResearchGap,
  verifyBridgingPaper,
  assessNovelty,
  assessTrendEvolution,
  detectParadigmShifts,
  summarizeTrendReliability,
  buildReportContext,
  generateAnalysisReport,
};
