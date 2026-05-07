const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const { setPapers, getPapers, addRun, getRuns } = require('../store/corpusStore');
const { pickPapers, ensurePaperShape } = require('../utils/pipeline');
const { runModule1Summarization } = require('../services/module1Summarization');
const { runModule2TopicModeling } = require('../services/module2TopicModeling');
const { runModule3GapDetection } = require('../services/module3GapDetection');
const { runModule4TrendDetection } = require('../services/module4TrendDetection');
const { runModule5Visualization } = require('../services/module5Visualization');
const { runModule6Chatbot } = require('../services/module6Chatbot');
const { runModule7ContradictionDetection } = require('../services/module7ContradictionDetection');
const { runModule8DatasetMethodMatrix } = require('../services/module8DatasetMethodMatrix');
const { runModule9RelatedWorkDraft } = require('../services/module9RelatedWorkDraft');
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
        ...fields,
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

router.post('/modules/4-trend-detection', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const topicsPayload = req.body?.topics || runModule2TopicModeling(papers).topics;
  const result = runModule4TrendDetection(papers, topicsPayload);
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
    const m2 = runModule2TopicModeling(papers);
    const m3 = runModule3GapDetection(papers, m2.topics);
    const m4 = runModule4TrendDetection(papers, m2.topics);
    const m5 = runModule5Visualization(papers, m2.topics, m3.gaps);
    const m6 = await runModule6Chatbot(papers, question, m2.topics, m3.gaps, m4.trends);
    const m7 = runModule7ContradictionDetection(papers, m2.topics);
    const m8 = runModule8DatasetMethodMatrix(papers);
    const m9 = runModule9RelatedWorkDraft(papers, m2.topics);
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
      { moduleId: 9, name: 'Related Work Auto-Draft', result: m9 }
    ];

    const run = {
      id: `run-${Date.now()}`,
      createdAt: new Date().toISOString(),
      papersCount: papers.length,
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
        module9: m9
      }
    };

    // Save analysis report to database
    const yearRange = papers.length > 0
      ? { start: Math.min(...papers.map(p => p.year || new Date().getFullYear())), end: Math.max(...papers.map(p => p.year || new Date().getFullYear())) }
      : { start: new Date().getFullYear(), end: new Date().getFullYear() };

    const qualityScore = m2.topics && m2.topics.length > 0
      ? m2.topics.reduce((sum, t) => sum + (t.coherence || 0), 0) / m2.topics.length
      : 0;

    const report = await AnalysisReport.create({
      userId,
      name: reportName,
      paperIds: papers.map(p => p.id),
      paperCount: papers.length,
      yearRange,
      module1: m1,
      module2: m2,
      module3: m3,
      module4: m4,
      module5: m5,
      module6: m6,
      module7: m7,
      module8: m8,
      module9: m9,
      topicCount: m2.topics ? m2.topics.length : 0,
      gapCount: m3.gaps ? m3.gaps.length : 0,
      qualityScore,
      processingTimeMs,
    });

    addRun(run);
    res.json({ ...run, reportId: report._id });
  } catch (error) {
    console.error('Run-All Error:', error);
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

module.exports = router;
