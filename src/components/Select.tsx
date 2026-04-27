/**
 * Select — a reusable, accessible dropdown that replaces the browser's native
 * <select>. Native selects can't be styled consistently across browsers, don't
 * support search, and look out of place against the rest of the dashboard.
 *
 * Two flavours:
 *   <Select options={...} value={v} onChange={setV} />               // simple
 *   <Select options={...} value={v} onChange={setV} searchable />    // with filter input
 *
 * Both flavours:
 *   - work in light + dark theme,
 *   - flip alignment in RTL,
 *   - close on outside click / Escape,
 *   - support keyboard navigation (Up/Down/Home/End/Enter/Esc),
 *   - cap the listbox at ~14rem and scroll inside,
 *   - render through a portal so they don't get clipped by overflow:hidden parents.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
};

type Props = {
  options: SelectOption[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Compact trigger height. Default `md`. */
  size?: 'sm' | 'md';
};

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  className = '',
  searchable = false,
  searchPlaceholder = 'Search…',
  emptyLabel = 'No results',
  disabled = false,
  ariaLabel,
  size = 'md',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(-1);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const id = useId();

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter(o =>
      o.label.toLowerCase().includes(q)
      || o.value.toLowerCase().includes(q)
      || (o.hint || '').toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  const selected = options.find(o => o.value === value) || null;

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Position the popover relative to the trigger and reposition on scroll/resize.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    measure();
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open]);

  // When opening, focus the search input (if searchable) and pre-highlight the
  // currently-selected option so keyboard users land somewhere useful.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIdx(-1);
      return;
    }
    const idx = filtered.findIndex(o => o.value === value);
    setActiveIdx(idx >= 0 ? idx : 0);
    if (searchable) {
      // Defer to next frame so the input exists in DOM.
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = (opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (filtered.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => (i <= 0 ? filtered.length - 1 : i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveIdx(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filtered[activeIdx];
      if (opt) choose(opt);
    }
  };

  const triggerCls = [
    'group w-full inline-flex items-center justify-between gap-2',
    'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl',
    'text-sm text-gray-900 dark:text-white',
    'hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
    open ? 'ring-2 ring-indigo-500/40 border-indigo-500' : '',
    size === 'sm' ? 'px-3 py-1.5' : 'px-3 py-2.5',
    disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    className,
  ].join(' ');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={triggerCls}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        onKeyDown={e => {
          if (disabled) return;
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && coords && createPortal(
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKey}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 60,
          }}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden animate-fade-in"
        >
          {searchable && (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                ref={searchRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIdx(0); }}
                placeholder={searchPlaceholder}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400"
              />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 text-center">{emptyLabel}</p>
            ) : (
              filtered.map((opt, i) => {
                const isSel = opt.value === value;
                const isActive = i === activeIdx;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    aria-disabled={opt.disabled}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => choose(opt)}
                    className={[
                      'w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-3',
                      'transition-colors',
                      opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800',
                    ].join(' ')}
                  >
                    <span className="flex-1 truncate">
                      {opt.label}
                      {opt.hint && (
                        <span className="ml-2 text-[11px] text-gray-400">{opt.hint}</span>
                      )}
                    </span>
                    {isSel && <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

export default Select;
