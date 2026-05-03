const { toFixedNumber } = require('../utils/text');

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

function runModule4TrendDetection(papers, topics) {
  const trends = topics.map((topic) => {
    const topicPapers = papers.filter((paper) => topic.paperIds.includes(paper.id));
    const yearMap = new Map();

    topicPapers.forEach((paper) => {
      yearMap.set(paper.year, (yearMap.get(paper.year) || 0) + 1);
    });

    const yearlyCounts = [...yearMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count }));

    const slope = linearSlope(yearlyCounts.map((item) => ({ x: item.year, y: item.count })));
    const trend = slope > 0.08 ? 'rising' : slope < -0.08 ? 'declining' : 'stable';

    return {
      topicId: topic.topicId,
      topicName: topic.name,
      yearlyCounts,
      slope: toFixedNumber(slope),
      trend
    };
  });

  return {
    module: 'M4 Trend Detection',
    trends
  };
}

module.exports = {
  runModule4TrendDetection
};
