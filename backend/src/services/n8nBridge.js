const axios = require('axios');

// N8N Configuration
const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_ENABLED = String(process.env.N8N_ENABLED || 'true').toLowerCase() === 'true';
const N8N_WEBHOOK_TIMEOUT_MS = Number(process.env.N8N_WEBHOOK_TIMEOUT_MS || 600000);

// Workflow IDs - These may be customized via .env
const PRIMARY_FULL_ANALYSIS_WORKFLOW = process.env.N8N_WORKFLOW_FULL_ANALYSIS || 'full-analysis-workflow';
const WORKFLOWS = {
  FULL_ANALYSIS: PRIMARY_FULL_ANALYSIS_WORKFLOW,
  MODULE1: process.env.N8N_WORKFLOW_MODULE1 || 'module1-summarization',
  MODULE2: process.env.N8N_WORKFLOW_MODULE2 || 'module2-topic-modeling',
  MODULE3: process.env.N8N_WORKFLOW_MODULE3 || 'module3-gap-detection',
  MODULE4: process.env.N8N_WORKFLOW_MODULE4 || 'module4-trend-detection',
  MODULE5: process.env.N8N_WORKFLOW_MODULE5 || 'module5-visualization',
  MODULE6: process.env.N8N_WORKFLOW_MODULE6 || 'module6-chatbot',
  MODULE7: process.env.N8N_WORKFLOW_MODULE7 || 'module7-contradiction-detection',
  MODULE8: process.env.N8N_WORKFLOW_MODULE8 || 'module8-dataset-method-matrix',
  MODULE9: process.env.N8N_WORKFLOW_MODULE9 || 'module9-related-work-draft',
  MODULE10: process.env.N8N_WORKFLOW_MODULE10 || 'module10-scientific-honesty',
};
const FULL_ANALYSIS_FALLBACKS = [
  PRIMARY_FULL_ANALYSIS_WORKFLOW,
  'researchlens-5-section-analysis-modular',
].filter((value, index, self) => value && self.indexOf(value) === index);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonFromText(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const candidates = [
    trimmed,
    (trimmed.match(/```json\s*([\s\S]*?)\s*```/i) || [])[1],
    (trimmed.match(/\{[\s\S]*\}/) || [])[0],
    (trimmed.match(/\[[\s\S]*\]/) || [])[0],
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (_) {
      // Try next extraction strategy.
    }
  }

  return null;
}

function extractGeminiText(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return payload?.candidates?.[0]?.content?.parts?.[0]?.text || payload?.text || payload?.output || payload?.response || '';
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isEmptyObject(value) {
  return isObject(value) && Object.keys(value).length === 0;
}

function rerouteMisplacedSectionPayloads(rawData) {
  if (!isObject(rawData)) return rawData;

  const data = {
    ...rawData,
    summarization: isObject(rawData.summarization) ? { ...rawData.summarization } : rawData.summarization,
    gapDetection: isObject(rawData.gapDetection) ? { ...rawData.gapDetection } : rawData.gapDetection,
    trendDetection: isObject(rawData.trendDetection) ? { ...rawData.trendDetection } : rawData.trendDetection,
    visualization: isObject(rawData.visualization) ? { ...rawData.visualization } : rawData.visualization,
  };

  if (!isObject(data.summarization)) return data;

  const s = data.summarization;
  const hasCanonicalSummarization = !!(s.module1 || s.module2 || Array.isArray(s.summaries) || Array.isArray(s.topics) || typeof s.summary === 'string');
  const hasGapShape = !!(Array.isArray(s.gaps) || s.qualityMetrics || s.noveltyScore);
  const hasTrendShape = !!(Array.isArray(s.module4_trends) || Array.isArray(s.trends) || s.trendMetrics);
  const hasVisualizationShape = !!(s.module5 || s.module10 || Array.isArray(s.points) || Array.isArray(s.visualizations) || Array.isArray(s.dataPoints));

  if (hasGapShape && isEmptyObject(data.gapDetection)) {
    data.gapDetection = s;
    console.log('[N8N] Re-routed summarization payload -> gapDetection');
  }

  if (hasTrendShape && isEmptyObject(data.trendDetection)) {
    data.trendDetection = s;
    console.log('[N8N] Re-routed summarization payload -> trendDetection');
  }

  if (hasVisualizationShape && isEmptyObject(data.visualization)) {
    data.visualization = s;
    console.log('[N8N] Re-routed summarization payload -> visualization');
  }

  const movedAwayFromSummarization = !hasCanonicalSummarization && (hasGapShape || hasTrendShape || hasVisualizationShape);
  if (movedAwayFromSummarization) {
    data.summarization = {};
  }

  return data;
}

/**
 * Call n8n webhook for full analysis
 * The n8n workflow will orchestrate all 10 modules and return complete results
 */
async function callN8NFullAnalysis(papers, question) {
  try {
    console.log(`[N8N] Calling full analysis workflow with ${papers.length} papers`);
    const headers = N8N_API_KEY ? { 'X-API-Key': N8N_API_KEY, 'X-N8N-API-KEY': N8N_API_KEY } : {};
    
    // Create a simplified payload for n8n
    const payload = {
      papers: papers.map(p => ({
        id: p.id,
        title: p.title,
        authors: p.authors || [],
        year: p.year,
        abstract: p.abstract,
        content: p.content || p.abstract,
        keywords: p.keywords || [],
      })),
      question: question || 'What are the key findings, research gaps and emerging topics?',
      timestamp: new Date().toISOString(),
    };

    const tryWebhook = async (workflowName) => {
      const webhookUrl = `${N8N_BASE_URL}/webhook/${workflowName}`;
      const response = await axios.post(webhookUrl, payload, {
        timeout: N8N_WEBHOOK_TIMEOUT_MS,
        headers,
        validateStatus: (status) => true, // accept any status; we handle it below
      });

      console.log('[N8N] Raw response from webhook:');
      console.log(response.data);

      // Accept 200 (completed) and 202 (accepted/processing) responses with JSON body.
      if (!response.data) {
        throw new Error(`N8N returned empty response (status ${response.status})`);
      }
      if (response.status !== 200 && response.status !== 202) {
        // Non-success status codes that are not 'accepted' should be treated as error
        throw new Error(`N8N returned status ${response.status}`);
      }
        // If N8N returns an array of module outputs (legacy workflows), map to expected object
        const data = response.data;
        if (Array.isArray(data) && data.length > 0) {
          console.log('[N8N] Received array response with', data.length, 'items — mapping to modules');
          // Heuristic mapping: assume order Summarization, GapDetection, TrendDetection, Visualization
          const mapped = {
            summarization: data[0] || {},
            gapDetection: data[1] || {},
            trendDetection: data[2] || {},
            visualization: data[3] || {},
            // include raw array for debugging
            _rawArray: data,
          };
          return mapped;
        }
        // If N8N returned 202 (accepted), include the HTTP status on the returned object
        if (response.status === 202 && isObject(data)) {
          data.status = data.status || 'processing';
          data._httpStatus = 202;
        } else if (response.status === 200 && isObject(data)) {
          data._httpStatus = 200;
        }

        return data;
    };

    let lastError = null;
    for (const workflowName of FULL_ANALYSIS_FALLBACKS) {
      try {
        console.log(`[N8N] Trying workflow webhook: ${workflowName}`);
        let data = await tryWebhook(workflowName);

        // Some n8n webhook setups can respond early with placeholder objects.
        // Retry a few times only when payload is clearly incomplete.
        const status = String(data?.status || '').toLowerCase();
        const hasModuleKeys = isObject(data) && ['summarization', 'gapDetection', 'trendDetection', 'visualization'].every((k) => k in data);
        const modulePopulated = (k) => isObject(data[k]) && Object.keys(data[k]).length > 0;
        const populatedCount = hasModuleKeys ? ['summarization', 'gapDetection', 'trendDetection', 'visualization'].filter(modulePopulated).length : 0;
        const hasOnlyEmptyObjects = hasModuleKeys && populatedCount === 0;
        // If n8n returns 'completed' but not all key modules are populated, treat it as incomplete/interim.
        const hasAllModules = hasModuleKeys && populatedCount === 4;
        const shouldRetry = status === 'processing' || status === 'running' || status === 'queued' || hasOnlyEmptyObjects || (status === 'completed' && !hasAllModules);

        if (shouldRetry) {
          const maxRetries = Number(process.env.N8N_INCOMPLETE_RETRIES || 6);
          const retryDelayMs = Number(process.env.N8N_INCOMPLETE_RETRY_DELAY_MS || 3000);
          const pollUrl = data?.pollUrl || data?.statusUrl || data?.resultUrl;
          const executionId = data?.executionId || data?.execution_id || data?.id;
          const executionUrl = executionId ? `${N8N_BASE_URL}/api/v1/executions/${executionId}` : null;
          const targetUrl = pollUrl || executionUrl;

          if (!targetUrl) {
            console.warn('[N8N] Received incomplete payload but no poll URL/execution ID was provided; returning interim marker');
            // Mark this as an interim result so callers (and routes) can create placeholders
            return { interim: true, raw: data };
          } else {
            console.warn(`[N8N] Received incomplete payload (status=${status || 'n/a'}). Polling ${targetUrl} up to ${maxRetries} times.`);

            for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
              await sleep(retryDelayMs);

              try {
                // Build poll headers. Include common n8n API header names and a Bearer auth fallback.
                const pollHeaders = { ...(headers || {}) };
                if (N8N_API_KEY && !pollHeaders.Authorization && !pollHeaders.authorization) {
                  pollHeaders.Authorization = `Bearer ${N8N_API_KEY}`;
                }

                const pollResponse = await axios.get(targetUrl, {
                  timeout: 30000,
                  headers: pollHeaders,
                });

                const pollData = pollResponse?.data?.data || pollResponse?.data || {};
                const candidate = isObject(pollData?.result) ? pollData.result : pollData;

                const retryStatus = String(candidate?.status || pollData?.status || '').toLowerCase();
                const retryHasModuleKeys = isObject(candidate) && ['summarization', 'gapDetection', 'trendDetection', 'visualization'].every((k) => k in candidate);
                const retryAllEmpty = retryHasModuleKeys && ['summarization', 'gapDetection', 'trendDetection', 'visualization'].every((k) => {
                  const value = candidate[k];
                  return isObject(value) && Object.keys(value).length === 0;
                });

                if (!(retryStatus === 'processing' || retryStatus === 'running' || retryStatus === 'queued' || retryAllEmpty)) {
                  data = candidate;
                  break;
                }
              } catch (pollError) {
                const message = pollError?.message || String(pollError);
                console.warn(`[N8N] Poll attempt ${attempt} failed: ${message}`);

                // If we got a 401 from the provided pollUrl but have an executionId, try the standard API executions endpoint as a fallback.
                const statusCode = pollError?.response?.status;
                if ((statusCode === 401 || statusCode === 403) && executionId) {
                  try {
                    const fallbackUrl = `${N8N_BASE_URL}/api/v1/executions/${executionId}`;
                    console.warn(`[N8N] Poll 401/403 detected; trying fallback executions endpoint: ${fallbackUrl}`);
                    const fallbackHeaders = { ...(headers || {}) };
                    if (N8N_API_KEY && !fallbackHeaders.Authorization && !fallbackHeaders.authorization) {
                      fallbackHeaders.Authorization = `Bearer ${N8N_API_KEY}`;
                    }

                    const fallbackResp = await axios.get(fallbackUrl, { timeout: 30000, headers: fallbackHeaders });
                    const fallbackData = fallbackResp?.data?.data || fallbackResp?.data || {};
                    const candidate = isObject(fallbackData?.result) ? fallbackData.result : fallbackData;

                    const retryStatus = String(candidate?.status || fallbackData?.status || '').toLowerCase();
                    const retryHasModuleKeys = isObject(candidate) && ['summarization', 'gapDetection', 'trendDetection', 'visualization'].every((k) => k in candidate);
                    const retryAllEmpty = retryHasModuleKeys && ['summarization', 'gapDetection', 'trendDetection', 'visualization'].every((k) => {
                      const value = candidate[k];
                      return isObject(value) && Object.keys(value).length === 0;
                    });

                    if (!(retryStatus === 'processing' || retryStatus === 'running' || retryStatus === 'queued' || retryAllEmpty)) {
                      data = candidate;
                      break;
                    }
                  } catch (fallbackError) {
                    console.warn(`[N8N] Fallback poll attempt failed: ${fallbackError?.message || String(fallbackError)}`);
                  }
                }
              }
            }
          }
        }

        data = rerouteMisplacedSectionPayloads(data);

        console.log('[N8N] Full analysis completed successfully');
        return data;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        if (status === 404) {
          console.warn(`[N8N] Webhook not registered: ${workflowName}. Trying fallback.`);
          continue;
        }
        console.error('[N8N] Full analysis error:', error.message);
        throw new Error(`N8N workflow failed: ${error.message}`);
      }
    }

    throw new Error(`N8N workflow failed: ${lastError?.message || 'no workflow matched'}`);
  } catch (error) {
    console.error('[N8N] Full analysis error:', error.message);
    throw new Error(`N8N workflow failed: ${error.message}`);
  }
}

/**
 * Call n8n webhook for a specific module
 * Used for individual module processing if needed
 */
async function callN8NModule(moduleName, paperData) {
  try {
    console.log(`[N8N] Calling ${moduleName}`);
    
    const workflowId = WORKFLOWS[moduleName.toUpperCase()] || moduleName;
    const webhookUrl = `${N8N_BASE_URL}/webhook/${workflowId}`;
    
    const response = await axios.post(webhookUrl, paperData, {
      timeout: 60000, // 1 minute timeout per module
      headers: N8N_API_KEY ? { 'X-API-Key': N8N_API_KEY } : {},
    });

    if (!response.data || response.status !== 200) {
      throw new Error(`N8N returned status ${response.status}`);
    }

    console.log(`[N8N] ${moduleName} completed successfully`);
    return response.data;
  } catch (error) {
    console.error(`[N8N] ${moduleName} error:`, error.message);
    throw new Error(`N8N module ${moduleName} failed: ${error.message}`);
  }
}

/**
 * Synthesize a comprehensive markdown report from n8n module outputs
 * Used when n8n doesn't provide a pre-formatted report
 */
function synthesizeReportMarkdown(module1, module2, module3, module4, module5, module10) {
  const sections = [];

  // Executive Summary
  sections.push('# ResearchLens Analysis Report\n');
  sections.push('*Comprehensive research analysis synthesized from uploaded papers*\n');

  // Paper Summaries (Module 1)
  if (module1?.summaries && Array.isArray(module1.summaries) && module1.summaries.length > 0) {
    sections.push('\n## 1. Paper Summaries\n');
    module1.summaries.forEach((s, idx) => {
      sections.push(`### Paper ${idx + 1}: ${s.paperId || 'Unknown'}\n`);
      if (s.summary) sections.push(`${s.summary}\n`);
      if (Array.isArray(s.keyFindings) && s.keyFindings.length > 0) {
        sections.push('\n**Key Findings:**\n');
        s.keyFindings.forEach(finding => sections.push(`- ${finding}\n`));
      }
      sections.push('');
    });
  }

  // Topics (Module 2)
  if (module2?.topics && Array.isArray(module2.topics) && module2.topics.length > 0) {
    sections.push('\n## 2. Detected Research Topics\n');
    sections.push(`**Total Topics:** ${module2.topics.length}\n`);
    module2.topics.forEach((topic, idx) => {
      if (topic.name && topic.coherence !== undefined && !isNaN(topic.coherence)) {
        sections.push(`\n### Topic ${idx + 1}: ${topic.name}\n`);
        sections.push(`**Coherence:** ${(topic.coherence * 100).toFixed(0)}%\n`);
        if (Array.isArray(topic.keywords) && topic.keywords.length > 0) {
          sections.push(`**Keywords:** ${topic.keywords.slice(0, 6).join(', ')}\n`);
        }
        sections.push(`**Papers:** ${topic.paperIds?.length || 0} papers\n`);
      }
    });
  }

  // Gaps (Module 3)
  if (module3?.gaps && Array.isArray(module3.gaps) && module3.gaps.length > 0) {
    sections.push('\n## 3. Research Gaps Identified\n');
    sections.push(`**Total Gaps:** ${module3.gaps.length}\n`);
    const topGaps = module3.gaps.slice(0, 5).filter(gap => 
      (gap.topicALabel || gap.topicA) && 
      (gap.topicBLabel || gap.topicB) && 
      gap.gapScore !== undefined && 
      !isNaN(gap.gapScore) && 
      gap.similarity !== undefined && 
      !isNaN(gap.similarity)
    );
    topGaps.forEach((gap, idx) => {
      const labelA = gap.topicALabel || gap.topicA || 'Topic A';
      const labelB = gap.topicBLabel || gap.topicB || 'Topic B';
      const score = gap.gapScore.toFixed(2);
      const sim = gap.similarity.toFixed(2);
      sections.push(`\n### Gap ${idx + 1}: ${labelA} ↔ ${labelB}\n`);
      sections.push(`**Gap Score:** ${score}/1.0 | **Similarity:** ${sim}\n`);
      if (gap.explanation) sections.push(`${gap.explanation}\n`);
    });
  }

  // Trends (Module 4)
  if (module4?.module4_trends && Array.isArray(module4.module4_trends) && module4.module4_trends.length > 0) {
    sections.push('\n## 4. Research Trends\n');
    const trends = module4.module4_trends;
    const getTrendLabel = (trend) => trend?.topic || trend?.topicName || trend?.name || 'Unknown';
    const rising = trends.filter(t => t.trend === 'rising' && getTrendLabel(t) && t.strength !== undefined && !isNaN(t.strength));
    const declining = trends.filter(t => t.trend === 'declining' && getTrendLabel(t) && t.strength !== undefined && !isNaN(t.strength));

    if (rising.length > 0) {
      sections.push(`\n### Rising Topics (${rising.length})\n`);
      rising.forEach((t, idx) => {
        const topic = getTrendLabel(t);
        const strength = (t.strength * 100).toFixed(0);
        sections.push(`- **${topic}** (Strength: ${strength}%)\n`);
        if (t.description) sections.push(`  ${t.description}\n`);
      });
    }

    if (declining.length > 0) {
      sections.push(`\n### Declining Topics (${declining.length})\n`);
      declining.forEach((t, idx) => {
        const topic = getTrendLabel(t);
        const strength = (t.strength * 100).toFixed(0);
        sections.push(`- **${topic}** (Strength: ${strength}%)\n`);
        if (t.description) sections.push(`  ${t.description}\n`);
      });
    }
  }

  // Research Landscape (Module 5)
  if (module5?.description) {
    sections.push('\n## 5. Research Landscape Overview\n');
    sections.push(`${module5.description}\n`);
  }

  // Scientific Honesty (Module 10)
  if (module10?.honestyScore !== undefined && !isNaN(module10.honestyScore)) {
    sections.push('\n## 6. Scientific Integrity Assessment\n');
    sections.push(`**Overall Honesty Score:** ${(module10.honestyScore * 100).toFixed(0)}%\n`);
    if (module10.scoreDetails) {
      sections.push('\n**Detailed Scores:**\n');
      sections.push(`- Citation Accuracy: ${((module10.scoreDetails.citationAccuracy || 0) * 100).toFixed(0)}%\n`);
      sections.push(`- Method Transparency: ${((module10.scoreDetails.methodTransparency || 0) * 100).toFixed(0)}%\n`);
      sections.push(`- Limitation Disclosure: ${((module10.scoreDetails.limitationDisclosure || 0) * 100).toFixed(0)}%\n`);
      sections.push(`- Conflict of Interest: ${((module10.scoreDetails.conflictOfInterest || 0) * 100).toFixed(0)}%\n`);
    }
    if (module10.evaluation) {
      sections.push(`\n**Evaluation:** ${module10.evaluation}\n`);
    }
  }

  sections.push('\n---\n');
  sections.push('*Generated by ResearchLens Analysis Engine*\n');

  return sections.join('\n').trim();
}

/**
 * Format n8n results into the backend report structure
 * Maps n8n output to the existing AnalysisReport model schema
 * Handles both direct module returns and legacy field names
 */
function formatN8NResults(n8nResponse, papers) {
  try {
    const safePapers = Array.isArray(papers) ? papers : [];

    const deepFind = (value, predicate, seen = new Set()) => {
      if (!value || typeof value !== 'object' || seen.has(value)) return undefined;
      seen.add(value);

      if (predicate(value)) return value;

      if (Array.isArray(value)) {
        for (const item of value) {
          const found = deepFind(item, predicate, seen);
          if (found !== undefined) return found;
        }
        return undefined;
      }

      for (const entry of Object.values(value)) {
        const found = deepFind(entry, predicate, seen);
        if (found !== undefined) return found;
      }

      return undefined;
    };

    const normalizeRoot = (value) => {
      const deepMerge = (target, source) => {
        if (!source || typeof source !== 'object') return target;
        const output = Array.isArray(target) ? [...target] : { ...target };

        for (const [key, sourceValue] of Object.entries(source)) {
          const targetValue = output[key];

          if (Array.isArray(sourceValue)) {
            output[key] = Array.isArray(targetValue) ? [...targetValue, ...sourceValue] : [...sourceValue];
          } else if (sourceValue && typeof sourceValue === 'object') {
            output[key] = deepMerge(
              targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue) ? targetValue : {},
              sourceValue
            );
          } else if (sourceValue !== undefined) {
            output[key] = sourceValue;
          }
        }

        return output;
      };

      if (Array.isArray(value)) {
        return value.reduce((acc, item) => {
          const node = item && typeof item === 'object' && 'json' in item ? item.json : item;
          if (node && typeof node === 'object') {
            return deepMerge(acc, node);
          }
          return acc;
        }, {});
      }
      return value && typeof value === 'object' ? value : {};
    };

    const root = normalizeRoot(n8nResponse);
    const summarization = root.summarization || {};
    const gapDetection = root.gapDetection || {};
    const trendDetection = root.trendDetection || {};
    const visualization = root.visualization || {};
    const chatbot = root.chatbot || {};
    const contradictions = root.contradictions || {};
    const datasetMethodMatrix = root.datasetMethodMatrix || {};
    const relatedWork = root.relatedWork || {};
    const scientificHonesty = root.scientificHonesty || {};

    const rootModule1 = root.module1 || {};
    const rootModule2 = root.module2 || {};
    const rootModule3 = root.module3 || {};
    const rootModule4 = root.module4 || {};
    const rootModule5 = root.module5 || {};
    const rootModule10 = root.module10 || {};

    const reportTitle = root.reportTitle || deepFind(root, (node) => typeof node.reportTitle === 'string')?.reportTitle || 'Research Analysis Report';
    const reportSummary = root.reportSummary || deepFind(root, (node) => typeof node.reportSummary === 'string')?.reportSummary || 'Analysis completed';
    const reportMarkdown = root.reportMarkdown || deepFind(root, (node) => typeof node.reportMarkdown === 'string')?.reportMarkdown || '';
    const reportHighlights = root.reportHighlights || deepFind(root, (node) => Array.isArray(node.reportHighlights))?.reportHighlights || [];
    const confidence = typeof root.confidence === 'number' ? root.confidence : 0.85;

    // STEP 1: Parse Gemini API response wrappers
    // Summarization may arrive nested as summarization.module1/module2 or Gemini candidates
    let module1Data = isObject(rootModule1) ? rootModule1 : { summaries: [] };
    let module2Data = isObject(rootModule2) ? rootModule2 : { topics: [], assignments: [] };

    if (summarization?.module1 || summarization?.module2) {
      module1Data = summarization.module1 || { summaries: [] };
      module2Data = summarization.module2 || { topics: [], assignments: [] };
    } else if (typeof summarization?.summary === 'string' || Array.isArray(summarization?.keyFindings)) {
      module1Data = {
        module: 'module1-summarization',
        count: safePapers.length,
        summaries: safePapers.map((paper, idx) => ({
          paperId: paper.id || `paper-${idx + 1}`,
          title: paper.title || `Paper ${idx + 1}`,
          summary: summarization.summary || paper.abstract || 'Summary unavailable',
          keywords: Array.isArray(paper.keywords) ? paper.keywords.slice(0, 6) : [],
        })),
      };

      if ((!module2Data.topics || module2Data.topics.length === 0) && Array.isArray(summarization?.topics)) {
        module2Data = { topics: summarization.topics, assignments: summarization.assignments || [] };
      }
    } else if (summarization && typeof summarization === 'object' && summarization.candidates) {
      try {
        const textContent = extractGeminiText(summarization);
        if (textContent && typeof textContent === 'string') {
          const parsed = extractJsonFromText(textContent) || {};
          module1Data = parsed.module1 || { summaries: [] };
          module2Data = parsed.module2 || { topics: [], assignments: [] };
        }
      } catch (e) {
        console.warn('[N8N] Failed to parse summarization:', e.message);
      }
    }

    if ((!module1Data.summaries || module1Data.summaries.length === 0) && typeof rootModule1?.summary === 'string') {
      module1Data = {
        module: 'module1-summarization',
        count: safePapers.length,
        summaries: safePapers.map((paper, idx) => ({
          paperId: paper.id || `paper-${idx + 1}`,
          title: paper.title || `Paper ${idx + 1}`,
          summary: rootModule1.summary,
          keywords: Array.isArray(paper.keywords) ? paper.keywords.slice(0, 6) : [],
        })),
      };
    }

    if (Array.isArray(module2Data?.topics) && module2Data.topics.length > 0 && typeof module2Data.topics[0] === 'string') {
      module2Data = {
        module: 'module2-topic-modeling',
        topics: module2Data.topics.map((name, idx) => ({
          topicId: `topic_${idx + 1}`,
          name,
          keywords: String(name).split(/\s+/).filter(Boolean).slice(0, 4),
          paperIds: safePapers.slice(0, Math.max(1, Math.floor(safePapers.length / Math.max(module2Data.topics.length, 1)))).map((p) => p.id),
          coherence: 0.75,
        })),
        assignments: safePapers.map((paper, idx) => ({
          paperId: paper.id,
          topicId: `topic_${(idx % Math.max(module2Data.topics.length, 1)) + 1}`,
        })),
      };
    }

    const topicsForLookup = Array.isArray(module2Data?.topics) ? module2Data.topics : [];
    const normalizeGap = (gap, idx) => {
      if (typeof gap === 'string') {
        const topicA = topicsForLookup[idx % Math.max(topicsForLookup.length, 1)]?.topicId || `topic_${(idx % 3) + 1}`;
        const topicB = topicsForLookup[(idx + 1) % Math.max(topicsForLookup.length, 1)]?.topicId || `topic_${((idx + 1) % 3) + 1}`;
        return {
          gapId: `gap_${idx + 1}`,
          topicA,
          topicB,
          topicALabel: topicsForLookup.find((t) => t.topicId === topicA)?.name || topicA,
          topicBLabel: topicsForLookup.find((t) => t.topicId === topicB)?.name || topicB,
          similarity: 0.6,
          coOccurrence: 0,
          gapScore: 0.7,
          severity: 'moderate',
          evidencePaperIds: [],
          recommendation: gap,
          explanation: gap,
        };
      }

      if (isObject(gap)) {
        const topicA = gap.topicA || gap.topicAId || gap.topicA_id || `topic_${(idx % 3) + 1}`;
        const topicB = gap.topicB || gap.topicBId || gap.topicB_id || `topic_${((idx + 1) % 3) + 1}`;
        const explanation = gap.explanation || gap.recommendation || gap.description || gap.title || 'Potential research gap identified';

        return {
          gapId: gap.gapId || gap.id || `gap_${idx + 1}`,
          topicA,
          topicB,
          topicALabel: gap.topicALabel || gap.topicAName || topicsForLookup.find((t) => t.topicId === topicA)?.name || topicA,
          topicBLabel: gap.topicBLabel || gap.topicBName || topicsForLookup.find((t) => t.topicId === topicB)?.name || topicB,
          similarity: typeof gap.similarity === 'number' ? gap.similarity : 0.6,
          coOccurrence: typeof gap.coOccurrence === 'number' ? gap.coOccurrence : 0,
          gapScore: typeof gap.gapScore === 'number' ? gap.gapScore : 0.65,
          severity: gap.severity || 'moderate',
          evidencePaperIds: Array.isArray(gap.evidencePaperIds) ? gap.evidencePaperIds : [],
          recommendation: explanation,
          explanation,
        };
      }

      return null;
    };

    // STEP 2: Parse Gap Detection (should be direct or Gemini wrapped)
    let module3Data = isObject(rootModule3) ? rootModule3 : { gaps: [] };
    let gapTopics = module2Data.topics; // Use from summarization if available
    let gapAssignments = module2Data.assignments;

    const nestedGapSource = summarization?.gaps || summarization?.gapDetection?.gaps || gapDetection?.gaps || deepFind(root, (node) => Array.isArray(node.gaps) && node.gaps.length > 0)?.gaps;

    if (nestedGapSource && Array.isArray(nestedGapSource)) {
      module3Data = { gaps: nestedGapSource.map((gap, idx) => normalizeGap(gap, idx)).filter(Boolean) };
      if (Array.isArray(summarization?.topics) && !module2Data.topics?.length) {
        gapTopics = summarization.topics;
        gapAssignments = summarization.assignments || [];
      }
    } else if (gapDetection) {
      if (gapDetection.candidates) {
        // Gemini wrapped response
        try {
          const textContent = extractGeminiText(gapDetection);
          if (textContent) {
            const parsed = extractJsonFromText(textContent) || {};
            module3Data = parsed.gaps ? { gaps: parsed.gaps.map((gap, idx) => normalizeGap(gap, idx)).filter(Boolean) } : { gaps: [] };
            // Module 2 topics may also come from gap detection
            if (parsed.topics && !module2Data.topics?.length) {
              gapTopics = parsed.topics;
              gapAssignments = parsed.assignments || [];
            }
          }
        } catch (e) {
          console.warn('[N8N] Failed to parse gapDetection:', e.message);
        }
      } else if (gapDetection.gaps || gapDetection.topics || Array.isArray(gapDetection.recommendations)) {
        // Direct response format
        const sourceGaps = gapDetection.gaps || gapDetection.recommendations || [];
        module3Data = { gaps: sourceGaps.map((gap, idx) => normalizeGap(gap, idx)).filter(Boolean) };
        if (gapDetection.topics && !module2Data.topics?.length) {
          gapTopics = gapDetection.topics;
          gapAssignments = gapDetection.assignments || [];
        }
      }
    }

    // Finalize module2 with proper data
    const m2 = {
      topics: gapTopics || [],
      assignments: gapAssignments || [],
    };

    // STEP 3: Parse Trend Detection
    let module4Data = isObject(rootModule4) ? rootModule4 : { module4_trends: [] };
    const nestedTrendSource = summarization?.trends || summarization?.module4_trends || trendDetection?.module4_trends || trendDetection?.trends || deepFind(root, (node) => Array.isArray(node.module4_trends) && node.module4_trends.length > 0)?.module4_trends || deepFind(root, (node) => Array.isArray(node.trends) && node.trends.length > 0)?.trends;

    const normalizeTrend = (trend, idx) => {
      const currentYear = new Date().getFullYear();
      if (typeof trend === 'string') {
        return {
          topicId: topicsForLookup[idx]?.topicId || `topic_${idx + 1}`,
          topicName: topicsForLookup[idx]?.name || `Trend ${idx + 1}`,
          yearlyCounts: [{ year: currentYear, count: 1 }],
          slope: 0,
          trend: 'stable',
          llm_trend_summary: trend,
        };
      }

      if (isObject(trend)) {
        const inferredTrend = ['rising', 'stable', 'declining', 'insufficient_data'].includes(trend.trend)
          ? trend.trend
          : 'stable';
        const summaryText = trend.llm_trend_summary || trend.llmTrendSummary || trend.description || trend.summary;
        return {
          topicId: trend.topicId || `topic_${idx + 1}`,
          topicName: trend.topicName || trend.name || topicsForLookup[idx]?.name || `Topic ${idx + 1}`,
          yearlyCounts: Array.isArray(trend.yearlyCounts) && trend.yearlyCounts.length > 0
            ? trend.yearlyCounts
            : [{ year: currentYear, count: Number(trend.count) || 1 }],
          slope: typeof trend.slope === 'number' ? trend.slope : 0,
          trend: inferredTrend,
          llm_trend_summary: summaryText || undefined,
          llm_paradigm_shifts: Array.isArray(trend.llm_paradigm_shifts) ? trend.llm_paradigm_shifts : [],
        };
      }

      return null;
    };

    if (Array.isArray(nestedTrendSource)) {
      const normalizedTrends = nestedTrendSource.map((trend, idx) => normalizeTrend(trend, idx)).filter(Boolean);
      module4Data = { module4_trends: normalizedTrends, trends: normalizedTrends };
    } else if (trendDetection) {
      if (trendDetection.candidates) {
        try {
          const textContent = extractGeminiText(trendDetection);
          if (textContent) {
            const parsed = extractJsonFromText(textContent) || {};
            const trendSource = parsed.module4_trends || parsed.trends || parsed.emergingAreas || parsed.futureDirections || [];
            const normalizedTrends = trendSource.map((trend, idx) => normalizeTrend(trend, idx)).filter(Boolean);
            module4Data = { module4_trends: normalizedTrends, trends: normalizedTrends };
          }
        } catch (e) {
          console.warn('[N8N] Failed to parse trendDetection:', e.message);
        }
      } else if (trendDetection.module4_trends || trendDetection.trends || trendDetection.emergingAreas || trendDetection.futureDirections) {
        const trendSource = trendDetection.module4_trends || trendDetection.trends || trendDetection.emergingAreas || trendDetection.futureDirections || [];
        const normalizedTrends = trendSource.map((trend, idx) => normalizeTrend(trend, idx)).filter(Boolean);
        module4Data = {
          module4_trends: normalizedTrends,
          trends: normalizedTrends,
        };
      }
    }

    // STEP 4: Parse Visualization (module5 and module10)
    let module5Data = isObject(rootModule5) ? rootModule5 : { points: [], gaps: [] };
    let module10Data = isObject(rootModule10) ? rootModule10 : { honestyScore: 0.7, scoreDetails: {} };

    const nestedVisualization = visualization?.module5 || visualization?.points || summarization?.module5 || summarization?.visualization?.module5 || summarization?.points || deepFind(root, (node) => Array.isArray(node.points) && node.points.length > 0)?.points || deepFind(root, (node) => node.module5 && typeof node.module5 === 'object')?.module5;
    const nestedHonesty = visualization?.module10 || visualization?.honestyScore || summarization?.module10 || summarization?.visualization?.module10 || deepFind(root, (node) => typeof node.honestyScore === 'number') || deepFind(root, (node) => node.module10 && typeof node.module10 === 'object')?.module10;

    if (nestedVisualization || nestedHonesty) {
      module5Data = nestedVisualization?.module5 || nestedVisualization || module5Data;
      module10Data = nestedHonesty?.module10 || nestedHonesty || module10Data;
    } else if (visualization) {
      if (visualization.candidates) {
        try {
          const textContent = extractGeminiText(visualization);
          if (textContent) {
            const parsed = extractJsonFromText(textContent) || {};
            module5Data = parsed.module5 || { points: [], gaps: [] };
            module10Data = parsed.module10 || { honestyScore: 0.7 };
          }
        } catch (e) {
          console.warn('[N8N] Failed to parse visualization:', e.message);
        }
      } else if (visualization.module5 || visualization.points || visualization.visualizations || visualization.dataPoints) {
        module5Data = visualization.module5 || visualization;
      }
    }

    const normalizedPointsSource = module5Data.map?.points || module5Data.points || module5Data.dataPoints || [];
    const normalizedPoints = Array.isArray(normalizedPointsSource)
      ? normalizedPointsSource.map((point, idx) => {
          if (isObject(point) && point.paperId && typeof point.x === 'number' && typeof point.y === 'number') {
            return {
              paperId: point.paperId,
              title: point.title || safePapers.find((p) => p.id === point.paperId)?.title || point.paperId,
              topicId: point.topicId || topicsForLookup[idx % Math.max(topicsForLookup.length, 1)]?.topicId || `topic_${(idx % 3) + 1}`,
              x: point.x,
              y: point.y,
              keywords: Array.isArray(point.keywords) ? point.keywords : [],
            };
          }

          const paper = safePapers[idx % Math.max(safePapers.length, 1)] || {};
          return {
            paperId: paper.id || `paper_${idx + 1}`,
            title: paper.title || String(point) || `Paper ${idx + 1}`,
            topicId: topicsForLookup[idx % Math.max(topicsForLookup.length, 1)]?.topicId || `topic_${(idx % 3) + 1}`,
            x: Number(((idx % 5) * 1.7 + 1).toFixed(3)),
            y: Number((Math.floor(idx / 5) * 1.5 + 1).toFixed(3)),
            keywords: Array.isArray(paper.keywords) ? paper.keywords.slice(0, 4) : [],
          };
        })
      : [];

    const normalizedLinks = (module5Data.map?.links || []).map((link) => ({
      sourceTopicId: link.sourceTopicId,
      targetTopicId: link.targetTopicId,
      gapScore: typeof link.gapScore === 'number' ? link.gapScore : 0.6,
      severity: link.severity || 'moderate',
    }));

    if (normalizedLinks.length === 0) {
      for (const gap of module3Data.gaps || []) {
        normalizedLinks.push({
          sourceTopicId: gap.topicA,
          targetTopicId: gap.topicB,
          gapScore: gap.gapScore,
          severity: gap.severity || 'moderate',
        });
      }
    }

    module5Data = {
      module: module5Data.module || 'module5-visualization',
      map: {
        points: normalizedPoints,
        topicCenters: Array.isArray(module5Data.map?.topicCenters) ? module5Data.map.topicCenters : [],
        links: normalizedLinks,
      },
      points: normalizedPoints,
      gaps: Array.isArray(module5Data.gaps) ? module5Data.gaps : [],
    };

    const normalizedTrends = Array.isArray(module4Data.module4_trends)
      ? module4Data.module4_trends
      : (Array.isArray(module4Data.trends) ? module4Data.trends : []);
    module4Data = {
      ...module4Data,
      module4_trends: normalizedTrends,
      trends: normalizedTrends,
    };

    const finalHighlights = reportHighlights.length > 0
      ? reportHighlights
      : (Array.isArray(summarization?.keyFindings) ? summarization.keyFindings : []);
    const finalReportSummary = reportSummary !== 'Analysis completed'
      ? reportSummary
      : (typeof summarization?.summary === 'string' && summarization.summary.trim() ? summarization.summary : reportSummary);

    // If reportMarkdown is empty, synthesize it from modules
    let finalReportMarkdown = reportMarkdown;
    if (!finalReportMarkdown || finalReportMarkdown.trim() === '') {
      finalReportMarkdown = synthesizeReportMarkdown(module1Data, module2Data, module3Data, module4Data, module5Data, module10Data);
    }

    // Build final 10-module structure
    const modules = {
      module1: module1Data,
      module2: m2,
      module3: module3Data,
      module4: module4Data,
      module5: module5Data,
      module6: chatbot || { gapEvidences: [] },
      module7: contradictions || { contradictions: [] },
      module8: datasetMethodMatrix || { matrix: {} },
      module9: relatedWork || { relatedWork: [] },
      module10: module10Data,
    };

    return {
      modules,
      reportTitle,
      reportSummary: finalReportSummary,
      reportMarkdown: finalReportMarkdown,
      reportHighlights: finalHighlights,
      confidence,
      processingTimeMs: n8nResponse?.processingTimeMs || root?.processingTimeMs || 0,
    };
  } catch (error) {
    console.error('[N8N] Error formatting results:', error.message, error.stack);
    throw new Error(`Failed to format N8N results: ${error.message}`);
  }
}

/**
 * Health check - verify n8n is available
 */
async function checkN8NHealth() {
  if (!N8N_ENABLED) {
    console.warn('[N8N] N8N integration is disabled via N8N_ENABLED=false');
    return false;
  }

  const endpoints = ['/api/v1/health', '/health', '/'];
  for (const endpoint of endpoints) {
    try {
      const url = `${N8N_BASE_URL}${endpoint}`;
      const response = await axios.get(url, {
        timeout: 5000,
        headers: N8N_API_KEY ? { 'X-API-Key': N8N_API_KEY } : {},
      });
      if (response.status === 200) {
        console.log(`[N8N] Health check passed at ${url}`);
        return true;
      }
    } catch (error) {
      console.warn(`[N8N] Health check failed at ${N8N_BASE_URL}${endpoint}:`, error.message);
    }
  }

  console.warn('[N8N] Health check failed: no valid N8N health endpoint responded');
  return false;
}

module.exports = {
  callN8NFullAnalysis,
  callN8NModule,
  formatN8NResults,
  checkN8NHealth,
  WORKFLOWS,
  N8N_BASE_URL,
  N8N_ENABLED,
};
