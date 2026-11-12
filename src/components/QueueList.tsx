import React from 'react';
import {
  CheckCheck,
  DownloadCloud,
  ListVideo,
  Play,
  Trash2,
} from 'lucide-react';
import { QueueItemCard } from '~components/QueueItemCard';
import type { QueueFilter, QueueItem } from '~types/downloader';

export interface QueueListProps {
  items: QueueItem[];
  activeFilter: QueueFilter;
  onFilterChange: (filter: QueueFilter) => void;
  onStartItem: (jobId: string) => void;
  onCancelItem: (jobId: string) => void;
  onRetryItem: (jobId: string) => void;
  onOpenItemFolder: (item: QueueItem) => void;
  onRemoveItem: (jobId: string) => void;
  onDownloadAllQueued: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  binaryReady: boolean;
}

const isItemActive = (item: QueueItem): boolean =>
  item.status === 'queued' ||
  item.status === 'fetchingMeta' ||
  item.status === 'downloading' ||
  item.status === 'converting';

const isItemFailedOrCancelled = (item: QueueItem): boolean =>
  item.status === 'failed' || item.status === 'cancelled';

export const QueueList: React.FC<QueueListProps> = ({
  items,
  activeFilter,
  onFilterChange,
  onStartItem,
  onCancelItem,
  onRetryItem,
  onOpenItemFolder,
  onRemoveItem,
  onDownloadAllQueued,
  onClearCompleted,
  onClearAll,
  binaryReady,
}) => {
  const counts = {
    all: items.length,
    active: items.filter(isItemActive).length,
    completed: items.filter((item) => item.status === 'completed').length,
    failed: items.filter(isItemFailedOrCancelled).length,
  };

  const queuedCount = items.filter((item) => item.status === 'queued').length;
  const runningCount = items.filter(
    (item) =>
      item.status === 'fetchingMeta' ||
      item.status === 'downloading' ||
      item.status === 'converting'
  ).length;

  const filteredItems = items.filter((item) => {
    if (activeFilter === 'active') return isItemActive(item);
    if (activeFilter === 'completed') return item.status === 'completed';
    if (activeFilter === 'failed') return isItemFailedOrCancelled(item);
    return true;
  });

  const tabs: { key: QueueFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'completed', label: 'Completed', count: counts.completed },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ];

  const overallPercent =
    items.length > 0
      ? items.reduce((acc, cur) => acc + (cur.status === 'completed' ? 100 : cur.percent), 0) /
        items.length
      : 0;

  return (
    <section aria-label="Download queue" className="space-y-3">
      {/* Status & Action Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 shadow-sm dark:border-white/[0.08] dark:bg-[#1E293B] md:flex-row md:items-center md:justify-between">
        {/* Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Queue filters">
          {tabs.map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onFilterChange(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-[#EC4899] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-[#64748B] hover:bg-slate-200/70 hover:text-slate-900 dark:bg-[#0F172A] dark:text-[#94A3B8] dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono-tabular rounded-full px-1.5 py-0.2 text-[11px] ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch Controls & Progress Summary */}
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <div className="font-mono-tabular mr-1 flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-xs text-[#64748B] dark:border-white/[0.08] dark:bg-[#0F172A] dark:text-[#94A3B8]">
              <span>
                {counts.completed}/{items.length} done
              </span>
              {runningCount > 0 && (
                <span className="text-[#2563EB] dark:text-blue-400">
                  • {runningCount} active ({overallPercent.toFixed(0)}%)
                </span>
              )}
            </div>
          )}

          {queuedCount > 0 && (
            <button
              type="button"
              onClick={onDownloadAllQueued}
              disabled={!binaryReady}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#EC4899] px-3 text-xs font-medium text-white transition-colors duration-150 hover:bg-[#DB2777] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Download All Queued ({queuedCount})</span>
            </button>
          )}

          {counts.completed > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-transparent px-3 text-xs font-medium text-slate-700 transition-colors duration-150 hover:bg-[#F8FAFC] cursor-pointer dark:border-white/[0.08] dark:text-slate-200 dark:hover:bg-[#0F172A]"
            >
              <CheckCheck className="h-3.5 w-3.5 text-[#10B981]" strokeWidth={1.75} />
              <span>Clear Completed</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-transparent px-3 text-xs font-medium text-[#DC2626] transition-colors duration-150 hover:border-[#DC2626]/30 hover:bg-[#DC2626]/10 cursor-pointer dark:border-white/[0.08]"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Queue Cards or Empty State */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] bg-[#FFFFFF]/70 px-6 py-14 text-center dark:border-white/[0.12] dark:bg-[#1E293B]/60">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] text-[#EC4899] shadow-sm dark:border-white/[0.08] dark:bg-[#0F172A]">
            {items.length === 0 ? (
              <DownloadCloud className="h-7 w-7" strokeWidth={1.75} />
            ) : (
              <ListVideo className="h-7 w-7 text-[#94A3B8]" strokeWidth={1.75} />
            )}
          </div>

          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            {items.length === 0
              ? 'Your download queue is empty'
              : `No ${activeFilter} downloads`}
          </h2>

          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            {items.length === 0
              ? 'Paste any YouTube video, Shorts, or YouTube Music URL above, pick your preferred audio or MP4 format, and click Download Single or Add to Queue.'
              : 'Switch filter tabs above to inspect other items in your download queue.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
            <QueueItemCard
              key={item.jobId}
              item={item}
              onStart={onStartItem}
              onCancel={onCancelItem}
              onRetry={onRetryItem}
              onOpenFolder={onOpenItemFolder}
              onRemove={onRemoveItem}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default QueueList;
