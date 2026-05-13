const { runModule2TopicModelingWithLLM } = require('./src/services/module2TopicModeling');

const papers = [
  { id: 'P1', title: 'Vision Transformers for Biomedical Image Segmentation', abstract: 'We study transformer-based representation learning for medical image segmentation and cross-modal localization in MRI scans.', content: 'Our method improves segmentation accuracy.', fullText: { methodology: 'Self-attention mechanisms applied to 3D medical volumes' }, year: 2021 },
  { id: 'P2', title: 'Transformer Representation Learning for Retinal Lesion Segmentation', abstract: 'A vision transformer backbone is adapted to biomedical segmentation with attention regularization.', content: 'Bridges transformer attention maps and pixel-level boundaries.', fullText: { methodology: 'Multi-head attention with spatial regularization' }, year: 2022 },
  { id: 'P3', title: 'Deep Residual CNN Architectures for Medical Imaging', abstract: 'Residual networks remain competitive for classification and segmentation in biomedical imaging.', content: 'Analysis of architecture evolution.', fullText: { methodology: 'Skip connections for deeper networks' }, year: 2019 },
  { id: 'P4', title: 'Vision-Language Models for Clinical Report Generation', abstract: 'Multimodal transformers connect imaging and language for report generation.', content: 'Cross-modal alignment in radiology.', fullText: { methodology: 'Contrastive learning between images and text' }, year: 2024 }
];

async function test() {
  try {
    const result = await runModule2TopicModelingWithLLM(papers);
    console.log('✓ Full Module 2 with LLM Success');
    console.log('Topics found:', result.topics.length);
    result.topics.forEach((t, i) => {
      console.log(`\n  Topic ${i+1}:`);
      console.log(`    Heuristic: ${t.heuristic_label}`);
      console.log(`    LLM Label: ${t.llm_label}`);
      console.log(`    Domain: ${t.llm_domain_summary}`);
      console.log(`    Confidence: ${t.llm_confidence}`);
    });
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
}

test();
