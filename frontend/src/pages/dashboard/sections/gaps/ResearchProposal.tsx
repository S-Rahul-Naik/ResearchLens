import { type ResearchGap } from '../../../../mocks/gaps';

/* ─── Venue suggestions by topic domain ─────────────────── */
function getSuggestedVenues(gap: ResearchGap): string[] {
  const text = [gap.topicAName, gap.topicBName, ...gap.topicAKeywords, ...gap.topicBKeywords].join(' ').toLowerCase();
  const venues: string[] = [];
  if (text.includes('language') || text.includes('llm') || text.includes('transformer')) venues.push('ACL', 'EMNLP', 'NAACL');
  if (text.includes('learning') || text.includes('neural') || text.includes('deep')) venues.push('NeurIPS', 'ICML', 'ICLR');
  if (text.includes('vision') || text.includes('image') || text.includes('visual')) venues.push('CVPR', 'ICCV', 'ECCV');
  if (text.includes('robot') || text.includes('manipulation') || text.includes('reinforcement')) venues.push('ICRA', 'CoRL', 'IROS');
  if (text.includes('knowledge') || text.includes('graph') || text.includes('ontology')) venues.push('ISWC', 'AAAI', 'IJCAI');
  if (text.includes('clinical') || text.includes('health') || text.includes('medical')) venues.push('MICCAI', 'CHIL', 'ML4H');
  if (text.includes('federated') || text.includes('privacy')) venues.push('CCS', 'IEEE S&P', 'USENIX');
  if (venues.length < 2) venues.push('AAAI', 'IJCAI');
  return [...new Set(venues)].slice(0, 4);
}

/* ─── Deterministic proposal generator ──────────────────── */
function buildProposal(gap: ResearchGap) {
  const simLabel = gap.similarityScore >= 0.85 ? 'strong' : gap.similarityScore >= 0.75 ? 'notable' : 'moderate';
  const coStr = gap.coOccurrenceCount === 0
    ? 'no existing work directly addresses this intersection'
    : `only ${gap.coOccurrenceCount} paper${gap.coOccurrenceCount !== 1 ? 's' : ''} address${gap.coOccurrenceCount === 1 ? 'es' : ''} this intersection`;
  const [kwA1, kwA2, kwA3] = gap.topicAKeywords;
  const [kwB1, kwB2] = gap.topicBKeywords;
  const novelty = gap.coOccurrenceCount === 0 ? 'Very High' : gap.coOccurrenceCount <= 1 ? 'High' : 'Moderate';

  return {
    novelty,
    problemStatement: `Despite a ${simLabel} semantic similarity (${gap.similarityScore.toFixed(2)}) between ${gap.topicAName} and ${gap.topicBName}, ${coStr} (gap score: ${gap.gapScore.toFixed(3)}). This places the ${gap.topicAName}–${gap.topicBName} intersection among the highest-priority unexplored areas in this corpus. Specifically, techniques from ${kwA1} have not been systematically applied to ${kwB1} problems, representing a missed opportunity for cross-domain advancement.`,

    objective: `Design, implement, and empirically validate a unified framework that bridges ${gap.topicAName} and ${gap.topicBName}, demonstrating that cross-domain knowledge transfer yields measurable improvements over single-domain baselines on tasks requiring both ${kwA1} and ${kwB1}.`,

    methodology: [
      {
        step: 1,
        label: 'Literature Synthesis',
        detail: `Systematically survey ${gap.topicAName} literature (${[kwA1, kwA2, kwA3].filter(Boolean).join(', ')}) and ${gap.topicBName} literature (${gap.topicBKeywords.slice(0, 3).join(', ')}). Identify complementary strengths, open challenges, and methodological gaps across both communities.`,
      },
      {
        step: 2,
        label: 'Cross-Domain Concept Mapping',
        detail: `Construct a structured concept map linking core primitives from both domains. Identify which ${kwA1} techniques are semantically transferable to ${kwB1} challenges, and formalize the intersection as a new research sub-problem.`,
      },
      {
        step: 3,
        label: 'Novel Method Development',
        detail: `Develop experiments that apply ${gap.topicAName} approaches to ${gap.topicBName} problems. Design ablation studies to isolate the contribution of each cross-domain component and establish rigorous baselines.`,
      },
      {
        step: 4,
        label: 'Empirical Validation & Benchmarking',
        detail: `Evaluate on established datasets from both domains. Introduce a cross-domain benchmark and evaluation protocol specifically designed for the ${gap.topicAName}–${gap.topicBName} intersection.`,
      },
    ],

    contributions: [
      `First systematic investigation of the ${gap.topicAName}–${gap.topicBName} intersection`,
      `A novel method combining ${kwA1} and ${kwB2 ?? kwB1} for cross-domain tasks`,
      `Quantitative evidence that bridging this gap improves performance on both domain benchmarks`,
      `An open benchmark and evaluation protocol enabling reproducible future research in this space`,
    ],

    venues: getSuggestedVenues(gap),
  };
}

/* ─── Section block ─────────────────────────────────────── */
function ProposalBlock({ icon, color, bg, label, children }: { icon: string; color: string; bg: string; label: string; children: React.ReactNode }) {
  return (
    <div className={`p-4 rounded-xl border ${bg}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <div className={`w-5 h-5 flex items-center justify-center rounded-md ${color} flex-shrink-0`}>
          <i className={`${icon} text-xs`} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600">{label}</span>
      </div>
      {children}
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */
interface Props { gap: ResearchGap; }

export default function ResearchProposal({ gap }: Props) {
  const p = buildProposal(gap);

  return (
    <div className="space-y-3.5">

      {/* Meta badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${p.novelty === 'Very High' ? 'bg-rose-100 text-rose-700' : p.novelty === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
          {p.novelty} Novelty
        </span>
        <span className="text-[10px] text-gray-400">Gap score: {gap.gapScore.toFixed(3)}</span>
        <span className="text-[10px] text-gray-300">·</span>
        <span className="text-[10px] text-gray-400">Auto-generated from gap evidence — not AI-hallucinated</span>
      </div>

      {/* Problem Statement */}
      <ProposalBlock icon="ri-error-warning-line" color="bg-rose-50 text-rose-600" bg="bg-rose-50 border-rose-100" label="Problem Statement">
        <p className="text-xs text-rose-900 leading-relaxed">{p.problemStatement}</p>
      </ProposalBlock>

      {/* Objective */}
      <ProposalBlock icon="ri-focus-3-line" color="bg-teal-50 text-teal-600" bg="bg-teal-50 border-teal-100" label="Research Objective">
        <p className="text-xs text-teal-900 leading-relaxed">{p.objective}</p>
      </ProposalBlock>

      {/* Methodology steps */}
      <div>
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-5 h-5 flex items-center justify-center rounded-md bg-gray-100 text-gray-600 flex-shrink-0">
            <i className="ri-route-line text-xs" />
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Proposed Methodology</span>
        </div>
        <div className="space-y-2">
          {p.methodology.map((m) => (
            <div key={m.step} className="flex gap-3 p-3 bg-white border border-gray-100 rounded-xl">
              <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-900 text-white text-[9px] font-bold flex-shrink-0 mt-px">{m.step}</div>
              <div>
                <p className="text-xs font-semibold text-gray-800 mb-0.5">{m.label}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{m.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expected Contributions */}
      <ProposalBlock icon="ri-trophy-line" color="bg-amber-50 text-amber-600" bg="bg-amber-50 border-amber-100" label="Expected Contributions">
        <ul className="space-y-1.5">
          {p.contributions.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-amber-900">
              <span className="w-4 h-4 flex items-center justify-center rounded bg-amber-200 text-amber-800 text-[9px] font-bold flex-shrink-0 mt-px">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </ProposalBlock>

      {/* Suggested venues */}
      <div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Suggested Publication Venues</p>
        <div className="flex flex-wrap gap-1.5">
          {p.venues.map((v) => (
            <span key={v} className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">{v}</span>
          ))}
        </div>
      </div>

    </div>
  );
}
