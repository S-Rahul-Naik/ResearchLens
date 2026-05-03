import { useState, useEffect } from 'react';
import { getExportHistory, clearExportHistory, type ExportRecord } from '../../../hooks/useExportHistory';

interface Props {
  open: boolean;
  onClose: () => void;
}

const typeColors: Record<ExportRecord['type'], { bg: string; text: string; icon: string }> = {
  JSON: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'ri-braces-line' },
  PDF: { bg: 'bg-rose-50', text: 'text-rose-600', icon: 'ri-file-pdf-2-line' },
  CSV: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'ri-table-line' },
};

const sectionIcons: Record<string, string> = {
  'Gap Detection': 'ri-radar-line',
  'Datasets': 'ri-database-2-line',
  'Topics': 'ri-price-tag-3-line',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ExportHistoryPanel({ open, onClose }: Props) {
  const [history, setHistory] = useState<ExportRecord[]>([]);
  const [filterType, setFilterType] = useState<'all' | ExportRecord['type']>('all');

  useEffect(() => {
    if (open) setHistory(getExportHistory());
  }, [open]);

  const handleClear = () => {
    clearExportHistory();
    setHistory([]);
  };

  const filtered = filterType === 'all' ? history : history.filter(r => r.type === filterType);

  const totalExports = history.length;
  const totalItems = history.reduce((s, r) => s + r.itemCount, 0);

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
        />
      )}

      {/* Slide-in Panel */}
      <div
        className="fixed top-0 right-0 h-full w-96 bg-white z-50 flex flex-col"
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: open ? '-4px 0 32px rgba(0,0,0,0.10)' : 'none',
        }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <i className="ri-history-line text-base" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Export History</h3>
              <p className="text-xs text-gray-400">{totalExports} export{totalExports !== 1 ? 's' : ''} · {totalItems} items total</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <i className="ri-close-line text-base" />
          </button>
        </div>

        {/* Summary Stats */}
        <div className="px-5 py-3 border-b border-gray-100 flex gap-3 flex-shrink-0">
          {(['JSON', 'PDF', 'CSV'] as ExportRecord['type'][]).map(t => {
            const count = history.filter(r => r.type === t).length;
            const cfg = typeColors[t];
            return (
              <button
                key={t}
                onClick={() => setFilterType(filterType === t ? 'all' : t)}
                className={`flex-1 flex flex-col items-center py-2 rounded-xl border transition-all cursor-pointer ${
                  filterType === t
                    ? `${cfg.bg} border-current ${cfg.text}`
                    : 'border-gray-100 hover:border-gray-200 text-gray-600'
                }`}
              >
                <div className={`w-6 h-6 flex items-center justify-center ${filterType === t ? cfg.text : 'text-gray-400'}`}>
                  <i className={`${cfg.icon} text-sm`} />
                </div>
                <span className="text-[11px] font-semibold mt-0.5">{count}</span>
                <span className="text-[10px] text-gray-400">{t}</span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="ri-history-line text-3xl block mb-3 text-gray-200" />
              <p className="text-sm font-medium text-gray-500">No exports yet</p>
              <p className="text-xs mt-1">
                {filterType !== 'all'
                  ? `No ${filterType} exports found`
                  : 'Exports from Gap Detection and Datasets will appear here'}
              </p>
            </div>
          ) : (
            filtered.map((record, idx) => {
              const cfg = typeColors[record.type];
              const sectionIcon = sectionIcons[record.section] ?? 'ri-file-line';
              return (
                <div
                  key={record.id}
                  className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:bg-gray-50 transition-colors"
                  style={{ animation: `fadeInUp 0.2s ease both ${idx * 0.03}s` }}
                >
                  <div className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${cfg.bg} ${cfg.text}`}>
                    <i className={`${cfg.icon} text-sm`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 truncate">{record.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                        {record.type}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <i className={`${sectionIcon} text-[10px]`} />
                        {record.section}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {record.itemCount} item{record.itemCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 pt-0.5">
                    {relativeTime(record.timestamp)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-gray-400">Last 100 exports stored locally</span>
            <button
              onClick={handleClear}
              className="whitespace-nowrap text-xs text-rose-500 hover:text-rose-700 cursor-pointer flex items-center gap-1 transition-colors"
            >
              <i className="ri-delete-bin-line" />
              Clear all
            </button>
          </div>
        )}
      </div>
    </>
  );
}
