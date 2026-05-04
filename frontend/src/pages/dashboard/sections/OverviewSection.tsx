import type { DashboardSection } from '../components/Sidebar';
import type { AnalysisRun } from '../../../hooks/useAnalysisHistory';
import { mockPapers } from '../../../mocks/papers';
import { mockTopics } from '../../../mocks/topics';
import { mockGaps } from '../../../mocks/gaps';

interface OverviewSectionProps {
  onNavigate: (section: DashboardSection) => void;
  latestRun?: AnalysisRun | null;
}

export default function OverviewSection({ onNavigate, latestRun }: OverviewSectionProps) {
  const topGaps = mockGaps.slice(0, 3);
  const recentPapers = mockPapers.slice(0, 5);

  const stats = [
    { label: 'Total Papers', value: mockPapers.length, icon: 'ri-file-text-line', color: 'bg-teal-50 text-teal-700', change: '+3 this week' },
    { label: 'Topics Detected', value: mockTopics.length, icon: 'ri-price-tag-3-line', color: 'bg-amber-50 text-amber-700', change: 'BERTopic clusters' },
    { label: 'Research Gaps', value: mockGaps.length, icon: 'ri-radar-line', color: 'bg-rose-50 text-rose-600', change: `${mockGaps.filter((g) => g.gapScore > 0.5).length} high-confidence` },
    { label: 'Avg Gap Score', value: (mockGaps.reduce((s, g) => s + g.gapScore, 0) / mockGaps.length).toFixed(2), icon: 'ri-bar-chart-2-line', color: 'bg-violet-50 text-violet-700', change: 'Computed score' },
  ];

  return (
    <div className="p-8 space-y-8">
      {latestRun ? (
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-5 text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 flex-shrink-0">
              <i className="ri-file-chart-line text-base" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">Latest Run</p>
              <p className="text-sm font-semibold truncate">{latestRun.name}</p>
              <p className="text-xs text-white/60 mt-0.5">
                {latestRun.papers} papers · {latestRun.topics} topics · {latestRun.gaps} gaps · {latestRun.yearRange.start}–{latestRun.yearRange.end}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {[
              { label: 'Papers', val: latestRun.papers, icon: 'ri-file-text-line' },
              { label: 'Topics', val: latestRun.topics, icon: 'ri-price-tag-3-line' },
              { label: 'Gaps', val: latestRun.gaps, icon: 'ri-radar-line' },
            ].map((s) => (
              <div key={s.label} className="text-center bg-white/10 rounded-xl px-4 py-2">
                <div className="text-lg font-bold">{s.val}</div>
                <div className="text-[10px] text-white/70">{s.label}</div>
              </div>
            ))}
            <div className="text-center bg-white/10 rounded-xl px-4 py-2">
              <div className="text-lg font-bold">{(latestRun.qualityScore * 100).toFixed(0)}%</div>
              <div className="text-[10px] text-white/70">Quality</div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${s.color} mb-4`}>
              <i className={`${s.icon} text-lg`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{s.change}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900">Top Research Gaps</h3>
            <button
              onClick={() => onNavigate('gaps')}
              className="whitespace-nowrap text-xs text-teal-600 hover:underline cursor-pointer font-medium"
            >
              View all →
            </button>
          </div>
          <div className="space-y-4">
            {topGaps.map((gap, i) => (
              <div key={gap.id} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-6 h-6 flex items-center justify-center rounded-full bg-teal-600 text-white text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">{gap.topicAName}</span>
                    <span className="text-xs text-gray-400 self-center">↔</span>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">{gap.topicBName}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Similarity: <strong className="text-gray-800">{gap.similarityScore.toFixed(2)}</strong></span>
                    <span>Co-occ: <strong className="text-gray-800">{gap.coOccurrenceCount}</strong></span>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded font-semibold">Gap: {gap.gapScore.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-gray-900">Recent Papers</h3>
            <button
              onClick={() => onNavigate('datasets')}
              className="whitespace-nowrap text-xs text-teal-600 hover:underline cursor-pointer font-medium"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {recentPapers.map((paper) => (
              <div key={String(paper.id)} className="flex items-start gap-3">
                <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 flex-shrink-0 mt-0.5">
                  <i className="ri-file-pdf-line text-xs" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 leading-tight line-clamp-2">{String(paper.title)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {String(paper.year)} · {Array.isArray(paper.authors) && paper.authors.length > 0 ? String(paper.authors[0]) : 'Unknown Author'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-5">Topic Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {mockTopics.map((topic) => (
            <div key={String(topic.id)} className="p-4 rounded-xl border border-gray-100" style={{ borderLeftColor: String(topic.color), borderLeftWidth: 3 }}>
              <div className="text-sm font-semibold text-gray-800 mb-1">{String(topic.name)}</div>
              <div className="text-xs text-gray-400">{topic.paperIds.length} papers</div>
              <div className="flex items-center gap-1 mt-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ backgroundColor: String(topic.color), width: `${(topic.paperIds.length / mockPapers.length) * 100 * 2.5}%` }}
                  />
                </div>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    topic.trend === 'rising' ? 'bg-green-50 text-green-600' :
                    topic.trend === 'declining' ? 'bg-rose-50 text-rose-600' :
                    'bg-gray-50 text-gray-500'
                  }`}
                >
                  {topic.trend === 'rising' ? '↑' : topic.trend === 'declining' ? '↓' : '→'} {topic.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
