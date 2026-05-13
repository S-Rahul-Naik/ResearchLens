export interface ResearchGap {
  id: string;
  topicAId: string;
  topicBId: string;
  topicAName: string;
  topicBName: string;
  topicAKeywords: string[];
  topicBKeywords: string[];
  similarityScore: number;
  coOccurrenceCount: number;
  gapScore: number;
  paperIdsInA: string[];
  paperIdsInB: string[];
  paperIdsBridging: string[];
  explanation: string;
  rank: number;
  scoreComponents?: {
    semanticSimilarity: number;
    temporalDistance?: number | null;
    citationDivergence?: number | null;
    methodologyContrast?: number | null;
    taskOverlap?: number | null;
    architectureDistance?: number | null;
    crossDomainRarity: number;
    coOccurrenceScarcity: number;
  };
  evidenceSnippets?: { paperId: string; title: string; snippet: string; role?: string; relevance?: number }[];
  confidence?: number;
  reliability?: number;
  // LLM-enhanced fields
  llm_is_gap?: boolean;
  llm_gap_explanation?: string;
  llm_gap_significance?: string;
  llm_integration_opportunity?: string;
  llm_gap_confidence?: number;
  llm_verified_bridging_papers?: Array<{
    title: string;
    llm_is_bridging?: boolean;
    llm_bridging_evidence?: string;
    llm_bridging_confidence?: number;
  }>;
}

// Gap score formula: gap_score = similarity * (1 / (co_occurrence + 1))
// Higher score = stronger gap (high similarity but low co-occurrence)
export const mockGaps: ResearchGap[] = [
  {
    id: 'g001',
    topicAId: 't001',
    topicBId: 't008',
    topicAName: 'Federated Learning',
    topicBName: 'Clinical AI & Health',
    topicAKeywords: ['federated learning', 'privacy', 'distributed training', 'aggregation', 'non-IID'],
    topicBKeywords: ['clinical decision support', 'EHR', 'explainable AI', 'patient outcome', 'diagnosis'],
    similarityScore: 0.87,
    coOccurrenceCount: 1,
    gapScore: 0.435, // 0.87 * (1 / (1 + 1)) = 0.435
    paperIdsInA: ['p020', 'p014'],
    paperIdsInB: ['p012', 'p018'],
    paperIdsBridging: ['p001'],
    explanation: 'Federated Learning and Clinical AI are semantically highly related — both deal with sensitive data environments and distributed model training. However, only 1 paper co-addresses both topics. This gap suggests that privacy-preserving federated approaches have not been widely applied to clinical decision-making workflows, clinical NLP, or EHR modeling — a potentially high-impact research direction.',
    rank: 1,
  },
  {
    id: 'g002',
    topicAId: 't007',
    topicBId: 't005',
    topicAName: 'Reinforcement Learning',
    topicBName: 'Knowledge Graphs',
    topicAKeywords: ['policy gradient', 'Q-learning', 'reward function', 'exploration', 'actor-critic'],
    topicBKeywords: ['knowledge graph', 'entity embeddings', 'link prediction', 'ontology', 'relation extraction'],
    similarityScore: 0.83,
    coOccurrenceCount: 0,
    gapScore: 0.83, // 0.83 * (1 / (0 + 1)) = 0.83
    paperIdsInA: ['p015', 'p005'],
    paperIdsInB: ['p002', 'p010'],
    paperIdsBridging: [],
    explanation: 'Reinforcement Learning and Knowledge Graphs share strong semantic overlap — both involve structured decision environments and reasoning over relational data. Yet no paper in this dataset bridges both topics. This represents a significant opportunity: knowledge graph-augmented RL agents could leverage structured world knowledge to improve reasoning, planning, and exploration efficiency.',
    rank: 2,
  },
  {
    id: 'g003',
    topicAId: 't002',
    topicBId: 't004',
    topicAName: 'Large Language Models',
    topicBName: 'Medical Imaging',
    topicAKeywords: ['LLM', 'transformer', 'instruction tuning', 'prompt engineering', 'chain-of-thought'],
    topicBKeywords: ['radiology', 'CT scan', 'MRI', 'lesion detection', 'clinical AI'],
    similarityScore: 0.79,
    coOccurrenceCount: 0,
    gapScore: 0.79, // 0.79 * (1 / (0 + 1)) = 0.79
    paperIdsInA: ['p008', 'p005'],
    paperIdsInB: ['p001', 'p009'],
    paperIdsBridging: [],
    explanation: 'Large Language Models and Medical Imaging represent a compelling gap. LLMs excel at clinical reasoning and report generation while medical imaging requires visual understanding. No paper combines LLM-based textual reasoning directly with radiological image analysis. Multi-modal LLMs applied to radiology reports and corresponding imaging data is an underexplored frontier.',
    rank: 3,
  },
  {
    id: 'g004',
    topicAId: 't006',
    topicBId: 't005',
    topicAName: 'Robotics & Embodied AI',
    topicBName: 'Knowledge Graphs',
    topicAKeywords: ['robotic manipulation', 'task planning', 'imitation learning', 'navigation', 'embodied agent'],
    topicBKeywords: ['knowledge graph', 'entity embeddings', 'ontology', 'relation extraction', 'KGE'],
    similarityScore: 0.76,
    coOccurrenceCount: 0,
    gapScore: 0.76,
    paperIdsInA: ['p011', 'p016'],
    paperIdsInB: ['p002', 'p010'],
    paperIdsBridging: [],
    explanation: 'Robots operating in real-world environments must reason about objects, their properties, and relationships — exactly what knowledge graphs encode. Despite this alignment, no paper in the dataset integrates knowledge graph reasoning into robotic task planning. This gap points to potential in using KG-augmented world models to improve generalization in robotic manipulation.',
    rank: 4,
  },
  {
    id: 'g005',
    topicAId: 't001',
    topicBId: 't007',
    topicAName: 'Federated Learning',
    topicBName: 'Reinforcement Learning',
    topicAKeywords: ['federated learning', 'privacy', 'distributed training', 'aggregation', 'gradient sharing'],
    topicBKeywords: ['policy gradient', 'Q-learning', 'reward function', 'exploration', 'PPO'],
    similarityScore: 0.74,
    coOccurrenceCount: 1,
    gapScore: 0.37, // 0.74 * (1 / (1 + 1))
    paperIdsInA: ['p020', 'p014'],
    paperIdsInB: ['p015', 'p005'],
    paperIdsBridging: ['p007'],
    explanation: 'Federated Reinforcement Learning has been explored in multi-robot contexts (p007), but the combination remains underrepresented. Only 1 bridging paper exists despite high semantic similarity. Federated RL could address data-sharing restrictions in autonomous driving, healthcare robotics, and industrial automation where centralized experience collection is infeasible.',
    rank: 5,
  },
  {
    id: 'g006',
    topicAId: 't003',
    topicBId: 't008',
    topicAName: 'Computer Vision',
    topicBName: 'Clinical AI & Health',
    topicAKeywords: ['image recognition', 'object detection', 'vision transformer', 'segmentation', 'feature extraction'],
    topicBKeywords: ['clinical decision support', 'EHR', 'explainable AI', 'patient outcome', 'diagnosis'],
    similarityScore: 0.72,
    coOccurrenceCount: 2,
    gapScore: 0.24, // 0.72 * (1 / (2 + 1))
    paperIdsInA: ['p004', 'p013'],
    paperIdsInB: ['p012', 'p018'],
    paperIdsBridging: ['p001', 'p009'],
    explanation: 'Computer Vision and Clinical AI have some overlap (2 bridging papers), but given the high semantic similarity (0.72), this remains an underdeveloped area. Explainability in visual clinical AI — providing visual attribution maps alongside clinical predictions — is particularly underexplored.',
    rank: 6,
  },
  {
    id: 'g007',
    topicAId: 't002',
    topicBId: 't006',
    topicAName: 'Large Language Models',
    topicBName: 'Robotics & Embodied AI',
    topicAKeywords: ['LLM', 'transformer', 'instruction tuning', 'chain-of-thought', 'zero-shot'],
    topicBKeywords: ['robotic manipulation', 'task planning', 'sim-to-real', 'grasping', 'embodied agent'],
    similarityScore: 0.81,
    coOccurrenceCount: 2,
    gapScore: 0.27, // 0.81 * (1 / (2 + 1))
    paperIdsInA: ['p008', 'p014'],
    paperIdsInB: ['p011', 'p007'],
    paperIdsBridging: ['p003', 'p016'],
    explanation: 'While 2 papers bridge LLMs and Robotics (e.g., LLM planners for embodied agents), the high semantic similarity (0.81) suggests much more untapped potential. Fine-grained motor control guided by LLM reasoning, long-horizon task planning with language grounding, and failure recovery via language feedback remain open problems.',
    rank: 7,
  },
];
