import { useState } from 'react';
import { useSnapshots, type Snapshot } from '../../../hooks/useSnapshots';

interface SnapshotsPanelProps {
  open: boolean;
  onClose: () => void;
  onRestore?: (snap: Snapshot) => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function SnapshotsPanel({ open, onClose, onRestore }: SnapshotsPanelProps) {
  const { snapshots, removeSnapshot, clearAll } = useSnapshots();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white z-50 flex flex-col transition-transform duration-300 border-l border-gray-100 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ boxShadow: '-4px 0 24px rgba(0,0,0,0.07)' }}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <i className="ri-bookmark-3-line text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Snapshots</p>
              <p className="text-[10px] text-gray-400">{snapshots.length} saved</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="whitespace-nowrap w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 cursor-pointer"
          >
            <i className="ri-close-line text-sm" />
          </button>
        </div>

        {/* Info bar */}
        <div className="px-5 py-3 bg-violet-50 border-b border-violet-100 text-[11px] text-violet-700 flex items-start gap-2">
          <i className="ri-information-line flex-shrink-0 mt-0.5" />
          <span>Snapshots save your analysis state so you can revisit it anytime. They persist across sessions.</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-50 text-gray-300 mb-3">
                <i className="ri-bookmark-3-line text-2xl" />
              </div>
              <p className="text-sm font-medium text-gray-500">No snapshots yet</p>
              <p className="text-xs text-gray-400 mt-1">Use &ldquo;Save Snapshot&rdquo; on the Results page to bookmark your analysis.</p>
            </div>
          ) : (
            snapshots.map(snap => (
              <div key={snap.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-violet-200 transition-colors group">
                {/* Name & time */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{snap.name}</p>
                    <p className="text-[10px] text-gray-400">{timeAgo(snap.timestamp)} &middot; {new Date(snap.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => removeSnapshot(snap.id)}
                    className="whitespace-nowrap w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex-shrink-0"
                  >
                    <i className="ri-delete-bin-line text-xs" />
                  </button>
                </div>

                {/* Stats pills */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    { icon: 'ri-file-text-line', label: `${snap.stats.papers} papers`, color: 'bg-slate-50 text-slate-600' },
                    { icon: 'ri-price-tag-3-line', label: `${snap.stats.topics} topics`, color: 'bg-teal-50 text-teal-700' },
                    { icon: 'ri-radar-line', label: `${snap.stats.gaps} gaps`, color: 'bg-rose-50 text-rose-600' },
                    { icon: 'ri-calendar-line', label: `${snap.stats.yearRange.start}–${snap.stats.yearRange.end}`, color: 'bg-amber-50 text-amber-700' },
                  ].map(pill => (
                    <span key={pill.label} className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${pill.color}`}>
                      <i className={`${pill.icon} text-[9px]`} />
                      {pill.label}
                    </span>
                  ))}
                </div>

                {snap.notes && (
                  <p className="text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3 italic">&ldquo;{snap.notes}&rdquo;</p>
                )}

                {/* Restore button */}
                {onRestore && (
                  <button
                    onClick={() => onRestore(snap)}
                    className="whitespace-nowrap w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors cursor-pointer"
                  >
                    <i className="ri-refresh-line text-xs" />
                    Restore View
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {snapshots.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            {confirmClear ? (
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-600 flex-1">Delete all snapshots?</p>
                <button
                  onClick={() => { clearAll(); setConfirmClear(false); }}
                  className="whitespace-nowrap text-xs font-semibold text-white bg-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-600 transition-colors cursor-pointer"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="whitespace-nowrap text-xs font-medium text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmClear(true)}
                className="whitespace-nowrap w-full text-xs font-medium text-gray-400 hover:text-rose-500 py-1.5 transition-colors cursor-pointer"
              >
                Clear all snapshots
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
