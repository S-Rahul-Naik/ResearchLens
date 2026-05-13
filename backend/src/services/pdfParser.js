const { PDFParse } = require('pdf-parse');
const { extractKeywords } = require('../utils/text');

/**
 * Extract structured fields from raw PDF text.
 * Heuristics: first non-empty line = title, look for "abstract" keyword,
 * extract 4-digit year, collect author-like lines after title.
 */
function extractFields(text, filename, metadataYear) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const ignoredTitlePatterns = [
    /^arxiv:/i,
    /^published as /i,
    /^published in /i,
    /^ieee transactions/i,
  ];

  const titleIndex = lines.findIndex(
    (line) =>
      line.length > 10 &&
      !/^\d+$/.test(line) &&
      !ignoredTitlePatterns.some((pattern) => pattern.test(line))
  );

  let title = titleIndex >= 0 ? lines[titleIndex] : filename.replace(/\.pdf$/i, '');
  const nextLine = titleIndex >= 0 ? lines[titleIndex + 1] : '';
  if (
    nextLine &&
    nextLine.length > 3 &&
    nextLine.length < 80 &&
    nextLine.split(/\s+/).length <= 4 &&
    /^[A-Z]/.test(nextLine) &&
    !/[\d*†‡]/.test(nextLine) &&
    !/[,:;@]/.test(nextLine) &&
    !/(abstract|introduction|keywords)/i.test(nextLine)
  ) {
    title = `${title} ${nextLine}`;
  }

  // Year: prefer explicit years in the text body (2010+), then infer from arXiv filename.
  const yearMatch = text.match(/\b(201\d|202[0-6])\b/);
  let year = metadataYear || (yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear());
  if (!metadataYear && !yearMatch) {
    const fileYearMatch = filename.match(/^(\d{2})(\d{2})\.\d+/);
    if (fileYearMatch) {
      year = 2000 + parseInt(fileYearMatch[1], 10);
    }
  }

  // Abstract: text between "abstract" and "introduction" / "keywords"
  const lower = text.toLowerCase();
  const absStart = lower.indexOf('abstract');
  const absEnd = Math.min(
    ...[
      lower.indexOf('introduction', absStart + 20),
      lower.indexOf('keywords', absStart + 20),
      lower.indexOf('1.', absStart + 20),
    ].filter((i) => i > absStart)
  );
  let abstract = '';
  if (absStart !== -1 && absEnd > absStart) {
    abstract = text
      .slice(absStart + 8, absEnd)
      .replace(/\n+/g, ' ')
      .trim();
  }
  if (!abstract) {
    // fallback: first 800 chars after title (skip immediately following lines which often are metadata)
    const titleIdx = text.indexOf(title);
    const afterTitle = text.slice(titleIdx + title.length, titleIdx + title.length + 1200).replace(/\n+/g, ' ').trim();
    // Only use if it contains actual words (not just numbers, symbols, or "parsing" artifacts)
    if (afterTitle && /[a-z]{4,}/.test(afterTitle) && afterTitle.length > 50 && !/^[0-9\W]*$/.test(afterTitle)) {
      abstract = afterTitle.slice(0, 800);
    } else {
      abstract = '';
    }
  }

  // Authors: lines between title and abstract that look like names
  // (Capitalize Word patterns, contain comma or "and", shorter than 120 chars)
  const authorCandidates = lines
    .slice(Math.max(titleIndex + 1, 1), Math.max(titleIndex + 8, 8))
    .filter(
      (l) =>
        l.length < 120 &&
        /^[A-Z]/.test(l) &&
        /[A-Z][a-z]+/.test(l) &&
        !l.toLowerCase().startsWith('abstract') &&
        !l.match(/^\d/) &&
        !l.match(/university|institute|department|email|@/i)
    );
  const authors = authorCandidates.length
    ? authorCandidates[0]
        .split(/,|;| and /i)
        .map((a) => a.trim())
        .filter((a) => a.length > 2)
        .slice(0, 6)
    : ['Unknown'];

  return { title, authors, year, abstract };
}

/**
 * Extract structured sections from paper text.
 * Identifies introduction, methodology, results, and conclusion sections.
 */
function extractSections(text) {
  const lower = text.toLowerCase();
  const sections = {
    introduction: '',
    methodology: '',
    results: '',
    conclusion: '',
    references: [],
  };

  // Heuristic markers for section starts
  const introMarkers = [
    lower.indexOf('introduction'),
    lower.indexOf('1. introduction'),
    lower.indexOf('1 introduction'),
  ];
  const introStart = Math.max(...introMarkers.filter(i => i !== -1));

  const methodMarkers = [
    lower.indexOf('methodology'),
    lower.indexOf('methods'),
    lower.indexOf('2. method'),
    lower.indexOf('2 method'),
    lower.indexOf('approach'),
  ];
  const methodStart = Math.max(...methodMarkers.filter(i => i !== -1));

  const resultMarkers = [
    lower.indexOf('results'),
    lower.indexOf('experiments'),
    lower.indexOf('3. result'),
    lower.indexOf('3 result'),
  ];
  const resultStart = Math.max(...resultMarkers.filter(i => i !== -1));

  const conclusionMarkers = [
    lower.indexOf('conclusion'),
    lower.indexOf('discussion'),
    lower.indexOf('4. conclusion'),
    lower.indexOf('4 conclusion'),
  ];
  const conclusionStart = Math.max(...conclusionMarkers.filter(i => i !== -1));

  const refMarkers = [
    lower.indexOf('references'),
    lower.indexOf('bibliography'),
  ];
  const refStart = Math.max(...refMarkers.filter(i => i !== -1));

  // Extract introduction (from start to methodology or end if none found)
  if (introStart !== -1) {
    const introEnd = methodStart !== -1 ? methodStart : resultStart !== -1 ? resultStart : conclusionStart !== -1 ? conclusionStart : refStart !== -1 ? refStart : text.length;
    sections.introduction = text.slice(introStart, introEnd).trim().slice(0, 3000);
  }

  // Extract methodology
  if (methodStart !== -1) {
    const methodEnd = resultStart !== -1 ? resultStart : conclusionStart !== -1 ? conclusionStart : refStart !== -1 ? refStart : text.length;
    sections.methodology = text.slice(methodStart, methodEnd).trim().slice(0, 3000);
  }

  // Extract results
  if (resultStart !== -1) {
    const resultEnd = conclusionStart !== -1 ? conclusionStart : refStart !== -1 ? refStart : text.length;
    sections.results = text.slice(resultStart, resultEnd).trim().slice(0, 3000);
  }

  // Extract conclusion
  if (conclusionStart !== -1) {
    const conclusionEnd = refStart !== -1 ? refStart : text.length;
    sections.conclusion = text.slice(conclusionStart, conclusionEnd).trim().slice(0, 2000);
  }

  // Extract references (simple heuristic)
  if (refStart !== -1) {
    const refText = text.slice(refStart).split('\n').slice(1, 20).join('\n');
    sections.references = refText
      .split('\n')
      .filter(line => line.trim().length > 10)
      .slice(0, 15);
  }

  return sections;
}

/**
 * Parse a PDF buffer and return structured paper fields.
 * @param {Buffer} buffer
 * @param {string} filename
 */
async function parsePdf(buffer, filename) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const info = await parser.getInfo().catch(() => null);
  const data = await parser.getText();
  const metadataYear = info?.getDateNode?.().CreationDate?.getUTCFullYear?.() ?? null;
  const { title, authors, year, abstract } = extractFields(data.text, filename, metadataYear);
  const keywordSource = `${abstract} ${data.text.slice(0, 6000)}`;
  const keywords = extractKeywords(keywordSource, 12);
  const fullText = extractSections(data.text);
  await parser.destroy();
  return {
    title,
    authors,
    year,
    abstract,
    content: data.text,
    keywords,
    fullText,
  };
}

module.exports = { parsePdf };
