export interface TrendDataPoint {
  year: number;
  count: number;
}

export interface TopicTrend {
  topicId: string;
  topicName: string;
  trend: 'rising' | 'stable' | 'declining';
  growthRate: number;
  peakYear: number;
  dataPoints: TrendDataPoint[];
  color: string;
}

export const mockTrends: TopicTrend[] = [
  {
    topicId: 't001',
    topicName: 'Federated Learning',
    trend: 'rising',
    growthRate: 0.45,
    peakYear: 2023,
    color: '#0d9488',
    dataPoints: [
      { year: 2019, count: 1 },
      { year: 2020, count: 2 },
      { year: 2021, count: 3 },
      { year: 2022, count: 5 },
      { year: 2023, count: 8 },
      { year: 2024, count: 11 },
    ],
  },
  {
    topicId: 't002',
    topicName: 'Large Language Models',
    trend: 'rising',
    growthRate: 0.72,
    peakYear: 2024,
    color: '#f59e0b',
    dataPoints: [
      { year: 2019, count: 1 },
      { year: 2020, count: 2 },
      { year: 2021, count: 3 },
      { year: 2022, count: 7 },
      { year: 2023, count: 14 },
      { year: 2024, count: 22 },
    ],
  },
  {
    topicId: 't003',
    topicName: 'Computer Vision',
    trend: 'stable',
    growthRate: 0.08,
    peakYear: 2022,
    color: '#8b5cf6',
    dataPoints: [
      { year: 2019, count: 5 },
      { year: 2020, count: 6 },
      { year: 2021, count: 7 },
      { year: 2022, count: 8 },
      { year: 2023, count: 8 },
      { year: 2024, count: 9 },
    ],
  },
  {
    topicId: 't004',
    topicName: 'Medical Imaging',
    trend: 'rising',
    growthRate: 0.31,
    peakYear: 2024,
    color: '#ec4899',
    dataPoints: [
      { year: 2019, count: 2 },
      { year: 2020, count: 3 },
      { year: 2021, count: 4 },
      { year: 2022, count: 5 },
      { year: 2023, count: 7 },
      { year: 2024, count: 9 },
    ],
  },
  {
    topicId: 't005',
    topicName: 'Knowledge Graphs',
    trend: 'stable',
    growthRate: 0.05,
    peakYear: 2021,
    color: '#10b981',
    dataPoints: [
      { year: 2019, count: 4 },
      { year: 2020, count: 5 },
      { year: 2021, count: 7 },
      { year: 2022, count: 6 },
      { year: 2023, count: 6 },
      { year: 2024, count: 7 },
    ],
  },
  {
    topicId: 't006',
    topicName: 'Robotics & Embodied AI',
    trend: 'rising',
    growthRate: 0.38,
    peakYear: 2023,
    color: '#06b6d4',
    dataPoints: [
      { year: 2019, count: 2 },
      { year: 2020, count: 2 },
      { year: 2021, count: 3 },
      { year: 2022, count: 5 },
      { year: 2023, count: 7 },
      { year: 2024, count: 9 },
    ],
  },
  {
    topicId: 't007',
    topicName: 'Reinforcement Learning',
    trend: 'stable',
    growthRate: 0.04,
    peakYear: 2021,
    color: '#f97316',
    dataPoints: [
      { year: 2019, count: 5 },
      { year: 2020, count: 5 },
      { year: 2021, count: 6 },
      { year: 2022, count: 6 },
      { year: 2023, count: 5 },
      { year: 2024, count: 6 },
    ],
  },
  {
    topicId: 't008',
    topicName: 'Clinical AI & Health',
    trend: 'rising',
    growthRate: 0.41,
    peakYear: 2024,
    color: '#e11d48',
    dataPoints: [
      { year: 2019, count: 1 },
      { year: 2020, count: 2 },
      { year: 2021, count: 3 },
      { year: 2022, count: 5 },
      { year: 2023, count: 7 },
      { year: 2024, count: 10 },
    ],
  },
];
