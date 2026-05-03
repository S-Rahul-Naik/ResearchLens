const { splitSentences } = require('../utils/text');

const DATASET_PATTERNS = [
  /\bImageNet\b/gi,
  /\bCOCO\b/gi,
  /\bSQuAD\b/gi,
  /\bGLUE\b/gi,
  /\bCIFAR-?10\b/gi,
  /\bCIFAR-?100\b/gi,
  /\bMNIST\b/gi
];

const METHOD_PATTERNS = [
  /\bBERT\b/gi,
  /\bGPT-?\d*\b/gi,
  /\bTransformer\b/gi,
  /\bResNet\b/gi,
  /\bViT\b/gi,
  /\bLSTM\b/gi,
  /\bCNN\b/gi,
  /\bRNN\b/gi,
  /\bRandom Forest\b/gi
];

function matchEntities(text, patterns) {
  const found = new Set();
  patterns.forEach((pattern) => {
    const matches = text.match(pattern) || [];
    matches.forEach((item) => found.add(item));
  });
  return [...found];
}

function findEvidenceSentences(text, entity) {
  return splitSentences(text)
    .filter((sentence) => sentence.toLowerCase().includes(entity.toLowerCase()))
    .slice(0, 2);
}

function runModule8DatasetMethodMatrix(papers) {
  const rows = papers.map((paper) => {
    const text = `${paper.abstract} ${paper.content}`;
    const datasets = matchEntities(text, DATASET_PATTERNS);
    const methods = matchEntities(text, METHOD_PATTERNS);

    return {
      paperId: paper.id,
      title: paper.title,
      datasets,
      methods,
      evidence: {
        datasets: datasets.map((dataset) => ({
          name: dataset,
          sentences: findEvidenceSentences(text, dataset)
        })),
        methods: methods.map((method) => ({
          name: method,
          sentences: findEvidenceSentences(text, method)
        }))
      }
    };
  });

  const allDatasets = [...new Set(rows.flatMap((row) => row.datasets))];
  const allMethods = [...new Set(rows.flatMap((row) => row.methods))];

  const matrix = rows.map((row) => {
    const datasetFlags = Object.fromEntries(allDatasets.map((dataset) => [dataset, row.datasets.includes(dataset)]));
    const methodFlags = Object.fromEntries(allMethods.map((method) => [method, row.methods.includes(method)]));
    return {
      paperId: row.paperId,
      title: row.title,
      datasets: datasetFlags,
      methods: methodFlags
    };
  });

  return {
    module: 'M8 Dataset / Method Tracking Matrix',
    datasets: allDatasets,
    methods: allMethods,
    rows,
    matrix
  };
}

module.exports = {
  runModule8DatasetMethodMatrix
};
