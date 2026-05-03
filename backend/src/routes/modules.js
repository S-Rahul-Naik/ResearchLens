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
const { dbToStorePaper } = require('../services/corpusSeeder');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const { parsePdf } = require('../services/pdfParser');

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
    const parsed = await Promise.all(
      req.files.map(async (file) => {
        const fields = await parsePdf(file.buffer, file.originalname);
        const paperId = `pdf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        // Upload to Cloudinary
        let cloudinaryUrl = '';
        let cloudinaryPublicId = '';
        try {
          const uploadResult = await uploadBufferToCloudinary(file.buffer, paperId);
          cloudinaryUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
        } catch (uploadErr) {
          console.warn(`Cloudinary upload failed for ${file.originalname}: ${uploadErr.message}`);
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

        return { id: paperId, ...fields, cloudinaryUrl };
      })
    );

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

router.post('/modules/6-chatbot', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const question = req.body?.question || '';
  const result = runModule6Chatbot(papers, question);
  res.json(result);
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

router.post('/modules/run-all', (req, res) => {
  const papers = pickPapers(req.body?.papers, getPapers());
  const question = req.body?.question || 'What are the key findings and open research gaps?';

  const m1 = runModule1Summarization(papers);
  const m2 = runModule2TopicModeling(papers);
  const m3 = runModule3GapDetection(papers, m2.topics);
  const m4 = runModule4TrendDetection(papers, m2.topics);
  const m5 = runModule5Visualization(papers, m2.topics, m3.gaps);
  const m6 = runModule6Chatbot(papers, question);
  const m7 = runModule7ContradictionDetection(papers, m2.topics);
  const m8 = runModule8DatasetMethodMatrix(papers);
  const m9 = runModule9RelatedWorkDraft(papers, m2.topics);

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

  addRun(run);
  res.json(run);
});

module.exports = router;
