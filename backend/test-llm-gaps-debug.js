const { runModule2TopicModelingWithLLM } = require('./src/services/module2TopicModeling');
const { runModule3GapDetectionWithLLM } = require('./src/services/module3GapDetection');

const papers = [
  { id: 'P1', title: 'Vision Transformers for Biomedical Image Segmentation', abstract: 'Transformer-based learning for medical imaging', content: 'Self-attention mechanisms', fullText: { methodology: 'Self-attention for 3D volumes' }, year: 2021 },
  { id: 'P2', title: 'Transformer Attention for Lesion Segmentation', abstract: 'Vision transformers for biomedical segmentation', content: 'Bridges attention maps', fullText: { methodology: 'Multi-head attention' }, year: 2022 },
  { id: 'P3', title: 'Deep CNN for Medical Imaging', abstract: 'CNNs for classification and segmentation', content: 'Architecture evolution', fullText: { methodology: 'Skip connections' }, year: 2019 },
  { id: 'P4', title: 'Vision-Language Models for Clinical Reports', abstract: 'Multimodal transformers for report generation', content: 'Cross-modal alignment', fullText: { methodology: 'Contrastive learning' }, year: 2024 }
];

async function test() {
  try {
    console.log('Step 1: Running Topic Modeling with LLM...');
    const m2 = await runModule2TopicModelingWithLLM(papers);
    console.log(`✓ Found ${m2.topics.length} topics\n`);
    m2.topics.forEach((t, i) => {
      console.log(`Topic ${i+1}: "${t.name}" -> LLM: "${t.llm_label}"`);
    });

    console.log('\nStep 2: Running Gap Detection with LLM...');
    const m3 = await runModule3GapDetectionWithLLM(papers, m2.topics);
    console.log(`✓ Found ${m3.gaps.length} gaps\n`);

    const gap = m3.gaps[0];
    if (gap) {
      console.log('Gap 1 structure:');
      console.log(`  Keys: ${Object.keys(gap).slice(0, 10).join(', ')}...`);
      console.log(`  topic1Name: ${gap.topic1Name}`);
      console.log(`  topic2Name: ${gap.topic2Name}`);
      console.log(`  gapScore: ${gap.gapScore}`);
      console.log(`  llm_is_gap: ${gap.llm_is_gap}`);
      console.log(`  llm_gap_confidence: ${gap.llm_gap_confidence}`);
      console.log(`  llm_gap_explanation: ${gap.llm_gap_explanation?.slice(0, 60)}...`);
    }
  } catch (err) {
    console.error('✗ Error:', err.message);
    console.error(err.stack);
  }
}

test();
