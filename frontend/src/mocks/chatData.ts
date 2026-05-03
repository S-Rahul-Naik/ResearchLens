export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: { paperId: string; title: string; relevance: number }[];
  timestamp: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  paperCount: number;
}

export const mockChatSessions: ChatSession[] = [
  {
    id: 'cs001',
    title: 'Gaps in Federated Learning research',
    paperCount: 20,
    createdAt: '2024-11-20T10:30:00Z',
    messages: [
      {
        id: 'm001',
        role: 'user',
        content: 'What are the main research gaps in federated learning?',
        timestamp: '2024-11-20T10:30:00Z',
      },
      {
        id: 'm002',
        role: 'assistant',
        content: 'Based on analysis of the uploaded papers, I identified two major research gaps involving Federated Learning:\n\n**1. Federated Learning × Clinical AI (Gap Score: 0.435)**\nDespite strong semantic similarity (0.87), only 1 paper bridges federated learning with clinical AI. Privacy-preserving federated approaches for EHR modeling and clinical decision support remain largely unexplored.\n\n**2. Federated Learning × Reinforcement Learning (Gap Score: 0.37)**\nWhile one paper explores federated RL for multi-robot settings, the broader application of federated learning to RL environments — such as autonomous vehicles and personalized recommendation — is underrepresented.\n\nThese gaps suggest high potential for future research combining federated approaches with healthcare and RL domains.',
        citations: [
          { paperId: 'p001', title: 'Federated Learning with Differential Privacy for Medical Image Segmentation', relevance: 0.92 },
          { paperId: 'p007', title: 'Federated Reinforcement Learning for Multi-Robot Coordination', relevance: 0.87 },
          { paperId: 'p020', title: 'Efficient Federated Learning Under Byzantine Fault Tolerance', relevance: 0.81 },
        ],
        timestamp: '2024-11-20T10:30:05Z',
      },
    ],
  },
  {
    id: 'cs002',
    title: 'LLMs and robotics papers',
    paperCount: 20,
    createdAt: '2024-11-19T14:15:00Z',
    messages: [
      {
        id: 'm003',
        role: 'user',
        content: 'Which papers discuss using large language models in robotics?',
        timestamp: '2024-11-19T14:15:00Z',
      },
      {
        id: 'm004',
        role: 'assistant',
        content: 'Three papers in the dataset directly address large language models in robotics contexts:\n\n**1.** "Large Language Models as Zero-Shot Planners for Embodied Agents" (2023) — Uses LLMs for high-level task planning in manipulation tasks without task-specific fine-tuning.\n\n**2.** "Grounding Language Instructions in Vision for Robot Task Execution" (2022) — Combines LLMs with vision-language models to ground natural language instructions in visual observations for robots.\n\n**3.** "Reinforcement Learning from Human Feedback for Code Generation" (2023) — While not directly robotics, it demonstrates how RLHF can align LLM outputs with human intent, a technique transferable to robot instruction following.\n\nThis is also a detected research gap (Gap Score: 0.27), suggesting the combination remains underexplored relative to its potential.',
        citations: [
          { paperId: 'p003', title: 'Large Language Models as Zero-Shot Planners for Embodied Agents', relevance: 0.97 },
          { paperId: 'p016', title: 'Grounding Language Instructions in Vision for Robot Task Execution', relevance: 0.95 },
          { paperId: 'p005', title: 'Reinforcement Learning from Human Feedback for Code Generation', relevance: 0.71 },
        ],
        timestamp: '2024-11-19T14:15:08Z',
      },
    ],
  },
];

export const mockQuickSuggestions = [
  'What are the top research gaps detected?',
  'Which topics have the most papers?',
  'Are there papers combining knowledge graphs and reinforcement learning?',
  'What is the trend for clinical AI research?',
  'Which papers could bridge the gap between LLMs and medical imaging?',
];
