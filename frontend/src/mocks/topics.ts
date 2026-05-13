export interface Topic {
  id: string;
  name: string;
  keywords: string[];
  paperIds: string[];
  coherenceScore: number;
  trend: 'rising' | 'stable' | 'declining' | 'insufficient_data';
  centroid?: number[];
  color: string;
  // LLM-enhanced fields
  llm_label?: string;
  llm_domain_summary?: string;
  llm_methodological_theme?: string;
  llm_paradigm?: string;
  llm_confidence?: number;
  heuristic_label?: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  abstract?: string;
  year: number;
}

export interface TopicTrend {
  topicId: string;
  topicName: string;
  trend: 'rising' | 'stable' | 'declining' | 'insufficient_data';
  dataPoints: { year: number; count: number }[];
  growthRate?: number;
  peakYear?: number;
  color?: string;
  confidenceInterval?: [number, number];
  yearlyCoverage?: number;
  temporalConfidence?: number;
  reliability?: number;
  trendMessage?: string;
}

export const mockTopics: Topic[] = [
  {
    id: 't001',
    name: 'Federated Learning',
    keywords: ['federated learning', 'privacy', 'distributed training', 'aggregation', 'communication efficiency', 'non-IID', 'gradient sharing'],
    paperIds: ['p001', 'p002', 'p003', 'p004', 'p005'],
    coherenceScore: 0.82,
    trend: 'rising',
    color: '#0d9488',
  },
  {
    id: 't002',
    name: 'Large Language Models',
    keywords: ['LLM', 'transformer', 'GPT', 'instruction tuning', 'prompt engineering', 'fine-tuning', 'chain-of-thought'],
    paperIds: ['p006', 'p007', 'p008', 'p009', 'p010'],
    coherenceScore: 0.88,
    trend: 'rising',
    color: '#f59e0b',
  },
  {
    id: 't003',
    name: 'Computer Vision',
    keywords: ['image recognition', 'convolutional neural network', 'object detection', 'vision transformer', 'segmentation', 'feature extraction'],
    paperIds: ['p011', 'p012', 'p013', 'p014', 'p015'],
    coherenceScore: 0.79,
    trend: 'stable',
    color: '#8b5cf6',
  },
  {
    id: 't004',
    name: 'Medical Imaging',
    keywords: ['radiology', 'CT scan', 'MRI', 'lesion detection', 'diagnosis', 'clinical AI', 'segmentation'],
    paperIds: [],
    coherenceScore: 0.74,
    trend: 'rising',
    color: '#ec4899',
  },
  {
    id: 't005',
    name: 'Knowledge Graphs',
    keywords: ['knowledge graph', 'entity embeddings', 'link prediction', 'triple store', 'ontology', 'relation extraction', 'KGE'],
    paperIds: ['p016', 'p017', 'p018', 'p019', 'p020'],
    coherenceScore: 0.77,
    trend: 'stable',
    color: '#10b981',
  },
  {
    id: 't006',
    name: 'Robotics & Embodied AI',
    keywords: ['robotic manipulation', 'task planning', 'imitation learning', 'sim-to-real', 'grasping', 'navigation', 'embodied agent'],
    paperIds: [],
    coherenceScore: 0.71,
    trend: 'rising',
    color: '#06b6d4',
  },
  {
    id: 't007',
    name: 'Reinforcement Learning',
    keywords: ['policy gradient', 'Q-learning', 'reward function', 'exploration', 'Markov decision process', 'actor-critic', 'PPO'],
    paperIds: [],
    coherenceScore: 0.81,
    trend: 'stable',
    color: '#f97316',
  },
  {
    id: 't008',
    name: 'Clinical AI & Health',
    keywords: ['clinical decision support', 'EHR', 'patient outcome', 'explainable AI', 'drug interaction', 'diagnosis', 'treatment prediction'],
    paperIds: [],
    coherenceScore: 0.76,
    trend: 'rising',
    color: '#e11d48',
  },
];
