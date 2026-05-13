const axios = require('axios');

// N8N Configuration
const N8N_BASE_URL = (process.env.N8N_BASE_URL || 'http://localhost:5678').replace(/\/+$/, '');
const N8N_API_KEY = process.env.N8N_API_KEY || '';
const N8N_ENABLED = String(process.env.N8N_ENABLED || 'true').toLowerCase() === 'true';

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

/**
 * Call n8n webhook for full analysis
 * The n8n workflow will orchestrate all 10 modules and return complete results
 */
async function callN8NFullAnalysis(papers, question) {
  try {
    console.log(`[N8N] Calling full analysis workflow with ${papers.length} papers`);
    
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
        timeout: 300000, // 5 minutes timeout for full analysis
        headers: N8N_API_KEY ? { 'X-API-Key': N8N_API_KEY } : {},
      });
      if (!response.data || response.status !== 200) {
        throw new Error(`N8N returned status ${response.status}`);
      }
      return response.data;
    };

    let lastError = null;
    for (const workflowName of FULL_ANALYSIS_FALLBACKS) {
      try {
        console.log(`[N8N] Trying workflow webhook: ${workflowName}`);
        const data = await tryWebhook(workflowName);
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
 * Format n8n results into the backend report structure
 * Maps n8n output to the existing AnalysisReport model schema
 */
function formatN8NResults(n8nResponse, papers) {
  try {
    // n8n should return all modules in this format
    const {
      module1 = {},
      module2 = {},
      module3 = {},
      module4 = {},
      module5 = {},
      module6 = {},
      module7 = {},
      module8 = {},
      module9 = {},
      module10 = {},
      reportTitle = 'Research Analysis Report',
      reportSummary = 'Analysis completed',
      reportMarkdown = '',
      reportHighlights = [],
      confidence = 0.85,
    } = n8nResponse;

    return {
      modules: {
        module1: module1 || { summaries: [] },
        module2: module2 || { topics: [], assignments: [] },
        module3: module3 || { gaps: [] },
        module4: module4 || { trends: [] },
        module5: module5 || { visualization: {} },
        module6: module6 || { gapEvidences: [] },
        module7: module7 || { contradictions: [] },
        module8: module8 || { matrix: {} },
        module9: module9 || { relatedWork: [] },
        module10: module10 || { honestyScore: 0.7 },
      },
      reportTitle,
      reportSummary,
      reportMarkdown,
      reportHighlights,
      confidence,
      processingTimeMs: n8nResponse.processingTimeMs || 0,
    };
  } catch (error) {
    console.error('[N8N] Error formatting results:', error.message);
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
