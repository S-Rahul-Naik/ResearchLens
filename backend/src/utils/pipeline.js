function ensurePaperShape(inputPapers = []) {
  return inputPapers.map((paper, index) => ({
    id: paper.id || `P${index + 1}`,
    title: paper.title || `Untitled Paper ${index + 1}`,
    authors: Array.isArray(paper.authors) ? paper.authors : [],
    year: Number(paper.year) || 2024,
    abstract: paper.abstract || '',
    content: paper.content || paper.abstract || ''
  }));
}

function pickPapers(reqPapers, fallbackPapers) {
  if (Array.isArray(reqPapers) && reqPapers.length) {
    return ensurePaperShape(reqPapers);
  }
  return ensurePaperShape(fallbackPapers || []);
}

module.exports = {
  ensurePaperShape,
  pickPapers
};
