const { runModule2TopicModelingWithLLM } = require('./src/services/module2TopicModeling');
const { runModule3GapDetection } = require('./src/services/module3GapDetection');

const papers = [
  { id: 'P1', title: 'Vision Transformers for Biomedical Image Segmentation', abstract: 'Transformer-based learning for medical imaging', content: 'Self-attention mechanisms', fullText: { methodology: 'Self-attention for 3D volumes' }, year: 2021 },
  { id: 'P2', title: 'Transformer Attention for Lesion Segmentation', abstract: 'Vision transformers for biomedical segmentation', content: 'Bridges attention maps', fullText: { methodology: 'Multi-head attention' }, year: 2022 },
  { id: 'P3', title: 'Deep CNN for Medical Imaging', abstract: 'CNNs for classification and segmentation', content: 'Architecture evolution', fullText: { methodology: 'Skip connections' }, year: 2019 },
  { id: 'P4', title: 'Vision-Language Models for Clinical Reports', abstract: 'Multimodal transformers for report generation', content: 'Cross-modal alignment', fullText: { methodology: 'Contrastive learning' }, year: 2024 }
];

async function test() {
  try {
    console.log('Getting Topics...');
    const m2 = await runModule2TopicModelingWithLLM(papers);
    console.log(`Found ${m2.topics.length} topics`);

    console.log('\nGetting Gaps (Python only, no LLM)...');
    const m3 = runModule3GapDetection(papers, m2.topics);
    console.log(`Found ${m3.gaps.length} gaps`);
    
    const gap = m3.gaps[0];
    if (gap) {
      console.log('\nGap structure:');
      console.log(JSON.stringify(gap, null, 2).slice(0, 500));
    }
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
}

test();
