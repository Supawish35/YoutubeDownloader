import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { FormatOption } from '@/lib/mediaFormats';

export interface PrecisionSelectProps<T extends string> {
  value: T;
  options: FormatOption<T>[];
  onChange: (value: T) => void;
  ariaLabel: string;
  prefix?: string;
  triggerClassName?: string;
  menuClassName?: string;
  align?: 'left' | 'right';
}

/**
 * Custom Precision dropdown popover adhering to DESIGN.md tokens with keyboard & outside-click support.
 */
export function PrecisionSelect<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  prefix,
  triggerClassName = '',
  menuClassName = 'min-w-[14.5rem]',
  align = 'left',
}: PrecisionSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value) ?? options[0];

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const idx = options.findIndex((o) => o.value === value);
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = (idx + delta + options.length) % options.length;
        onChange(options[nextIdx].value);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, options, value, onChange]);

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex h-9 items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border-hairline)] bg-[var(--bg-inset)] px-3 text-xs transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
          open ? 'border-[var(--accent)] text-[var(--text-primary)]' : 'text-[var(--text-primary)]'
        } ${triggerClassName}`}
      >
        <span className="flex items-center gap-1.5">
          {prefix && (
            <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--text-muted)]">
              {prefix}
            </span>
          )}
          <span className="font-mono-tabular font-semibold tracking-wide text-[var(--accent-text)]">
            {selected.badge}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-[var(--text-muted)] transition-transform duration-150 ${
            open ? 'rotate-180 text-[var(--accent-text)]' : ''
          }`}
          strokeWidth={1.75}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute top-[calc(100%+0.375rem)] z-40 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-panel)] p-1 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${menuClassName}`}
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--accent)] cursor-pointer ${
                  active
                    ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`font-mono-tabular inline-flex min-w-[3.25rem] items-center justify-center rounded-[var(--radius-sm)] border px-1.5 py-0.5 text-[0.6875rem] font-semibold tracking-wide ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-inset)] text-[var(--text-primary)]'
                    }`}
                  >
                    {opt.badge}
                  </span>
                  <span className="truncate text-xs text-[var(--text-secondary)]">
                    {opt.hint}
                  </span>
                </div>
                {active && (
                  <Check
                    className="h-3.5 w-3.5 shrink-0 text-[var(--accent-text)]"
                    strokeWidth={2.25}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PrecisionSelect;
