const { toFixedNumber } = require('../utils/text');
const {
  assessTrendEvolution,
  detectParadigmShifts,
  summarizeTrendReliability,
} = require('./ollamaBridge');

const MIN_PAPERS_FOR_TREND = 6;
const MIN_UNIQUE_YEARS = 4;
const MIN_PAPERS_PER_YEAR = 0.8;
const MOVING_AVG_WINDOW = 3;

function linearSlope(points) {
  const n = points.length;
  if (n < 2) return 0;

  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);

  const denominator = n * sumXX - sumX * sumX;
  if (!denominator) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

function mean(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(values, windowSize = 3) {
  return values.map((_, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(values.length, start + windowSize);
    const slice = values.slice(start, end);
    return mean(slice);
  });
}

function normalizeCounts(counts) {
  const max = Math.max(...counts, 1);
  return counts.map((count) => Number((count / max).toFixed(3)));
}

function buildYearSeries(topicPapers, yearStart, yearEnd) {
  const yearMap = new Map();
  for (let year = yearStart; year <= yearEnd; year += 1) {
    yearMap.set(year, 0);
  }

  topicPapers.forEach((paper) => {
    const year = Number(paper.year);
    if (!Number.isFinite(year)) return;
    yearMap.set(year, (yearMap.get(year) || 0) + 1);
  });

  return [...yearMap.entries()].sort((a, b) => a[0] - b[0]).map(([year, count]) => ({ year, count }));
}

function safeTrendLabel(slope, confidence, insufficientData) {
  if (insufficientData) return 'insufficient_data';
  if (confidence < 0.45) return 'insufficient_data';
  if (slope > 0.12) return 'rising';
  if (slope < -0.10) return 'declining';
  return 'stable';
}

function buildTrendMessage({ insufficientData, topicName, paperCount, uniqueYears, dataDensity }) {
  if (insufficientData) {
    return `Insufficient temporal data for reliable trend analysis for ${topicName}. The topic has ${paperCount} paper${paperCount === 1 ? '' : 's'} across ${uniqueYears} year${uniqueYears === 1 ? '' : 's'} with density ${dataDensity.toFixed(2)} papers/year.`;
  }
  return '';
}

function runModule4TrendDetection(papers, topics) {
  const allYears = papers.map((paper) => Number(paper.year)).filter((year) => Number.isFinite(year));
  const corpusYearStart = allYears.length ? Math.min(...allYears) : new Date().getFullYear();
  const corpusYearEnd = allYears.length ? Math.max(...allYears) : new Date().getFullYear();
  const corpusYearSpan = Math.max(1, corpusYearEnd - corpusYearStart + 1);

  const trends = topics.map((topic) => {
    const topicPapers = papers.filter((paper) => topic.paperIds.includes(paper.id));
    const uniqueYears = [...new Set(topicPapers.map((paper) => Number(paper.year)).filter((year) => Number.isFinite(year)))].sort((a, b) => a - b);
    const paperCount = topicPapers.length;
    const yearCount = uniqueYears.length;
    const dataDensity = paperCount / corpusYearSpan;
    const insufficientData = paperCount < MIN_PAPERS_FOR_TREND || yearCount < MIN_UNIQUE_YEARS || dataDensity < MIN_PAPERS_PER_YEAR;

    const yearlyCounts = buildYearSeries(topicPapers, corpusYearStart, corpusYearEnd);
    const counts = yearlyCounts.map((item) => item.count);
    const smoothedCounts = movingAverage(counts, MOVING_AVG_WINDOW);
    const normalizedCounts = normalizeCounts(counts);
    const yearOverYearChanges = yearlyCounts.map((item, index) => {
      if (index === 0) {
        return { year: item.year, change: 0 };
      }
      const previous = yearlyCounts[index - 1].count;
      const change = previous > 0 ? (item.count - previous) / previous : item.count > 0 ? 1 : 0;
      return { year: item.year, change: toFixedNumber(change, 3) };
    });

    const slope = linearSlope(yearlyCounts.map((item, index) => ({ x: index, y: smoothedCounts[index] })));
    const slopeMagnitude = Math.abs(slope);
    const coverageScore = Math.min(1, yearCount / MIN_UNIQUE_YEARS);
    const densityScore = Math.min(1, dataDensity / MIN_PAPERS_PER_YEAR);
    const variance = mean(smoothedCounts.map((value) => (value - mean(smoothedCounts)) ** 2));
    const stabilityScore = 1 - Math.min(1, variance / 2);
    const temporalConfidence = Number(Math.max(0, Math.min(1, (coverageScore * 0.35) + (densityScore * 0.35) + (stabilityScore * 0.30) - (insufficientData ? 0.35 : 0))).toFixed(3));

    const trend = safeTrendLabel(slope, temporalConfidence, insufficientData);
    const message = buildTrendMessage({ insufficientData, topicName: topic.name, paperCount, uniqueYears: yearCount, dataDensity });
    const reliability = Number(Math.max(0, Math.min(1, temporalConfidence * (insufficientData ? 0.4 : 1))).toFixed(3));
    const confidenceInterval = [
      Number(Math.max(-1, slope - (1 - reliability) * 0.15).toFixed(3)),
      Number(Math.min(1, slope + (1 - reliability) * 0.15).toFixed(3))
    ];

    return {
      topicId: topic.topicId,
      topicName: topic.name,
      yearlyCounts,
      movingAverage: yearlyCounts.map((item, index) => ({ year: item.year, count: toFixedNumber(smoothedCounts[index], 3) })),
      normalizedCounts: yearlyCounts.map((item, index) => ({ year: item.year, value: normalizedCounts[index] })),
      yearOverYearChanges,
      slope: toFixedNumber(slope, 3),
      trend,
      insufficientData,
      trendMessage: message,
      paperCount,
      uniqueYears: yearCount,
      dataDensity: toFixedNumber(dataDensity, 3),
      temporalConfidence,
      reliability,
      confidenceInterval,
      temporalEmbedding: normalizedCounts,
      yearlyCoverage: Number((yearCount / corpusYearSpan).toFixed(3))
    };
  });

  return {
    module: 'M4 Trend Detection',
    trends
  };
}

function getTopicPapers(papers, topic) {
  return papers.filter((paper) => topic.paperIds.includes(paper.id));
}

async function enrichTrendWithLLMInterpretation(trend, topicPapers, yearRange) {
  const topicLabel = trend.topicName;

  const [evolution, shifts, reliability] = await Promise.all([
    assessTrendEvolution(topicLabel, topicPapers, yearRange),
    detectParadigmShifts(topicLabel, topicPapers, yearRange),
    summarizeTrendReliability(topicLabel, topicPapers.length, yearRange.end - yearRange.start + 1, trend.dataDensity ?? 0),
  ]);

  return {
    ...trend,
    llm_trend_summary: evolution.llm_trend_summary || '',
    llm_paradigm_shifts: evolution.llm_paradigm_shifts || shifts.llm_paradigm_shifts || [],
    llm_reliability_explanation: shifts.llm_reliability_explanation || reliability.llm_reliability_explanation || '',
    llm_confidence: Math.max(
      typeof evolution.llm_confidence === 'number' ? evolution.llm_confidence : 0,
      typeof shifts.llm_confidence === 'number' ? shifts.llm_confidence : 0,
      typeof reliability.llm_confidence === 'number' ? reliability.llm_confidence : 0,
    ),
  };
}

async function runModule4TrendDetectionWithLLM(papers, topics) {
  const base = runModule4TrendDetection(papers, topics);
  const allYears = papers.map((paper) => Number(paper.year)).filter((year) => Number.isFinite(year));
  const corpusYearStart = allYears.length ? Math.min(...allYears) : new Date().getFullYear();
  const corpusYearEnd = allYears.length ? Math.max(...allYears) : new Date().getFullYear();
  const yearRange = { start: corpusYearStart, end: corpusYearEnd };

  const trends = [];
  const batchSize = 3;
  for (let index = 0; index < base.trends.length; index += batchSize) {
    const batch = base.trends.slice(index, index + batchSize);
    const batchResults = await Promise.all(batch.map(async (trend) => {
      const topic = topics.find((item) => item.topicId === trend.topicId);
      if (!topic) return trend;

      const topicPapers = getTopicPapers(papers, topic);
      try {
        return await enrichTrendWithLLMInterpretation(trend, topicPapers, yearRange);
      } catch (err) {
        console.warn(`Trend LLM enrichment failed for ${trend.topicId}:`, err.message);
        return { ...trend, llm_confidence: 0, llm_trend_summary: '', llm_paradigm_shifts: [], llm_reliability_explanation: '' };
      }
    }));
    trends.push(...batchResults);
  }

  return {
    ...base,
    trends,
  };
}

module.exports = {
  runModule4TrendDetection,
  runModule4TrendDetectionWithLLM,
  enrichTrendWithLLMInterpretation,
};
