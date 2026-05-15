import type { RunAllResult } from '../../../../lib/api';

interface ReportSummarySectionProps {
  backendResult?: RunAllResult | null;
  visibleSummary: string;
}

export default function ReportSummarySection({ backendResult, visibleSummary }: ReportSummarySectionProps) {
  // Parse summary into sections
  const renderMarkdown = (text: string): JSX.Element => {
    // Improved markdown-to-JSX: handles headings (###, ##, #), lists, bold labels, and inline **bold**
    if (!text || typeof text !== 'string') return <></>;
    const lines = text
      .split('\n')
      .map(l => l.replace(/\r/g, ''))
      .filter(line => line && !line.includes('undefined') && !line.includes('NaN'));

    const elements: JSX.Element[] = [];
    let listItems: string[] = [];

    const renderInline = (str: string) => {
      // Split by **bold** tokens and return array of nodes
      const nodes: Array<string | JSX.Element> = [];
      let lastIndex = 0;
      const regex = /\*\*(.+?)\*\*/g;
      let m: RegExpExecArray | null;
      while ((m = regex.exec(str)) !== null) {
        if (m.index > lastIndex) nodes.push(str.substring(lastIndex, m.index));
        nodes.push(<strong key={m.index} className="font-semibold">{m[1]}</strong>);
        lastIndex = m.index + m[0].length;
      }
      if (lastIndex < str.length) nodes.push(str.substring(lastIndex));
      return nodes.map((n, i) => (typeof n === 'string' ? <span key={i}>{n}</span> : n));
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 my-4">
            {listItems.map((item, i) => (
              <li key={i} className="text-gray-700 leading-relaxed">
                {renderInline(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((rawLine, i) => {
      const line = rawLine.trim();

      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        listItems.push(line.substring(2).trim());
        return;
      }

      // Flush any pending list
      flushList();

      // Heading levels (###, ##, #)
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const content = headingMatch[2];
        if (level >= 3) {
          elements.push(
            <h3 key={`h3-${i}`} className="text-base font-bold text-gray-900 mt-6 mb-3">
              {content}
            </h3>
          );
        } else if (level === 2) {
          elements.push(
            <h3 key={`h2-${i}`} className="text-base font-bold text-gray-900 mt-6 mb-3">
              {content}
            </h3>
          );
        } else {
          elements.push(
            <h2 key={`h1-${i}`} className="text-lg font-bold text-gray-900 mt-6 mb-3">
              {content}
            </h2>
          );
        }
        return;
      }

      // Bold label pattern: **Label:** value
      const boldLabelMatch = line.match(/^\*\*(.+?)\*\*:\s*(.*)$/);
      if (boldLabelMatch) {
        const label = boldLabelMatch[1];
        const rest = boldLabelMatch[2];
        elements.push(
          <p key={`lbl-${i}`} className="text-gray-700 leading-relaxed mb-3">
            <strong className="font-semibold">{label}:</strong>{' '}
            {rest ? renderInline(rest) : null}
          </p>
        );
        return;
      }

      // Regular paragraph with inline formatting
      if (line) {
        elements.push(
          <p key={`p-${i}`} className="text-gray-700 leading-relaxed mb-3">
            {renderInline(line)}
          </p>
        );
      }
    });

    flushList();

    return <>{elements}</>;
  };

  const extractSection = (text: string, heading: string): string => {
    if (!text) return '';

    const headingPatterns = [
      new RegExp(`(?:^|\\n)#{1,3}\\s+${heading}([\\s\\S]*?)(?=\\n#{1,3}\\s|$)`, 'i'),
      new RegExp(`(?:^|\\n)\\*\\*${heading}\\*\\*:?\\s*([\\s\\S]*?)(?=\\n(?:#{1,3}\\s|\\*\\*[^\\n]+\\*\\*:)|$)`, 'i'),
      new RegExp(`(?:^|\\n)${heading}:?\\s*([\\s\\S]*?)(?=\\n(?:#{1,3}\\s|\\*\\*[^\\n]+\\*\\*:)|$)`, 'i'),
    ];

    for (const pattern of headingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) return match[1].trim();
    }

    return '';
  };

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <i className="ri-align-left text-base" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Research Report</p>
          <h2 className="text-lg font-bold text-gray-900">Analysis Summary</h2>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-teal-500 to-teal-400" />
        <div className="p-8">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Papers Analyzed', value: backendResult?.papersCount ?? 0, icon: 'ri-file-paper-2-line', color: 'bg-slate-50 text-slate-700' },
                { label: 'Topics Detected', value: (backendResult?.modules?.module2?.topics || []).length, icon: 'ri-price-tag-3-line', color: 'bg-violet-50 text-violet-700' },
                { label: 'Research Gaps', value: (backendResult?.modules?.module3?.gaps || []).length, icon: 'ri-radar-line', color: 'bg-rose-50 text-rose-700' },
                { label: 'Trend Topics', value: (backendResult?.modules?.module4?.module4_trends || backendResult?.modules?.module4?.trends || []).length, icon: 'ri-line-chart-line', color: 'bg-indigo-50 text-indigo-700' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.color} rounded-lg p-4 text-center`}>
                  <div className="flex justify-center mb-2 text-xl">
                    <i className={stat.icon} />
                  </div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs mt-1 opacity-75">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
              <p className="text-sm text-teal-800">
                <i className="ri-information-line mr-2" />
                This analysis synthesizes research from {(backendResult?.papersCount ?? 0)} papers to identify key topics, research gaps, and emerging trends in your field.
              </p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Executive Summary</h3>
              {renderMarkdown(visibleSummary)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
