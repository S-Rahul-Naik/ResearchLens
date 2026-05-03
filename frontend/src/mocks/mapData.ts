export interface MapPoint {
  paperId: string;
  title: string;
  x: number;
  y: number;
  topicId: string;
  topicName: string;
  color: string;
  year: number;
}

export const mockMapPoints: MapPoint[] = [
  // Federated Learning cluster (top-left)
  { paperId: 'p001', title: 'Federated Learning with Differential Privacy for Medical Image Segmentation', x: 120, y: 90, topicId: 't001', topicName: 'Federated Learning', color: '#0d9488', year: 2023 },
  { paperId: 'p007', title: 'Federated Reinforcement Learning for Multi-Robot Coordination', x: 150, y: 120, topicId: 't001', topicName: 'Federated Learning', color: '#0d9488', year: 2022 },
  { paperId: 'p014', title: 'Privacy-Preserving Natural Language Processing via Federated Learning', x: 95, y: 140, topicId: 't001', topicName: 'Federated Learning', color: '#0d9488', year: 2023 },
  { paperId: 'p020', title: 'Efficient Federated Learning Under Byzantine Fault Tolerance', x: 130, y: 65, topicId: 't001', topicName: 'Federated Learning', color: '#0d9488', year: 2020 },
  // LLM cluster (top-right)
  { paperId: 'p003', title: 'Large Language Models as Zero-Shot Planners for Embodied Agents', x: 530, y: 80, topicId: 't002', topicName: 'Large Language Models', color: '#f59e0b', year: 2023 },
  { paperId: 'p005', title: 'Reinforcement Learning from Human Feedback for Code Generation', x: 510, y: 110, topicId: 't002', topicName: 'Large Language Models', color: '#f59e0b', year: 2023 },
  { paperId: 'p008', title: 'Prompt Engineering for Chain-of-Thought Reasoning in Large Language Models', x: 560, y: 60, topicId: 't002', topicName: 'Large Language Models', color: '#f59e0b', year: 2022 },
  { paperId: 'p016', title: 'Grounding Language Instructions in Vision for Robot Task Execution', x: 490, y: 95, topicId: 't002', topicName: 'Large Language Models', color: '#f59e0b', year: 2022 },
  { paperId: 'p017', title: 'Biomedical Named Entity Recognition with Domain-Adaptive Pre-training', x: 545, y: 140, topicId: 't002', topicName: 'Large Language Models', color: '#f59e0b', year: 2020 },
  // Computer Vision cluster (middle)
  { paperId: 'p004', title: 'Scaling Transformers for Vision: A Systematic Study of Architectural Choices', x: 310, y: 130, topicId: 't003', topicName: 'Computer Vision', color: '#8b5cf6', year: 2022 },
  { paperId: 'p009', title: 'Self-Supervised Contrastive Learning for Medical Image Analysis', x: 280, y: 160, topicId: 't003', topicName: 'Computer Vision', color: '#8b5cf6', year: 2022 },
  { paperId: 'p013', title: 'Multi-Modal Fusion for Emotion Recognition in Human-Robot Interaction', x: 340, y: 155, topicId: 't003', topicName: 'Computer Vision', color: '#8b5cf6', year: 2022 },
  { paperId: 'p019', title: 'Hierarchical Graph Representation Learning for Scene Understanding', x: 295, y: 105, topicId: 't003', topicName: 'Computer Vision', color: '#8b5cf6', year: 2021 },
  // Medical Imaging (near CV)
  { paperId: 'p001', title: 'Federated Learning with Differential Privacy for Medical Image Segmentation', x: 250, y: 200, topicId: 't004', topicName: 'Medical Imaging', color: '#ec4899', year: 2023 },
  // Knowledge Graphs cluster (bottom-left)
  { paperId: 'p002', title: 'Knowledge Graph Completion via Contrastive Learning and Entity Alignment', x: 160, y: 310, topicId: 't005', topicName: 'Knowledge Graphs', color: '#10b981', year: 2022 },
  { paperId: 'p006', title: 'Graph Neural Networks for Drug-Drug Interaction Prediction', x: 195, y: 340, topicId: 't005', topicName: 'Knowledge Graphs', color: '#10b981', year: 2021 },
  { paperId: 'p010', title: 'Knowledge Graph Embedding with Uncertainty for Relation Reasoning', x: 140, y: 350, topicId: 't005', topicName: 'Knowledge Graphs', color: '#10b981', year: 2021 },
  { paperId: 'p018', title: 'Causal Discovery in Healthcare Using Observational Data', x: 200, y: 280, topicId: 't005', topicName: 'Knowledge Graphs', color: '#10b981', year: 2022 },
  // Robotics cluster (right)
  { paperId: 'p011', title: 'Robotic Manipulation via Imitation Learning with Sparse Demonstrations', x: 440, y: 280, topicId: 't006', topicName: 'Robotics & Embodied AI', color: '#06b6d4', year: 2021 },
  { paperId: 'p003', title: 'Large Language Models as Zero-Shot Planners for Embodied Agents', x: 420, y: 250, topicId: 't006', topicName: 'Robotics & Embodied AI', color: '#06b6d4', year: 2023 },
  { paperId: 'p007', title: 'Federated Reinforcement Learning for Multi-Robot Coordination', x: 460, y: 310, topicId: 't006', topicName: 'Robotics & Embodied AI', color: '#06b6d4', year: 2022 },
  // Reinforcement Learning (center)
  { paperId: 'p005', title: 'Reinforcement Learning from Human Feedback for Code Generation', x: 350, y: 240, topicId: 't007', topicName: 'Reinforcement Learning', color: '#f97316', year: 2023 },
  { paperId: 'p015', title: 'Reward Shaping for Sparse Reward Reinforcement Learning in Navigation', x: 375, y: 270, topicId: 't007', topicName: 'Reinforcement Learning', color: '#f97316', year: 2021 },
  // Clinical AI cluster (bottom-right)
  { paperId: 'p012', title: 'Explainable AI for Clinical Decision Support in ICU Settings', x: 480, y: 390, topicId: 't008', topicName: 'Clinical AI & Health', color: '#e11d48', year: 2023 },
  { paperId: 'p017', title: 'Biomedical Named Entity Recognition with Domain-Adaptive Pre-training', x: 510, y: 360, topicId: 't008', topicName: 'Clinical AI & Health', color: '#e11d48', year: 2020 },
  { paperId: 'p018', title: 'Causal Discovery in Healthcare Using Observational Data', x: 450, y: 420, topicId: 't008', topicName: 'Clinical AI & Health', color: '#e11d48', year: 2022 },
];
