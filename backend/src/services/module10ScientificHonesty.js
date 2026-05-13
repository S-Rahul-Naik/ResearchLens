function mean(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function runModule10ScientificHonesty(papers, topics, gaps, trends, map) {
  const paperCount = Array.isArray(papers) ? papers.length : 0;
  const topicCount = Array.isArray(topics) ? topics.length : 0;
  const gapCount = Array.isArray(gaps) ? gaps.length : 0;
  const trendCount = Array.isArray(trends) ? trends.length : 0;

  const topicConfidence = mean((topics || []).map((topic) => Number.isFinite(topic.coherence) ? topic.coherence : 0));
  const topicLabelConfidence = mean((topics || []).map((topic) => Number.isFinite(topic.labelConfidence) ? topic.labelConfidence : topic.coherence ?? 0));
  const gapReliability = mean((gaps || []).map((gap) => Number.isFinite(gap.reliability) ? gap.reliability : Number.isFinite(gap.confidence) ? gap.confidence : 0.5));
  const trendReliability = mean((trends || []).map((trend) => Number.isFinite(trend.reliability) ? trend.reliability : Number.isFinite(trend.temporalConfidence) ? trend.temporalConfidence : 0.5));
  const mapSupport = Array.isArray(map?.links) && map.links.length > 0
    ? mean(map.links.map((link) => Number.isFinite(link.gapScore) ? link.gapScore : 0.5))
    : 0.5;

  const assignedPaperCount = topics && topics.length > 0
    ? topics.reduce((sum, topic) => sum + (Array.isArray(topic.paperIds) ? topic.paperIds.length : 0), 0)
    : 0;
  const coverage = paperCount > 0 ? clamp01(assignedPaperCount / paperCount) : 0;
  const gapEvidenceCoverage = gapCount > 0
    ? clamp01((gaps || []).filter((gap) => Array.isArray(gap.evidenceSnippets) && gap.evidenceSnippets.length > 0).length / gapCount)
    : 0;
  const citationAvailability = gapCount > 0
    ? clamp01((gaps || []).filter((gap) => gap.citationAvailable !== false).length / gapCount)
    : 0;
  const insufficientTrendCount = (trends || []).filter((trend) => trend.insufficientData || trend.trend === 'insufficient_data').length;
  const trendSufficiency = trendCount > 0 ? clamp01(1 - insufficientTrendCount / trendCount) : 0;

  const honestyScore = clamp01(
    (topicConfidence * 0.20) +
    (topicLabelConfidence * 0.10) +
    (gapReliability * 0.20) +
    (trendReliability * 0.20) +
    (coverage * 0.10) +
    (gapEvidenceCoverage * 0.10) +
    (citationAvailability * 0.05) +
    (trendSufficiency * 0.05) +
    (mapSupport * 0.05)
  );

  const caveats = [];
  if (insufficientTrendCount > 0) {
    caveats.push(`${insufficientTrendCount} trend${insufficientTrendCount === 1 ? '' : 's'} were marked insufficient_data.`);
  }
  if (gapCount > 0 && gapEvidenceCoverage < 1) {
    caveats.push('Some gaps lack explicit evidence snippets, so explanation grounding is partial.');
  }
  if (coverage < 0.8) {
    caveats.push('Topic coverage is incomplete, so downstream scores are conservative.');
  }

  return {
    module: 'M10 Scientific Honesty',
    honestyScore: Number(honestyScore.toFixed(3)),
    reliability: Number(clamp01((gapReliability + trendReliability + topicConfidence) / 3).toFixed(3)),
    scoreBreakdown: {
      topicConfidence: Number(topicConfidence.toFixed(3)),
      topicLabelConfidence: Number(topicLabelConfidence.toFixed(3)),
      gapReliability: Number(gapReliability.toFixed(3)),
      trendReliability: Number(trendReliability.toFixed(3)),
      coverage: Number(coverage.toFixed(3)),
      gapEvidenceCoverage: Number(gapEvidenceCoverage.toFixed(3)),
      citationAvailability: Number(citationAvailability.toFixed(3)),
      trendSufficiency: Number(trendSufficiency.toFixed(3)),
      mapSupport: Number(mapSupport.toFixed(3)),
    },
    caveats,
    warningCount: caveats.length,
    inspected: {
      paperCount,
      topicCount,
      gapCount,
      trendCount,
      insufficientTrendCount,
    },
    summary: honestyScore >= 0.75
      ? 'Outputs are well supported by the available corpus evidence.'
      : honestyScore >= 0.5
        ? 'Outputs are usable, but several confidence limitations should be surfaced to the user.'
        : 'Outputs are exploratory and should be treated as low-confidence summaries.',
  };
}

module.exports = {
  runModule10ScientificHonesty,
};