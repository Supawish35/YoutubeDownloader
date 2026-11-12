import React from 'react';
import {
  CheckCheck,
  ListMusic,
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
  showThumbnails?: boolean;
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
  showThumbnails = true,
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
    { key: 'completed', label: 'Done', count: counts.completed },
    { key: 'failed', label: 'Failed', count: counts.failed },
  ];

  const overallPercent =
    items.length > 0
      ? items.reduce((acc, cur) => acc + (cur.status === 'completed' ? 100 : cur.percent), 0) /
        items.length
      : 0;

  return (
    <section
      aria-label="Download queue"
      className="flex min-h-0 flex-1 flex-col bg-[var(--bg-canvas)]"
    >
      {/* Queue Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-5 py-2.5 sm:px-6">
        {/* Filter Tabs */}
        <div
          className="flex items-center gap-1.5"
          role="tablist"
          aria-label="Queue filters"
        >
          {tabs.map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => onFilterChange(tab.key)}
                className={`inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-[0.8125rem] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--bg-panel)] text-[var(--text-primary)] ring-1 ring-[var(--border-strong)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`font-mono-tabular text-xs ${
                    isSelected
                      ? 'text-[var(--accent-text)]'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch Controls & Summary */}
        <div className="flex flex-wrap items-center gap-2">
          {items.length > 0 && (
            <span className="font-mono-tabular mr-1 text-xs text-[var(--text-muted)]">
              {counts.completed}/{items.length}
              {runningCount > 0 && (
                <span className="ml-1.5 text-[var(--accent-text)]">
                  ({overallPercent.toFixed(0)}%)
                </span>
              )}
            </span>
          )}

          {queuedCount > 0 && (
            <button
              type="button"
              onClick={onDownloadAllQueued}
              disabled={!binaryReady}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 text-xs font-medium text-[var(--accent-fg)] transition-colors duration-150 hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <Play className="h-3.5 w-3.5" strokeWidth={2} />
              <span>Start Queued ({queuedCount})</span>
            </button>
          )}

          {counts.completed > 0 && (
            <button
              type="button"
              onClick={onClearCompleted}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent px-3 text-xs font-medium text-[var(--text-secondary)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <CheckCheck className="h-3.5 w-3.5 text-[var(--status-ok)]" strokeWidth={1.75} />
              <span>Clear Done</span>
            </button>
          )}

          {items.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-transparent px-3 text-xs font-medium text-[var(--status-err)] transition-colors duration-150 hover:border-[var(--status-err)]/40 hover:bg-[var(--status-err)]/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Track List or Minimal Empty State */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-3.5 text-[var(--text-muted)]">
            {items.length === 0 ? (
              <ListMusic className="h-8 w-8 opacity-60" strokeWidth={1.5} />
            ) : (
              <ListVideo className="h-8 w-8 opacity-60" strokeWidth={1.5} />
            )}
          </div>

          <h2 className="text-sm font-medium text-[var(--text-primary)]">
            {items.length === 0
              ? 'Queue is idle'
              : `No ${activeFilter} downloads`}
          </h2>

          <p className="mt-1.5 max-w-md text-[0.8125rem] leading-relaxed text-[var(--text-muted)]">
            {items.length === 0 ? (
              <>
                Paste a YouTube URL above. Press{' '}
                <kbd className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-secondary)]">
                  Enter
                </kbd>{' '}
                to download or{' '}
                <kbd className="font-mono-tabular rounded-[var(--radius-sm)] border border-[var(--border-hairline)] bg-[var(--bg-panel)] px-1.5 py-0.5 text-[0.6875rem] text-[var(--text-secondary)]">
                  Shift+Enter
                </kbd>{' '}
                to queue.
              </>
            ) : (
              'Select another filter tab above to view other jobs.'
            )}
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)]">
          {filteredItems.map((item) => (
            <QueueItemCard
              key={item.jobId}
              item={item}
              showThumbnails={showThumbnails}
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
