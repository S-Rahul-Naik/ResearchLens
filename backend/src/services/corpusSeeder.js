/**
 * corpusSeeder.js
 * On startup: check if the 20 base-corpus papers already exist in MongoDB.
 * If not, parse each PDF, upload to Cloudinary, save to MongoDB.
 * Always loads base corpus (+ nothing else at start) into the in-memory store.
 */

const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const cloudinary = require('./cloudinary');
const { parsePdf } = require('./pdfParser');
const Paper = require('../models/Paper');
const { setPapers, getPapers } = require('../store/corpusStore');

const PAPERS_DIR = path.join(__dirname, '../../../20 real papers');

function getAllPdfPaths() {
  const results = [];
  if (!fs.existsSync(PAPERS_DIR)) return results;
  const subdirs = fs.readdirSync(PAPERS_DIR);
  for (const sub of subdirs) {
    const subPath = path.join(PAPERS_DIR, sub);
    if (!fs.statSync(subPath).isDirectory()) continue;
    const files = fs.readdirSync(subPath);
    for (const file of files) {
      if (file.toLowerCase().endsWith('.pdf')) {
        results.push(path.join(subPath, file));
      }
    }
  }
  return results;
}

function uploadBufferToCloudinary(buffer, publicId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',
        public_id: publicId,
        folder: 'researchlens/base-corpus',
        overwrite: false,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

async function seedBaseCorpus() {
  // Check how many base-corpus papers already exist
  const existingCount = await Paper.countDocuments({ isBaseCorpus: true });

  const pdfPaths = getAllPdfPaths();

  if (existingCount >= pdfPaths.length && pdfPaths.length > 0) {
    console.log(`✅ Base corpus already seeded (${existingCount} papers). Loading from MongoDB...`);
    const dbPapers = await Paper.find({ isBaseCorpus: true }).lean();
    const papers = dbPapers.map(dbToStorePaper);
    setPapers(papers);
    console.log(`✅ Loaded ${papers.length} base papers into memory.`);
    return;
  }

  if (pdfPaths.length === 0) {
    console.warn('⚠️  No PDFs found in 20 real papers folder. Skipping base corpus seed.');
    return;
  }

  console.log(`📚 Seeding ${pdfPaths.length} base-corpus papers...`);

  for (const pdfPath of pdfPaths) {
    const filename = path.basename(pdfPath);
    const safeId = `base-${filename.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 60)}`;

    // Skip if already in DB
    const exists = await Paper.findOne({ paperId: safeId });
    if (exists) continue;

    try {
      const buffer = fs.readFileSync(pdfPath);
      const fields = await parsePdf(buffer, filename);

      // Upload to Cloudinary
      let cloudinaryUrl = '';
      let cloudinaryPublicId = '';
      try {
        const uploadResult = await uploadBufferToCloudinary(buffer, safeId);
        cloudinaryUrl = uploadResult.secure_url;
        cloudinaryPublicId = uploadResult.public_id;
      } catch (uploadErr) {
        console.warn(`  ⚠️  Cloudinary upload failed for ${filename}: ${uploadErr.message}`);
      }

      await Paper.create({
        paperId: safeId,
        ...fields,
        cloudinaryUrl,
        cloudinaryPublicId,
        isBaseCorpus: true,
        userId: null,
      });

      console.log(`  ✓ Seeded: ${fields.title || filename}`);
    } catch (err) {
      console.error(`  ✗ Failed to seed ${filename}: ${err.message}`);
    }
  }

  // Load all base papers into memory
  const dbPapers = await Paper.find({ isBaseCorpus: true }).lean();
  const papers = dbPapers.map(dbToStorePaper);
  setPapers(papers);
  console.log(`✅ Base corpus ready: ${papers.length} papers in memory.`);
}

function dbToStorePaper(doc) {
  return {
    id: doc.paperId,
    title: doc.title,
    authors: doc.authors,
    year: doc.year,
    abstract: doc.abstract,
    content: doc.content,
    keywords: doc.keywords,
    venue: doc.venue,
    doi: doc.doi,
    cloudinaryUrl: doc.cloudinaryUrl,
    isBaseCorpus: doc.isBaseCorpus,
    userId: doc.userId ? String(doc.userId) : null,
  };
}

module.exports = { seedBaseCorpus, dbToStorePaper };
