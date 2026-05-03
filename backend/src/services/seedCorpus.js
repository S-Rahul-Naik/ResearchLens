const fs = require('fs');
const path = require('path');
const { parsePdf } = require('./pdfParser');
const { ensurePaperShape } = require('../utils/pipeline');
const { setPapers } = require('../store/corpusStore');

const TOPIC_DIRS = [
  'Federated Learning',
  'Large Language Models',
  'Computer Vision  Medical Imaging',
  'Knowledge Graphs',
];

async function preloadLocalPdfCorpus() {
  const corpusRoot = path.resolve(__dirname, '..', '..', '..', '20 real papers');

  if (!fs.existsSync(corpusRoot)) {
    return { count: 0, loaded: false, reason: 'missing-folder' };
  }

  const papers = [];

  for (const topicDir of TOPIC_DIRS) {
    const fullDir = path.join(corpusRoot, topicDir);
    if (!fs.existsSync(fullDir)) {
      continue;
    }

    const files = fs
      .readdirSync(fullDir)
      .filter((name) => name.toLowerCase().endsWith('.pdf'))
      .sort();

    for (const file of files) {
      const buffer = fs.readFileSync(path.join(fullDir, file));
      const parsed = await parsePdf(buffer, file);
      papers.push({
        id: `p${String(papers.length + 1).padStart(3, '0')}`,
        title: parsed.title,
        authors: parsed.authors,
        year: parsed.year,
        abstract: parsed.abstract,
        content: parsed.content,
      });
    }
  }

  const normalized = ensurePaperShape(papers);
  setPapers(normalized);

  return { count: normalized.length, loaded: normalized.length > 0, reason: null };
}

module.exports = { preloadLocalPdfCorpus };