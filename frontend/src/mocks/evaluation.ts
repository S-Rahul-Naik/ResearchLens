export interface EvaluationMetrics {
  topicCoherence: number;
  topicCoverage: number;
  gapNovelty: number;
  modelQuality: number;
  totalPapers: number;
  totalTopics: number;
  totalGaps: number;
  avgPapersPerTopic: number;
  avgGapScore: number;
  highConfidenceGaps: number;
  processingTimeMs: number;
  yearRange: { start: number; end: number };
  topicSizeDistribution: { topicName: string; count: number }[];
  gapScoreDistribution: { range: string; count: number }[];
  coherenceByTopic: { topicName: string; score: number }[];
}

export const mockEvaluation: EvaluationMetrics = {
  topicCoherence: 0.79,
  topicCoverage: 0.84,
  gapNovelty: 0.91,
  modelQuality: 0.82,
  totalPapers: 20,
  totalTopics: 8,
  totalGaps: 7,
  avgPapersPerTopic: 3.6,
  avgGapScore: 0.51,
  highConfidenceGaps: 4,
  processingTimeMs: 3240,
  yearRange: { start: 2019, end: 2024 },
  topicSizeDistribution: [
    { topicName: 'LLMs', count: 6 },
    { topicName: 'Robotics', count: 5 },
    { topicName: 'Computer Vision', count: 5 },
    { topicName: 'Knowledge Graphs', count: 5 },
    { topicName: 'Federated Learning', count: 4 },
    { topicName: 'Clinical AI', count: 4 },
    { topicName: 'Reinforcement Learning', count: 3 },
    { topicName: 'Medical Imaging', count: 2 },
  ],
  gapScoreDistribution: [
    { range: '0.0–0.2', count: 0 },
    { range: '0.2–0.4', count: 2 },
    { range: '0.4–0.6', count: 2 },
    { range: '0.6–0.8', count: 1 },
    { range: '0.8–1.0', count: 2 },
  ],
  coherenceByTopic: [
    { topicName: 'Large Language Models', score: 0.88 },
    { topicName: 'Federated Learning', score: 0.82 },
    { topicName: 'Reinforcement Learning', score: 0.81 },
    { topicName: 'Computer Vision', score: 0.79 },
    { topicName: 'Knowledge Graphs', score: 0.77 },
    { topicName: 'Clinical AI & Health', score: 0.76 },
    { topicName: 'Medical Imaging', score: 0.74 },
    { topicName: 'Robotics & Embodied AI', score: 0.71 },
  ],
};
