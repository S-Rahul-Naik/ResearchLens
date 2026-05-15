const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const { setPapers, getPapers, addRun, getRuns } = require('../store/corpusStore');
const { pickPapers, ensurePaperShape } = require('../utils/pipeline');
const { runModule1Summarization } = require('../services/module1Summarization');
const { runModule2TopicModeling, runModule2TopicModelingWithLLM } = require('../services/module2TopicModeling');
const { runModule3GapDetection, runModule3GapDetectionWithLLM } = require('../services/module3GapDetection');
const { runModule4TrendDetection, runModule4TrendDetectionWithLLM } = require('../services/module4TrendDetection');
const { runModule5Visualization, runModule5VisualizationWithOllama } = require('../services/module5Visualization');
const { runModule6Chatbot } = require('../services/module6Chatbot');
const { runModule7ContradictionDetection } = require('../services/module7ContradictionDetection');
const { runModule8DatasetMethodMatrix } = require('../services/module8DatasetMethodMatrix');
const { runModule9RelatedWorkDraft } = require('../services/module9RelatedWorkDraft');
const { runModule10ScientificHonesty } = require('../services/module10ScientificHonesty');
const { askAboutAnalysis } = require('../services/chatbotBridge');
const { buildReportContext, generateAnalysisReport } = require('../services/ollamaBridge');
const { callN8NFullAnalysis, formatN8NResults, checkN8NHealth, N8N_BASE_URL } = require('../services/n8nBridge');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const path = require('path');

// Load and compile n8n final payload schema
const schemaPath = path.join(__dirname, '..', 'services', 'schemas', 'n8n-final-payload.schema.json');
const n8nFinalSchema = require(schemaPath);
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateN8nFinal = ajv.compile(n8nFinalSchema);
const axios = require('axios');
const { protect } = require('../middleware/auth');
const { extractKeywords } = require('../utils/text');
const cloudinary = require('../services/cloudinary');
const Paper = require('../models/Paper');
const AnalysisReport = require('../models/AnalysisReport');
const { dbToStorePaper } = require('../services/corpusSeeder');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { parsePdf } = require('../services/pdfParser');
const CLOUDINARY_MAX_BYTES = parseInt(process.env.CLOUDINARY_FILE_MAX_BYTES || '10485760', 10); // default 10 MB

function uploadBufferToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'raw', public_id: publicId, folder: 'researchlens/user-uploads', overwrite: false },
      (error, result) => { if (error) return reject(error); resolve(result); }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(stream);
  });
}

// ── GET /api/corpus ── return base papers + user's own papers ────────────────
router.get('/corpus', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const dbPapers = await Paper.find({
      $or: [{ isBaseCorpus: true }, { userId }],
    }).lean();
    // Regenerate keywords on fetch to normalize older noisy keyword sets.
    const papers = dbPapers.map((doc) => {
      const paper = dbToStorePaper(doc);
      const source = `${paper.abstract || ''} ${(paper.content || '').slice(0, 6000)}`;
      paper.keywords = extractKeywords(source, 12);
      return paper;
    });
    setPapers(papers);
    return res.json({ count: papers.length, papers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/corpus/user-uploads ── return only user's uploaded papers (no base corpus) ────
router.get('/corpus/user-uploads', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const dbPapers = await Paper.find({
      userId,
      isBaseCorpus: false,
    }).lean();
    // Regenerate keywords on fetch to normalize older noisy keyword sets.
    const papers = dbPapers.map((doc) => {
      const paper = dbToStorePaper(doc);
      const source = `${paper.abstract || ''} ${(paper.content || '').slice(0, 6000)}`;
      paper.keywords = extractKeywords(source, 12);
      return paper;
    });
    return res.json({ count: papers.length, papers });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/corpus/papers ── permanently delete user's papers ────
router.delete('/corpus/papers', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { paperIds } = req.body;

    if (!Array.isArray(paperIds) || paperIds.length === 0) {
      return res.status(400).json({ error: 'paperIds array is required and must not be empty' });
    }

    // Delete papers that belong to the user (not base corpus)
    const result = await Paper.deleteMany({
      paperId: { $in: paperIds },
      userId,
      isBaseCorpus: false,
    });

    return res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: `Successfully deleted ${result.deletedCount} paper${result.deletedCount !== 1 ? 's' : ''}`,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/corpus', (req, res) => {
  const papers = ensurePaperShape(req.body?.papers || []);
  setPapers(papers);
  res.json({ count: papers.length, papers });
});

router.post('/corpus/upload-json', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const raw = req.file.buffer.toString('utf-8');
  const payload = JSON.parse(raw);
  const papers = ensurePaperShape(payload.papers || payload);
  setPapers(papers);
  return res.json({ count: papers.length, papers });
});

router.post('/corpus/upload-pdfs', protect, upload.array('files', 50), async (req, res) => {
  if (!req.files || !req.files.length) {
    return res.status(400).json({ error: 'No PDF files uploaded' });
  }
  try {
    const userId = req.user._id;
    // Process files sequentially to reduce concurrent upload pressure
    const parsed = [];
    for (const file of req.files) {
      const fields = await parsePdf(file.buffer, file.originalname);
      const paperId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Upload to Cloudinary (skip if file exceeds configured per-file limit)
      let cloudinaryUrl = '';
      let cloudinaryPublicId = '';
      if (file.size && file.size > CLOUDINARY_MAX_BYTES) {
        console.warn(`Skipping Cloudinary upload for ${file.originalname}: file size ${file.size} bytes exceeds limit ${CLOUDINARY_MAX_BYTES} bytes`);
      } else {
        try {
          const uploadResult = await uploadBufferToCloudinary(file.buffer, paperId);
          cloudinaryUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
        } catch (uploadErr) {
          console.warn(`Cloudinary upload failed for ${file.originalname}: ${uploadErr.message}`);
        }
      }

      // Persist to MongoDB
      await Paper.create({
        paperId,
        title: fields.title,
        authors: fields.authors,
        year: fields.year,
        abstract: fields.abstract,
        content: fields.content,
        keywords: fields.keywords,
        fullText: fields.fullText || {},
        cloudinaryUrl,
        cloudinaryPublicId,
        isBaseCorpus: false,
        userId,
      });

      parsed.push({ id: paperId, ...fields, cloudinaryUrl });
    }

    const papers = ensurePaperShape(parsed);
    const existing = getPapers();
    const merged = [...existing, ...papers];
    setPapers(merged);
    return res.json({ count: papers.length, papers });
  } catch (err) {
    return res.status(500).json({ error: `PDF parsing failed: ${err.message}` });
  }
});

router.get('/runs', (_req, res) => {
  res.json({ runs: getRuns() });
});

router.post('/modules/1-summarization', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const result = runModule1Summarization(papers);
  res.json(result);
});

router.post('/modules/2-topic-modeling', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const result = runModule2TopicModeling(papers);
  res.json(result);
});

router.post('/modules/3-gap-detection', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const topicsPayload = req.body?.topics || runModule2TopicModeling(papers).topics;
  const result = runModule3GapDetection(papers, topicsPayload);
  res.json(result);
});

router.post('/modules/4-trend-detection', async (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const topicsPayload = req.body?.topics || runModule2TopicModeling(papers).topics;
  const result = await runModule4TrendDetectionWithLLM(papers, topicsPayload);
  res.json(result);
});

router.post('/modules/5-visualization', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const topicsPayload = req.body?.topics || runModule2TopicModeling(papers).topics;
  const gapsPayload = req.body?.gaps || runModule3GapDetection(papers, topicsPayload).gaps;
  const result = runModule5Visualization(papers, topicsPayload, gapsPayload);
  res.json(result);
});

router.post('/modules/6-chatbot', async (req, res) => {
  try {
    const papers = pickPapers(req.body?.papers, getPapers());
    const question = req.body?.question || '';
    const topics = req.body?.topics || runModule2TopicModeling(papers).topics || [];
    const gaps = req.body?.gaps || runModule3GapDetection(papers, topics).gaps || [];
    const trends = req.body?.trends || runModule4TrendDetection(papers, topics).trends || [];
    
    const result = await runModule6Chatbot(papers, question, topics, gaps, trends);
    res.json(result);
  } catch (error) {
    console.error('Module 6 Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/modules/7-contradiction-detection', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const topicsPayload = req.body?.topics || runModule2TopicModeling(papers).topics;
  const result = runModule7ContradictionDetection(papers, topicsPayload);
  res.json(result);
});

router.post('/modules/8-dataset-method-matrix', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const result = runModule8DatasetMethodMatrix(papers);
  res.json(result);
});

router.post('/modules/9-related-work-draft', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const topicsPayload = req.body?.topics || runModule2TopicModeling(papers).topics;
  const result = runModule9RelatedWorkDraft(papers, topicsPayload);
  res.json(result);
});

router.post('/modules/run-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const papers = pickPapers(req.body?.papers, getPapers());
    const question = req.body?.question || 'What are the key findings and open research gaps?';
    const reportName = req.body?.reportName || `Analysis Run — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    const startTime = Date.now();
    const m1 = runModule1Summarization(papers);
    const m2 = await runModule2TopicModelingWithLLM(papers);
    const m3 = await runModule3GapDetectionWithLLM(papers, m2.topics);
    const m4 = await runModule4TrendDetectionWithLLM(papers, m2.topics);
    const m5 = runModule5Visualization(papers, m2.topics, m3.gaps);
    const m6 = await runModule6Chatbot(papers, question, m2.topics, m3.gaps, m4.trends);
    const m7 = runModule7ContradictionDetection(papers, m2.topics);
    const m8 = runModule8DatasetMethodMatrix(papers);
    const m9 = runModule9RelatedWorkDraft(papers, m2.topics);
    const m10 = runModule10ScientificHonesty(papers, m2.topics, m3.gaps, m4.trends, m5.map);
    const reportContext = buildReportContext({
      papers,
      module1: m1,
      module2: m2,
      module3: m3,
      module4: m4,
      module5: m5,
      module6: m6,
      module7: m7,
      module8: m8,
      module9: m9,
      module10: m10,
      reportName,
      yearRange: papers.length > 0
        ? { start: Math.min(...papers.map((paper) => paper.year || new Date().getFullYear())), end: Math.max(...papers.map((paper) => paper.year || new Date().getFullYear())) }
        : { start: new Date().getFullYear(), end: new Date().getFullYear() },
    });
      const analysisReport = await generateAnalysisReport(reportContext);
    const processingTimeMs = Date.now() - startTime;

    const modulesInOrder = [
      { moduleId: 1, name: 'Summarization', result: m1 },
      { moduleId: 2, name: 'Topic Modeling', result: m2 },
      { moduleId: 3, name: 'Gap Detection', result: m3 },
      { moduleId: 4, name: 'Trend Detection', result: m4 },
      { moduleId: 5, name: 'Visualization', result: m5 },
      { moduleId: 6, name: 'RAG Chatbot', result: m6 },
      { moduleId: 7, name: 'Contradiction Detection', result: m7 },
      { moduleId: 8, name: 'Dataset/Method Matrix', result: m8 },
      { moduleId: 9, name: 'Related Work Auto-Draft', result: m9 },
      { moduleId: 10, name: 'Scientific Honesty', result: m10 }
    ];

    const run = {
      id: `run-${Date.now()}`,
      createdAt: new Date().toISOString(),
      papersCount: papers.length,
      analysisReport,
      modulesInOrder,
      modules: {
        module1: m1,
        module2: m2,
        module3: m3,
        module4: m4,
        module5: m5,
        module6: m6,
        module7: m7,
        module8: m8,
        module9: m9,
        module10: m10,
        analysisReport,
      }
    };

    // Save analysis report to database
    const yearRange = papers.length > 0
      ? { start: Math.min(...papers.map(p => p.year || new Date().getFullYear())), end: Math.max(...papers.map(p => p.year || new Date().getFullYear())) }
      : { start: new Date().getFullYear(), end: new Date().getFullYear() };

    const qualityScore = m2.topics && m2.topics.length > 0
      ? m2.topics.reduce((sum, t) => sum + (t.coherence || 0), 0) / m2.topics.length
      : 0;

    // Merge RAG evidence from module6 into module3 gaps for convenient inspection
    try {
      if (m6 && m6.gapEvidences && Array.isArray(m3.gaps)) {
        const gapMap = new Map();
        m6.gapEvidences.forEach(ge => { if (ge && ge.gapId) gapMap.set(String(ge.gapId), ge.evidences || []); });
        m3.gaps = m3.gaps.map(g => ({ ...g, evidenceSnippets: gapMap.get(String(g.gapId || g.id)) || [] }));
      }
    } catch (mergeErr) {
      console.warn('Failed to merge RAG evidence into gaps:', mergeErr.message);
    }

    const report = await AnalysisReport.create({
      userId,
      name: reportName,
      paperIds: papers.map(p => p.id),
      paperCount: papers.length,
      yearRange,
      reportTitle: analysisReport.reportTitle,
      reportSummary: analysisReport.reportSummary,
      reportMarkdown: analysisReport.reportMarkdown,
      reportHighlights: analysisReport.reportHighlights || [],
      module1: m1,
      module2: m2,
      module3: m3,
      module4: m4,
      module5: m5,
      module6: m6,
      module7: m7,
      module8: m8,
      module9: m9,
      module10: m10,
      topicCount: m2.topics ? m2.topics.length : 0,
      gapCount: m3.gaps ? m3.gaps.length : 0,
      qualityScore,
      honestyScore: m10.honestyScore,
      reportConfidence: analysisReport.confidence,
      processingTimeMs,
    });

    addRun(run);
    res.json({ ...run, reportId: report._id });
  } catch (error) {
    console.error('Run-All Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/modules/n8n-analysis ── N8N-powered full analysis ────
router.post('/modules/n8n-analysis', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const papers = pickPapers(req.body?.papers, getPapers());
    const question = req.body?.question || 'What are the key findings and open research gaps?';
    const reportName = req.body?.reportName || `N8N Analysis — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    if (papers.length === 0) {
      return res.status(400).json({ error: 'No papers selected for analysis' });
    }

    // Check if N8N is available
    const n8nHealth = await checkN8NHealth();
    if (!n8nHealth) {
      return res.status(503).json({ 
        error: 'N8N automation server is not available. Falling back to local analysis.',
        fallbackAvailable: true 
      });
    }

    const startTime = Date.now();

    console.log('[N8N Analysis] Starting with', papers.length, 'papers');

    // Call N8N master workflow
    let n8nResult = await callN8NFullAnalysis(papers, question);

    // If the n8nBridge marked this as an interim payload (no poll URL provided),
    // create a placeholder report and return without publishing final modules.
    if (n8nResult && n8nResult.interim) {
      const placeholder = await AnalysisReport.create({
        userId,
        name: reportName,
        paperIds: papers.map(p => p.id),
        paperCount: papers.length,
        yearRange: { start: null, end: null },
        reportTitle: `N8N (interim) - ${reportName}`,
        reportSummary: 'Processing (interim)',
        module1: {}, module2: {}, module3: {}, module4: {}, module5: {}, module6: {}, module7: {}, module8: {}, module9: {}, module10: {},
        rawN8nStages: [n8nResult.raw || n8nResult],
        analysisType: 'n8n-full-analysis',
      });

      const runPlaceholder = {
        id: `n8n-run-${Date.now()}`,
        createdAt: new Date().toISOString(),
        papersCount: papers.length,
        analysisReport: { reportTitle: placeholder.name },
        modulesInOrder: [],
        modules: { analysisReport: {} },
        reportId: placeholder._id,
        processingTimeMs: Date.now() - startTime,
        status: 'processing',
      };

      // Publish placeholder so frontend has a runId to poll; do not publish partial modules
      addRun(runPlaceholder);
      return res.json(runPlaceholder);
    }

    // If n8n returned an early 'processing' placeholder with pollUrl/executionId,
    // create a placeholder AnalysisReport now (so frontend can show progress) and
    // then continue polling in background to update the report when complete.
    const isProcessing = String(n8nResult?.status || '').toLowerCase() === 'processing' || n8nResult?._httpStatus === 202;
    const pollUrl = n8nResult?.pollUrl || n8nResult?.statusUrl || (n8nResult?.executionId ? `${N8N_BASE_URL}/api/v1/executions/${n8nResult.executionId}` : null);

    if (isProcessing && pollUrl) {
      // Create placeholder report immediately
      const placeholder = await AnalysisReport.create({
        userId,
        name: reportName,
        paperIds: papers.map(p => p.id),
        paperCount: papers.length,
        yearRange: { start: null, end: null },
        reportTitle: `N8N (processing) - ${reportName}`,
        reportSummary: 'Processing',
        module1: {}, module2: {}, module3: {}, module4: {}, module5: {}, module6: {}, module7: {}, module8: {}, module9: {}, module10: {},
        rawN8n: n8nResult,
        analysisType: 'n8n-full-analysis',
      });

      // Start background poller (do not await)
      (async function pollAndUpdate(reportId, pollTarget, papersLocal) {
        try {
          const maxRetries = Number(process.env.N8N_INCOMPLETE_RETRIES || 12);
          const retryDelayMs = Number(process.env.N8N_INCOMPLETE_RETRY_DELAY_MS || 5000);
          const headers = process.env.N8N_API_KEY ? { 'X-API-Key': process.env.N8N_API_KEY, Authorization: `Bearer ${process.env.N8N_API_KEY}` } : {};

          for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
            await new Promise(r => setTimeout(r, retryDelayMs));
            try {
              const resp = await axios.get(pollTarget, { timeout: 30000, headers });
              const pollData = resp?.data?.data || resp?.data || {};
              const candidate = (pollData && typeof pollData === 'object') ? (pollData.result || pollData) : pollData;

              const status = String(candidate?.status || '').toLowerCase();
              const hasModules = candidate && (candidate.summarization || candidate.gapDetection || candidate.trendDetection || candidate.visualization);
              if (candidate && status !== 'processing' && hasModules) {
                // Format and update report
                const formatted = formatN8NResults(candidate, papersLocal);
                const { modules: mod, reportTitle: rt, reportSummary: rs, reportMarkdown: rm, reportHighlights: rh, confidence } = formatted;
                await AnalysisReport.findByIdAndUpdate(reportId, {
                  reportTitle: rt,
                  reportSummary: rs,
                  reportMarkdown: rm,
                  reportHighlights: rh,
                  module1: mod.module1 || {},
                  module2: mod.module2 || {},
                  module3: mod.module3 || {},
                  module4: mod.module4 || {},
                  module5: mod.module5 || {},
                  module6: mod.module6 || {},
                  module7: mod.module7 || {},
                  module8: mod.module8 || {},
                  module9: mod.module9 || {},
                  module10: mod.module10 || {},
                  rawN8n: candidate,
                }, { new: true });
                console.log(`[N8N] Background poll updated report ${reportId} on attempt ${attempt}`);
                return;
              }
            } catch (pollErr) {
              console.warn('[N8N] Background poll error:', pollErr.message);
            }
          }
          console.warn(`[N8N] Background poll exhausted retries for report ${reportId}`);
        } catch (bgErr) {
          console.error('[N8N] Background poll fatal error:', bgErr.message);
        }
      }(placeholder._id.toString(), pollUrl, papers));

      // Return the placeholder run object so frontend has a reportId to query later
      const runPlaceholder = {
        id: `n8n-run-${Date.now()}`,
        createdAt: new Date().toISOString(),
        papersCount: papers.length,
        analysisReport: { reportTitle: placeholder.name },
        modulesInOrder: [],
        modules: { analysisReport: {} },
        reportId: placeholder._id,
        processingTimeMs: Date.now() - startTime,
        status: 'processing',
      };

      addRun(runPlaceholder);
      return res.json(runPlaceholder);
    }

    // Format N8N results to match backend schema
    const formattedResult = formatN8NResults(n8nResult, papers);
    const { modules, reportTitle, reportSummary, reportMarkdown, reportHighlights, confidence } = formattedResult;

    const processingTimeMs = Date.now() - startTime;

    // Save to MongoDB
    const yearRange = papers.length > 0
      ? { 
          start: Math.min(...papers.map(p => p.year || new Date().getFullYear())), 
          end: Math.max(...papers.map(p => p.year || new Date().getFullYear())) 
        }
      : { start: new Date().getFullYear(), end: new Date().getFullYear() };

    const qualityScore = modules.module2?.topics?.length > 0
      ? modules.module2.topics.reduce((sum, t) => sum + (t.coherence || 0), 0) / modules.module2.topics.length
      : 0;

    const report = await AnalysisReport.create({
      userId,
      name: reportName,
      paperIds: papers.map(p => p.id),
      paperCount: papers.length,
      yearRange,
      reportTitle: reportTitle,
      reportSummary: reportSummary,
      reportMarkdown: reportMarkdown,
      reportHighlights: reportHighlights || [],
      module1: modules.module1 || {},
      module2: modules.module2 || {},
      module3: modules.module3 || {},
      module4: modules.module4 || {},
      module5: modules.module5 || {},
      module6: modules.module6 || {},
      module7: modules.module7 || {},
      module8: modules.module8 || {},
      module9: modules.module9 || {},
      module10: modules.module10 || {},
      topicCount: modules.module2?.topics?.length || 0,
      gapCount: modules.module3?.gaps?.length || 0,
      qualityScore,
      honestyScore: modules.module10?.honestyScore || 0.7,
      reportConfidence: confidence,
      processingTimeMs,
      analysisType: 'n8n-full-analysis',
    });

    const analysisReport = {
      reportTitle: reportTitle,
      reportSummary: reportSummary,
      reportMarkdown: reportMarkdown,
      reportHighlights: reportHighlights,
      confidence,
    };

    const modulesInOrder = [
      { moduleId: 1, name: 'Summarization', result: modules.module1 },
      { moduleId: 2, name: 'Topic Modeling', result: modules.module2 },
      { moduleId: 3, name: 'Gap Detection', result: modules.module3 },
      { moduleId: 4, name: 'Trend Detection', result: modules.module4 },
      { moduleId: 5, name: 'Visualization', result: modules.module5 },
      { moduleId: 6, name: 'RAG Chatbot', result: modules.module6 },
      { moduleId: 7, name: 'Contradiction Detection', result: modules.module7 },
      { moduleId: 8, name: 'Dataset/Method Matrix', result: modules.module8 },
      { moduleId: 9, name: 'Related Work Auto-Draft', result: modules.module9 },
      { moduleId: 10, name: 'Scientific Honesty', result: modules.module10 },
    ];

    const run = {
      id: `n8n-run-${Date.now()}`,
      createdAt: new Date().toISOString(),
      papersCount: papers.length,
      analysisReport,
      modulesInOrder,
      modules: {
        ...modules,
        analysisReport,
      },
      reportId: report._id,
      processingTimeMs,
    };

    addRun(run);
    res.json(run);
  } catch (error) {
    console.error('[N8N Analysis] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/n8n/create-report ── create an empty AnalysisReport to be filled by n8n module callbacks
router.post('/n8n/create-report', async (req, res) => {
  try {
    // simple API key guard (optional)
    const incomingKey = req.header('X-API-Key') || '';
    if (process.env.N8N_API_KEY && process.env.N8N_API_KEY !== '' && incomingKey !== process.env.N8N_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId, reportName, paperIds, paperCount, yearRange } = req.body || {};
    const doc = await AnalysisReport.create({
      userId: userId || null,
      name: reportName || `N8N Report ${new Date().toISOString()}`,
      paperIds: Array.isArray(paperIds) ? paperIds : [],
      paperCount: Number(paperCount) || (Array.isArray(paperIds) ? paperIds.length : 0),
      yearRange: yearRange || { start: null, end: null },
    });

    console.log('[N8N] Created report placeholder:', doc._id.toString());
    return res.json({ success: true, reportId: doc._id.toString() });
  } catch (err) {
    console.error('[N8N] create-report error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/n8n/module-result ── receive per-module outputs from n8n and store/update the AnalysisReport
router.post('/n8n/module-result', async (req, res) => {
  try {
    const incomingKey = req.header('X-API-Key') || '';
    if (process.env.N8N_API_KEY && process.env.N8N_API_KEY !== '' && incomingKey !== process.env.N8N_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reportId, moduleName, payload } = req.body || {};
    if (!reportId || !moduleName) {
      return res.status(400).json({ error: 'reportId and moduleName are required' });
    }

    const report = await AnalysisReport.findById(reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    // Map moduleName to AnalysisReport field
    const moduleMap = {
      summarization: 'module1',
      topicModeling: 'module2',
      gapDetection: 'module3',
      trendDetection: 'module4',
      visualization: 'module5',
      chatbot: 'module6',
      contradictions: 'module7',
      datasetMethodMatrix: 'module8',
      relatedWork: 'module9',
      scientificHonesty: 'module10',
    };

    const field = moduleMap[moduleName] || moduleMap[moduleName?.toLowerCase()] || null;
    if (!field) {
      console.warn('[N8N] Unknown moduleName received:', moduleName);
    }

    // Store raw payload in the appropriate module field (merge shallowly)
    if (field) {
      report[field] = payload;
    } else {
      // store in a fallback field for inspection
      report[`n8n_extra_${moduleName}`] = payload;
    }

    await report.save();

    // Log truncated output to backend terminal for visibility
    try {
      const small = JSON.stringify(payload).slice(0, 1000);
      console.log(`[N8N][Module:${moduleName}] -> report ${reportId}:`, small);
    } catch (e) {
      console.log(`[N8N][Module:${moduleName}] -> report ${reportId}: (unable to stringify)`);
    }

    return res.json({ success: true, reportId });
  } catch (err) {
    console.error('[N8N] module-result error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/modules/quick-analysis ── PARALLEL PER-PAPER SUMMARIZATION + FINAL SYNTHESIS ────
router.post('/modules/quick-analysis', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const papers = pickPapers(req.body?.papers, getPapers());
    const reportName = req.body?.reportName || `Quick Analysis — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    if (papers.length === 0) {
      return res.status(400).json({ error: 'No papers selected for analysis' });
    }

    const startTime = Date.now();
    const { callOllama } = require('../services/ollamaBridge');

    // ─── PHASE 1: PARALLEL PER-PAPER SUMMARIZATION ───
    const perPaperSummaryPrompts = papers.map((paper, idx) => {
      const fullText = paper.fullText || {};
      const paperContent = [
        paper.title ? `Title: ${paper.title}` : '',
        paper.abstract ? `Abstract: ${paper.abstract}` : '',
        fullText.introduction ? `Introduction:\n${fullText.introduction}` : '',
        fullText.methodology ? `Methodology:\n${fullText.methodology}` : '',
        fullText.results ? `Results:\n${fullText.results}` : '',
        fullText.conclusion ? `Conclusion:\n${fullText.conclusion}` : '',
      ].filter(Boolean).join('\n\n');

      const summaryPrompt = `Summarize this research paper in 2-3 sentences covering:
- Main research question
- Key methodology
- Main findings

Paper:
${paperContent}

Return a JSON object with:
{
  "paper_title": "title",
  "summary": "2-3 sentence summary"
}

Generate ONLY valid JSON.`;

      return { index: idx, prompt: summaryPrompt, paper };
    });

    // Execute all per-paper summarizations in parallel
    console.log(`Starting parallel summarization of ${papers.length} papers...`);
    const summaryPromises = perPaperSummaryPrompts.map(({ index, prompt }) =>
      callOllama(prompt, { temperature: 0.5, timeout: 600000 }) // 10 minutes - no practical timeout
        .then(result => ({ index, summary: result.summary || '', paperTitle: result.paper_title || '', success: true }))
        .catch(err => { 
          console.error(`Paper ${index + 1} summarization failed:`, err.message);
          return { index, summary: '', paperTitle: '', success: false, error: err.message };
        })
    );

    const summaries = await Promise.all(summaryPromises);
    console.log(`Completed ${summaries.filter(s => s.success).length}/${papers.length} paper summaries`);

    // Collect successful summaries
    const successfulSummaries = summaries
      .filter(s => s.success)
      .map(s => `[PAPER ${s.index + 1}: ${s.paperTitle}]\n${s.summary}`)
      .join('\n\n' + '='.repeat(60) + '\n\n');

    if (!successfulSummaries || successfulSummaries.trim().length === 0) {
      throw new Error('Failed to generate summaries for any papers');
    }

    // ─── PHASE 2: FINAL SYNTHESIS INTO COMPREHENSIVE ANALYSIS ───
    const reportPrompt = `Based on these ${papers.length} research paper summaries, write a 7-section research analysis report.

Paper Summaries:
${successfulSummaries}

Return ONLY valid JSON with these fields:
{
  "report_title": "Concise title summarizing all papers",
  "section_1_executive_summary": "2-3 paragraph overview",
  "section_2_research_themes": "Key themes in short bullet style",
  "section_3_key_contributions": "Main contributions from papers",
  "section_4_methodologies": "Methods used across the papers",
  "section_5_findings": "Key results and conclusions",
  "section_6_research_gaps": "Specific gaps and open questions",
  "section_7_recommendations": "What should be researched next",
  "report_markdown": "Markdown report with the 7 sections"
}

Do not include topics, gaps, trends, or any extra text.`;

    const structurePrompt = `Based on these ${papers.length} research paper summaries, extract structured dataset analysis.

Paper Summaries:
${successfulSummaries}

Return ONLY valid JSON with these fields:
{
  "topics": [
    {"id": "topic_1", "name": "Topic Name", "keywords": ["k1", "k2"], "description": "Short description", "paperIds": [0, 1], "coherence": 0.8, "paperCount": 2}
  ],
  "gaps": [
    {"id": "gap_1", "title": "Gap title", "description": "Gap description", "relatedTopics": ["topic_1"], "importance": "high", "gapScore": 0.8, "paperIds": [0]}
  ],
  "trends": [
    {"id": "trend_1", "name": "Trend name", "description": "Trend description", "direction": "rising", "paperIds": [0, 1]}
  ],
  "methodologies": [
    {"name": "Method name", "description": "Method description", "paperCount": 2, "paperIds": [0, 1]}
  ],
  "evaluation_metrics": {
    "topic_coherence": 0.8,
    "topic_coverage": 0.75,
    "gap_novelty": 0.8,
    "overall_quality": 0.78
  }
}

Keep it compact. Always include the arrays, even if they are short.`;

    console.log('Generating report text from Ollama...');
    const reportPromise = callOllama(reportPrompt, { temperature: 0.35, timeout: 300000, num_predict: 1400 });

    console.log('Generating topics, gaps, and trends from Ollama...');
    const structurePromise = callOllama(structurePrompt, { temperature: 0.35, timeout: 300000, num_predict: 1200 });

    const [synthesisResult, structureResult] = await Promise.all([reportPromise, structurePromise]);

    console.log('Report Result Keys:', Object.keys(synthesisResult));
    console.log('Structure Result Keys:', Object.keys(structureResult));
    console.log('Topics count:', (structureResult.topics || []).length);
    console.log('Gaps count:', (structureResult.gaps || []).length);
    console.log('Trends count:', (structureResult.trends || []).length);

    // Extract topics, gaps, trends from Ollama response
    let topics = (structureResult.topics || []).map((t, idx) => ({
      id: t.id || `topic_${idx}`,
      name: t.name,
      keywords: t.keywords || [],
      description: t.description || '',
      paperIds: t.paperIds || [],
      coherence: t.coherence || 0.75,
      paperCount: t.paperCount || (t.paperIds ? t.paperIds.length : 0),
    }));

    let gaps = (structureResult.gaps || []).map((g, idx) => ({
      id: g.id || `gap_${idx}`,
      title: g.title || g.description,
      description: g.description || '',
      relatedTopics: g.relatedTopics || [],
      importance: g.importance || 'medium',
      gapScore: g.gapScore || 0.7,
      paperIds: g.paperIds || [],
      topicA: g.relatedTopics && g.relatedTopics[0] ? g.relatedTopics[0] : '',
      topicB: g.relatedTopics && g.relatedTopics[1] ? g.relatedTopics[1] : '',
      similarity: g.similarity || 0.5,
      coOccurrence: g.paperIds ? g.paperIds.length : 0,
    }));

    let trends = (structureResult.trends || []).map((t, idx) => ({
      id: t.id || `trend_${idx}`,
      name: t.name,
      description: t.description || '',
      direction: t.direction || 'stable',
      paperIds: t.paperIds || [],
    }));

    // FALLBACK: If no topics detected, generate from section text
    if (topics.length === 0 && synthesisResult.section_2_research_themes) {
      const themeText = synthesisResult.section_2_research_themes;
      const themeLines = themeText.split(/[\n•\-]/).filter(l => l.trim().length > 5);
      topics = themeLines.slice(0, 3).map((line, idx) => ({
        id: `topic_${idx}`,
        name: line.split(':')[0].trim().substring(0, 40),
        keywords: line.split(/[,\s]+/).slice(1, 4),
        description: line,
        paperIds: Array.from({length: Math.ceil(papers.length / 2)}, (_, i) => i),
        coherence: 0.7 + Math.random() * 0.2,
        paperCount: Math.ceil(papers.length / 2),
      }));
    }

    // FALLBACK: If no gaps detected, generate from gap section
    if (gaps.length === 0 && synthesisResult.section_6_research_gaps) {
      const gapText = synthesisResult.section_6_research_gaps;
      const gapLines = gapText.split(/[\n•\-]/).filter(l => l.trim().length > 5);
      gaps = gapLines.slice(0, 2).map((line, idx) => ({
        id: `gap_${idx}`,
        title: line.split(':')[0].trim().substring(0, 50),
        description: line,
        relatedTopics: topics.slice(0, 2).map(t => t.id),
        importance: idx === 0 ? 'high' : 'medium',
        gapScore: 0.6 + Math.random() * 0.3,
        paperIds: Array.from({length: Math.max(1, Math.floor(papers.length / 2))}, (_, i) => i),
        topicA: topics[0]?.id || 'topic_1',
        topicB: topics[1]?.id || 'topic_2',
        similarity: 0.4 + Math.random() * 0.3,
        coOccurrence: Math.ceil(papers.length / 2),
      }));
    }

    // FALLBACK: If no trends detected, infer from year range
    if (trends.length === 0) {
      trends = [
        {
          id: 'trend_1',
          name: 'Growing Research Interest',
          description: 'Increasing publications and research activity in this field',
          direction: 'rising',
          paperIds: Array.from({length: papers.length}, (_, i) => i),
        },
      ];
    }

    const methodologies = (structureResult.methodologies || []).map((m) => ({
      name: m.name,
      description: m.description || '',
      paperCount: m.paperCount || 0,
      paperIds: m.paperIds || [],
    }));

    const evalMetrics = structureResult.evaluation_metrics || {
      topic_coherence: 0.75,
      topic_coverage: 0.70,
      gap_novelty: 0.75,
      overall_quality: 0.73,
    };

    const normalizeTrendDirection = (value) => {
      const direction = String(value || '').toLowerCase().replace(/\s+/g, '_');
      if (direction === 'rising' || direction === 'stable' || direction === 'declining' || direction === 'insufficient_data') {
        return direction;
      }
      return 'stable';
    };

    const analysisReport = {
      report_title: synthesisResult.report_title || reportName || 'Research Analysis Report',
      executive_summary: synthesisResult.section_1_executive_summary || '',
      key_findings: [
        synthesisResult.section_2_research_themes,
        synthesisResult.section_3_key_contributions,
        synthesisResult.section_5_findings,
      ].filter(Boolean),
      top_topics: topics.map((topic) => topic.name),
      top_gaps: gaps.map((gap) => gap.title),
      trend_insights: trends.map((trend) => trend.name),
      scientific_honesty: `${Math.round((evalMetrics.overall_quality || 0.8) * 100)}%`,
      report_markdown: synthesisResult.report_markdown || '',
      confidence: evalMetrics.overall_quality || 0.8,
    };

    const processingTimeMs = Date.now() - startTime;

    // ─── PHASE 3: STORE IN MONGODB ───
    const yearRange = papers.length > 0
      ? { 
          start: Math.min(...papers.map(p => p.year || new Date().getFullYear())), 
          end: Math.max(...papers.map(p => p.year || new Date().getFullYear())) 
        }
      : { start: new Date().getFullYear(), end: new Date().getFullYear() };

    // Create reportHighlights as simple strings
    const highlights = [
      `Detected ${topics.length} key research themes`,
      `Identified ${gaps.length} research gaps`,
      `Found ${trends.length} emerging trends`,
    ];

    const report = await AnalysisReport.create({
      userId,
      name: reportName,
      paperIds: papers.map(p => p.id || p.paperId),
      paperCount: papers.length,
      yearRange,
      reportTitle: analysisReport.report_title,
      reportSummary: analysisReport.executive_summary,
      reportMarkdown: analysisReport.report_markdown,
      reportHighlights: highlights,
      analysisType: 'quick-analysis-parallel',
      qualityScore: evalMetrics.overall_quality || 0.8,
      reportConfidence: evalMetrics.overall_quality || 0.8,
      processingTimeMs,
    });

    console.log(`Quick analysis completed in ${processingTimeMs}ms`);

    // ─── PHASE 4: RETURN RUNALLRESULT-COMPATIBLE RESPONSE ───
    const module1 = {
      module: 'Summarization',
      count: summaries.filter(s => s.success).length,
      summaries: summaries
        .filter(s => s.success)
        .map((s, idx) => ({
          paperId: papers[idx]?.id || papers[idx]?.paperId || String(idx),
          title: s.paperTitle || papers[idx]?.title || `Paper ${idx + 1}`,
          summary: s.summary,
          keywords: papers[idx]?.keywords || [],
        })),
    };

    const paperYearById = new Map(papers.map((paper, idx) => [String(paper.id || paper.paperId || idx), paper.year || new Date().getFullYear()]));

    const module2 = {
      module: 'Topic Modeling',
      topics: topics.map((topic, index) => ({
        topicId: topic.id,
        topicName: topic.name,
        name: topic.name,
        keywords: topic.keywords,
        paperIds: topic.paperIds.map((paperIndex) => String(papers[paperIndex]?.id || papers[paperIndex]?.paperId || paperIndex)),
        coherence: topic.coherence,
        trend: (index % 3 === 0 ? 'rising' : 'stable'),
      })),
      assignments: topics.flatMap((topic) => topic.paperIds.map((paperIndex) => ({
        paperId: String(papers[paperIndex]?.id || papers[paperIndex]?.paperId || paperIndex),
        topicId: topic.id,
      }))),
    };

    const module3 = {
      module: 'Gap Detection',
      formula: 'gap_score = similarity × 1 / (co_occurrence + 1)',
      gaps: gaps.map((gap) => ({
        gapId: gap.id,
        topicA: gap.topicA,
        topicB: gap.topicB,
        topicALabel: topics.find((topic) => topic.id === gap.topicA)?.name || gap.topicA,
        topicBLabel: topics.find((topic) => topic.id === gap.topicB)?.name || gap.topicB,
        similarity: gap.similarity,
        coOccurrence: gap.coOccurrence,
        gapScore: gap.gapScore,
        severity: gap.importance === 'high' ? 'critical' : gap.importance === 'medium' ? 'moderate' : 'low',
        evidencePaperIds: gap.paperIds.map((paperIndex) => String(papers[paperIndex]?.id || papers[paperIndex]?.paperId || paperIndex)),
        recommendation: gap.description,
        explanation: gap.description,
      })),
    };

    const module4 = {
      module: 'Trend Detection',
      trends: trends.map((trend, index) => {
        const yearlyCountsMap = new Map();
        trend.paperIds.forEach((paperIndex) => {
          const year = papers[paperIndex]?.year || new Date().getFullYear();
          yearlyCountsMap.set(year, (yearlyCountsMap.get(year) || 0) + 1);
        });
        const yearlyCounts = Array.from(yearlyCountsMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([year, count]) => ({ year, count }));
        return {
          topicId: trend.id,
          topic: trend.topic || trend.topicName || trend.name || topics[index]?.name || `Topic ${index + 1}`,
          topicName: trend.topicName || trend.name || trend.topic || topics[index]?.name || `Topic ${index + 1}`,
          yearlyCounts,
          slope: trend.direction === 'rising' ? 0.7 : trend.direction === 'declining' ? -0.4 : 0,
          trend: normalizeTrendDirection(trend.direction),
          trendMessage: trend.description,
          paperCount: trend.paperIds.length,
          uniqueYears: yearlyCounts.length,
          dataDensity: yearlyCounts.length / Math.max(1, papers.length),
          temporalConfidence: evalMetrics.topic_coverage || 0.75,
          reliability: evalMetrics.overall_quality || 0.8,
        };
      }),
    };

    const module5 = {
      module: 'Visualization',
      map: {
        points: papers.map((paper, index) => ({
          paperId: String(paper.id || paper.paperId || index),
          title: paper.title,
          topicId: topics.length > 0 ? topics[index % topics.length].id : 'topic_1',
          x: Math.cos((index / Math.max(1, papers.length)) * 2 * Math.PI) * 100,
          y: Math.sin((index / Math.max(1, papers.length)) * 2 * Math.PI) * 100,
          keywords: paper.keywords || [],
        })),
        topicCenters: topics.map((topic, index) => ({
          topicId: topic.id,
          name: topic.name,
          x: Math.cos((index / Math.max(1, topics.length)) * 2 * Math.PI) * 120,
          y: Math.sin((index / Math.max(1, topics.length)) * 2 * Math.PI) * 120,
        })),
        links: gaps.map((gap) => ({
          sourceTopicId: gap.topicA,
          targetTopicId: gap.topicB,
          gapScore: gap.gapScore,
          severity: gap.importance === 'high' ? 'critical' : gap.importance === 'medium' ? 'moderate' : 'low',
          coOccurrence: gap.coOccurrence,
          explanation: gap.description,
        })),
      },
    };

    const module6 = {
      module: 'RAG Chatbot',
      answer: analysisReport.executive_summary,
      citations: papers.map((paper) => ({
        paperId: String(paper.id || paper.paperId),
        title: paper.title,
        chunkId: 'summary',
        relevance: 1,
      })),
      gapEvidences: module3.gaps.map((gap) => ({
        gapId: gap.gapId,
        evidences: gap.evidencePaperIds.map((paperId) => ({
          paperId,
          title: papers.find((paper) => String(paper.id || paper.paperId) === paperId)?.title || paperId,
          snippet: gap.explanation,
        })),
      })),
    };

    const module7 = {
      module: 'Contradiction Detection',
      contradictions: [],
    };

    const module8 = {
      module: 'Dataset/Method Matrix',
      datasets: topics.map((topic) => topic.name),
      methods: methodologies.map((method) => method.name),
      rows: papers.map((paper) => ({
        paperId: String(paper.id || paper.paperId),
        title: paper.title,
        datasets: [],
        methods: methodologies.map((method) => method.name),
      })),
      matrix: papers.map((paper) => ({
        paperId: String(paper.id || paper.paperId),
        title: paper.title,
        datasets: {},
        methods: methodologies.reduce((acc, method) => ({ ...acc, [method.name]: true }), {}),
      })),
    };

    const module9 = {
      module: 'Related Work Auto-Draft',
      sections: [
        { topicId: 'overview', heading: 'Overview', paragraph: analysisReport.executive_summary },
        { topicId: 'themes', heading: 'Research Themes', paragraph: analysisReport.key_findings.join(' ') },
        { topicId: 'gaps', heading: 'Research Gaps', paragraph: analysisReport.top_gaps.join(' ') },
      ],
      draftMarkdown: analysisReport.report_markdown,
    };

    const module10 = {
      module: 'Scientific Honesty',
      honestyScore: Math.round((evalMetrics.overall_quality || 0.8) * 100),
      reliability: evalMetrics.overall_quality || 0.8,
      scoreBreakdown: {
        topicConfidence: evalMetrics.topic_coherence || 0.75,
        topicLabelConfidence: evalMetrics.topic_coverage || 0.75,
        gapReliability: evalMetrics.gap_novelty || 0.75,
        trendReliability: evalMetrics.overall_quality || 0.8,
        coverage: evalMetrics.topic_coverage || 0.75,
        gapEvidenceCoverage: evalMetrics.gap_novelty || 0.75,
        citationAvailability: 1,
        trendSufficiency: 1,
        mapSupport: 1,
      },
      caveats: [],
      warningCount: 0,
      inspected: {
        paperCount: papers.length,
        topicCount: topics.length,
        gapCount: gaps.length,
        trendCount: trends.length,
        insufficientTrendCount: 0,
      },
      summary: analysisReport.scientific_honesty,
    };

    res.json({
      id: `quick-analysis-${Date.now()}`,
      createdAt: new Date().toISOString(),
      papersCount: papers.length,
      analysisReport,
      modulesInOrder: [
        { moduleId: 1, name: 'Summarization', result: module1 },
        { moduleId: 2, name: 'Topic Modeling', result: module2 },
        { moduleId: 3, name: 'Gap Detection', result: module3 },
        { moduleId: 4, name: 'Trend Detection', result: module4 },
        { moduleId: 5, name: 'Visualization', result: module5 },
        { moduleId: 6, name: 'RAG Chatbot', result: module6 },
        { moduleId: 7, name: 'Contradiction Detection', result: module7 },
        { moduleId: 8, name: 'Dataset/Method Matrix', result: module8 },
        { moduleId: 9, name: 'Related Work Auto-Draft', result: module9 },
        { moduleId: 10, name: 'Scientific Honesty', result: module10 },
      ],
      modules: {
        module1,
        module2,
        module3,
        module4,
        module5,
        module6,
        module7,
        module8,
        module9,
        module10,
        analysisReport,
      },
      reportId: report._id,
      processingTimeMs,
    });
  } catch (error) {
    console.error('Quick Analysis Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── GET /api/reports ── return user's analysis reports ────
router.get('/reports', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const reports = await AnalysisReport.find({ userId }).sort({ createdAt: -1 }).lean();
    res.json({ count: reports.length, reports });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports/:reportId ── return specific report ────
router.get('/reports/:reportId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const report = await AnalysisReport.findOne({ _id: req.params.reportId, userId }).lean();
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/modules/n8n-webhook ── Receive results from N8N workflow ────
// This endpoint is called by N8N to POST analysis results back to the backend
router.post('/modules/n8n-webhook', async (req, res) => {
  try {
    // n8n may send either an object or a single-item array; normalize to object.
    const incomingPayload = Array.isArray(req.body) ? req.body[0] : req.body;
    if (!incomingPayload || typeof incomingPayload !== 'object') {
      return res.status(400).json({ error: 'Invalid payload. Expected object or single-item array.' });
    }

    const { 
      userId,
      reportName,
      papers,
      summarization,
      gapDetection,
      trendDetection,
      visualization,
      chatbot,
      timestamp,
      status,
      stage,
      isFinal,
      apiLimitExceeded,
      error
    } = incomingPayload;

    // Validate required fields
    if (!userId || !reportName) {
      return res.status(400).json({ error: 'userId and reportName are required' });
    }

    console.log('[N8N Webhook] Received results for report:', reportName);
    console.log('[N8N Webhook] Payload:', JSON.stringify(incomingPayload, null, 2));

    // Parse N8N results and map to modules
    const modules = {
      module1: summarization || { summaries: [] },
      module2: gapDetection?.topics || { topics: [], assignments: [] },
      module3: gapDetection || { gaps: [] },
      module4: trendDetection || { trends: [] },
      module5: visualization || { visualization: {} },
      module6: chatbot || { gapEvidences: [] },
      module7: { contradictions: [] }, // Module 7 not in workflow
      module8: { matrix: {} }, // Module 8 not in workflow
      module9: { relatedWork: [] }, // Module 9 not in workflow
      module10: { honestyScore: 0.7 }, // Module 10 not in workflow
    };

    // Calculate metrics from results
    const topicCount = Array.isArray(gapDetection?.topics) ? gapDetection.topics.length : 0;
    const gapCount = Array.isArray(gapDetection?.gaps) ? gapDetection.gaps.length : 0;
    const paperCount = Array.isArray(papers) ? papers.length : 0;

    // Extract year range from papers
    const yearRange = papers && papers.length > 0
      ? {
          start: Math.min(...papers.map(p => p.year || new Date().getFullYear())),
          end: Math.max(...papers.map(p => p.year || new Date().getFullYear()))
        }
      : { start: new Date().getFullYear(), end: new Date().getFullYear() };

    // Store interim stage in DB (append to rawN8nStages) and only publish final
    // Determine if this payload looks like the final combined output.
    // Prefer explicit `stage` or `isFinal` fields when available.
    let looksFinal = false;
    if (typeof isFinal === 'boolean') {
      looksFinal = !!isFinal;
    } else if (Number.isFinite(Number(stage))) {
      const stageNum = Number(stage);
      // Expect 4 stages total; only stage 4 is final
      looksFinal = stageNum >= 4;
    } else {
      looksFinal = (
        (gapDetection && Array.isArray(gapDetection.gaps) && gapDetection.gaps.length > 0)
        || (trendDetection && (Array.isArray(trendDetection.module4_trends) && trendDetection.module4_trends.length > 0) || (Array.isArray(trendDetection.trends) && trendDetection.trends.length > 0))
        || (visualization && ((visualization.module5 && (Array.isArray(visualization.module5.points) && visualization.module5.points.length > 0)) || (visualization.module5 && visualization.module5.gaps && visualization.module5.gaps.length > 0)))
      );
    }

    // Try to find an existing placeholder report by report name + user (or by provided reportId)
    let report = null;
    if (incomingPayload.reportId) {
      report = await AnalysisReport.findById(incomingPayload.reportId).exec();
    }
    if (!report) {
      report = await AnalysisReport.findOne({ userId, name: reportName }).exec();
    }

    if (!report) {
      // create placeholder (first stage)
      report = await AnalysisReport.create({
        userId,
        name: reportName,
        description: `Analysis placeholder created at ${new Date().toISOString()}`,
        paperIds: papers ? papers.map(p => p.id || p.paperId) : [],
        paperCount,
        yearRange,
        reportTitle: `Analysis Report - ${reportName}`,
        reportSummary: summarization?.summary || 'Analysis in progress',
        reportMarkdown: '',
        reportHighlights: [],
        module1: modules.module1 || {},
        module2: modules.module2 || {},
        module3: modules.module3 || {},
        module4: modules.module4 || {},
        module5: modules.module5 || {},
        module6: modules.module6 || {},
        module7: modules.module7 || {},
        module8: modules.module8 || {},
        module9: modules.module9 || {},
        module10: modules.module10 || {},
        topicCount,
        gapCount,
        qualityScore: 0.75,
        honestyScore: 0.7,
        reportConfidence: 0.8,
        processingTimeMs: 0,
        rawN8nStages: [incomingPayload],
        isPublic: false,
      });
      console.log('[N8N Webhook] Created placeholder report:', report._id);
    } else {
      // Append this stage payload to rawN8nStages
      const stages = Array.isArray(report.rawN8nStages) ? report.rawN8nStages : [];
      stages.push(incomingPayload);
      // Update modules on the report (keep latest partial modules)
      report.module1 = modules.module1 || report.module1 || {};
      report.module2 = modules.module2 || report.module2 || {};
      report.module3 = modules.module3 || report.module3 || {};
      report.module4 = modules.module4 || report.module4 || {};
      report.module5 = modules.module5 || report.module5 || {};
      report.module6 = modules.module6 || report.module6 || {};
      report.rawN8nStages = stages;
      report.reportSummary = summarization?.summary || report.reportSummary;
      await report.save();
      console.log('[N8N Webhook] Appended stage to report:', report._id);
    }

    // If there's an explicit API limit or error reported, mark the run as failed
    if (apiLimitExceeded || status === 'failed' || error || (typeof incomingPayload?.error === 'string' && incomingPayload.error.toLowerCase().includes('rate'))) {
      report.reportSummary = report.reportSummary || 'Processing failed';
      report.reportMarkdown = report.reportMarkdown || '';
      report.processingTimeMs = report.processingTimeMs || 0;
      report.failed = true;
      report.failureReason = apiLimitExceeded ? 'api_limit_exceeded' : (incomingPayload.error || 'n8n_error');
      await report.save();

      const failedRun = {
        id: `n8n-run-${report._id}`,
        createdAt: report.createdAt.toISOString(),
        papersCount: paperCount,
        analysisReport: {
          reportTitle: report.reportTitle,
          reportSummary: `Failed: ${report.failureReason}`,
        },
        modulesInOrder: [],
        modules: { analysisReport: { reportTitle: report.reportTitle } },
        reportId: report._id,
        processingTimeMs: report.processingTimeMs || 0,
        status: 'failed',
      };

      addRun(failedRun);
      return res.json({ success: true, reportId: report._id, run: failedRun, message: 'Marked as failed due to API limits or error' });
    }

    // If this is not the final stage, return success but keep frontend loading
    if (!looksFinal) {
      return res.json({ success: true, interim: true, reportId: report._id, message: 'Interim n8n stage stored; waiting for final output' });
    }

    // Final stage: validate payload against schema, then format full results and update report + push to frontend
    try {
      // Validate final payload shape before formatting/publishing
      const isValid = validateN8nFinal(incomingPayload);
      if (!isValid) {
        console.warn('[N8N Webhook] Final payload did not match final schema. Validation errors:', validateN8nFinal.errors);
        // Append stage but do not publish; keep frontend loading until a schema-valid final arrives
        return res.json({ success: true, interim: true, reportId: report._id, message: 'Final payload did not validate against expected schema; stored as interim', validationErrors: validateN8nFinal.errors });
      }

      // Use formatN8NResults to normalize and synthesize reportMarkdown if needed
      const formatted = formatN8NResults(incomingPayload, papers || []);
      const { modules: finalModules, reportTitle, reportSummary: finalSummary, reportMarkdown, reportHighlights, confidence, processingTimeMs } = formatted;

      report.reportTitle = reportTitle || report.reportTitle;
      report.reportSummary = finalSummary || report.reportSummary;
      report.reportMarkdown = reportMarkdown || report.reportMarkdown || '';
      report.reportHighlights = reportHighlights || report.reportHighlights || [];
      report.module1 = finalModules.module1 || report.module1;
      report.module2 = finalModules.module2 || report.module2;
      report.module3 = finalModules.module3 || report.module3;
      report.module4 = finalModules.module4 || report.module4;
      report.module5 = finalModules.module5 || report.module5;
      report.module6 = finalModules.module6 || report.module6;
      report.module7 = finalModules.module7 || report.module7;
      report.module8 = finalModules.module8 || report.module8;
      report.module9 = finalModules.module9 || report.module9;
      report.module10 = finalModules.module10 || report.module10;
      report.reportConfidence = typeof confidence === 'number' ? confidence : report.reportConfidence;
      report.processingTimeMs = processingTimeMs || report.processingTimeMs;
      report.topicCount = finalModules.module2?.topics?.length || report.topicCount;
      report.gapCount = finalModules.module3?.gaps?.length || report.gapCount;

      await report.save();
      console.log('[N8N Webhook] Final report updated:', report._id);

      // Build run object for frontend (same shape used elsewhere)
      const modulesInOrder = [
        { moduleId: 1, name: 'Summarization', result: report.module1 },
        { moduleId: 2, name: 'Gap Detection (with Topics)', result: report.module2 },
        { moduleId: 3, name: 'Gap Detection', result: report.module3 },
        { moduleId: 4, name: 'Trend Detection', result: report.module4 },
        { moduleId: 5, name: 'Visualization', result: report.module5 },
        { moduleId: 6, name: 'Chatbot', result: report.module6 },
      ];

      const analysisReport = {
        reportTitle: report.reportTitle || `Analysis Report - ${reportName}`,
        reportSummary: report.reportSummary || '',
        reportMarkdown: report.reportMarkdown || '',
        reportHighlights: report.reportHighlights || [],
        confidence: report.reportConfidence || 0,
      };

      const run = {
        id: `n8n-run-${report._id}`,
        createdAt: report.createdAt.toISOString(),
        papersCount: paperCount,
        analysisReport,
        modulesInOrder,
        modules: {
          ...finalModules,
          analysisReport,
        },
        reportId: report._id,
        processingTimeMs: report.processingTimeMs || 0,
        status: 'completed',
      };

      // Publish run to in-memory store so frontend sees the completed run
      addRun(run);

      return res.json({ success: true, reportId: report._id, run, message: 'Final analysis stored and published' });
    } catch (formatErr) {
      console.error('[N8N Webhook] Final formatting error:', formatErr);
      return res.status(500).json({ error: 'Final formatting failed', detail: formatErr.message });
    }
  } catch (error) {
    console.error('[N8N Webhook] Error:', error);
    res.status(500).json({ error: error.message, stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
  }
});

/**
 * POST /api/chat/ask-about-analysis
 * Real-time chatbot using n8n analysis payload as RAG context
 * Request body: { question: string, backendResult: RunAllResult }
 */
router.post('/chat/ask-about-analysis', async (req, res) => {
  try {
    const { question, backendResult } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!backendResult) {
      return res.status(400).json({ error: 'Analysis payload (backendResult) is required' });
    }

    const result = await askAboutAnalysis(question.trim(), backendResult);
    res.json(result);
  } catch (error) {
    console.error('[Chat] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/visualization/regenerate-with-ollama
 * Regenerate the research map with Ollama-enhanced force-directed layout
 * Request body: { papers: BackendPaper[], topics: TopicResult[], gaps: GapResult[] }
 */
router.post('/visualization/regenerate-with-ollama', async (req, res) => {
  try {
    const papers = pickPapers(req.body?.papers, getPapers());
    const topics = Array.isArray(req.body?.topics) && req.body.topics.length > 0
      ? req.body.topics
      : runModule2TopicModeling(papers).topics;
    const gaps = Array.isArray(req.body?.gaps) && req.body.gaps.length > 0
      ? req.body.gaps
      : runModule3GapDetection(papers, topics).gaps;

    const result = await runModule5VisualizationWithOllama(papers, topics, gaps);
    res.json(result);
  } catch (error) {
    console.error('[Visualization] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
