/**
 * Select — custom styled dropdown replacing all native <select> elements.
 *
 * Features:
 *  - Dark glassmorphism panel matching design system
 *  - Smooth scale/fade animation (CSS transition)
 *  - Click-outside to close
 *  - Keyboard nav: ArrowUp / ArrowDown / Enter / Escape / Tab
 *  - Optional icons and descriptions per option
 *  - Accessible: role="combobox", aria-expanded, aria-activedescendant
 */
import React, { useRef, useState, useEffect, useCallback, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  /** Small secondary text shown below the label */
  description?: string;
  /** Lucide icon or any React node placed before the label */
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  /** Renders options as a grid (2-col) instead of a list */
  grid?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  label,
  id: externalId,
  disabled = false,
  className = '',
  grid = false,
}) => {
  const autoId = useId();
  const id = externalId ?? autoId;
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find(o => o.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const el = listRef.current?.children[focusedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex, open]);

  const selectOption = useCallback((opt: SelectOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    setFocusedIndex(-1);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const enabledIndexes = options
      .map((o, i) => (!o.disabled ? i : -1))
      .filter(i => i >= 0);

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!open) {
          setOpen(true);
          setFocusedIndex(enabledIndexes[0] ?? 0);
        } else if (focusedIndex >= 0) {
          selectOption(options[focusedIndex]);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!open) { setOpen(true); setFocusedIndex(enabledIndexes[0] ?? 0); break; }
        setFocusedIndex(prev => {
          const idx = enabledIndexes.indexOf(prev);
          return enabledIndexes[Math.min(idx + 1, enabledIndexes.length - 1)] ?? prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const idx = enabledIndexes.indexOf(prev);
          return enabledIndexes[Math.max(idx - 1, 0)] ?? prev;
        });
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        setFocusedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Trigger button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={focusedIndex >= 0 ? `${id}-opt-${focusedIndex}` : undefined}
        onClick={() => {
          if (!disabled) {
            setOpen(v => !v);
            setFocusedIndex(open ? -1 : (options.findIndex(o => o.value === value)));
          }
        }}
        onKeyDown={handleKeyDown}
        className={[
          'flex w-full items-center justify-between gap-2',
          'rounded-xl border px-4 py-3 text-sm transition-all outline-none',
          'bg-white/[0.04] text-left',
          disabled
            ? 'cursor-not-allowed border-white/[0.06] text-[#4B5563]'
            : open
              ? 'border-[#4F7CFF]/60 bg-white/[0.06] text-[#F4F5F7]'
              : 'border-white/[0.10] text-[#F4F5F7] hover:border-white/[0.18] hover:bg-white/[0.06]',
          'focus-visible:border-[#4F7CFF]/60 focus-visible:ring-2 focus-visible:ring-[#4F7CFF]/20',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 min-w-0">
          {selected?.icon && (
            <span className="shrink-0 text-[#9CA3AF]">{selected.icon}</span>
          )}
          <span className={['truncate', !selected ? 'text-[#4B5563]' : ''].join(' ')}>
            {selected?.label ?? placeholder}
          </span>
        </span>
        <ChevronDown
          size={15}
          className={[
            'shrink-0 text-[#6B7280] transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={[
          'absolute left-0 right-0 z-50 mt-1.5',
          'rounded-xl border border-white/[0.12] bg-[#1A1C21]',
          'shadow-2xl shadow-black/60 backdrop-blur-xl',
          'overflow-hidden',
          'transition-all duration-150 origin-top',
          open
            ? 'opacity-100 scale-y-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-y-95 -translate-y-1 pointer-events-none',
        ].join(' ')}
        style={{ minWidth: '100%' }}
      >
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label ?? placeholder}
          className={[
            'py-1.5 max-h-64 overflow-y-auto',
            grid ? 'grid grid-cols-2 gap-1 p-2' : '',
          ].join(' ')}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isFocused = i === focusedIndex;

            return (
              <li
                key={opt.value}
                id={`${id}-opt-${i}`}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onMouseEnter={() => !opt.disabled && setFocusedIndex(i)}
                onMouseLeave={() => setFocusedIndex(-1)}
                onClick={() => selectOption(opt)}
                className={[
                  'flex items-center gap-3 cursor-pointer select-none transition-colors duration-100',
                  grid ? 'flex-col items-start rounded-xl p-3 border' : 'px-3 py-2.5 rounded-lg mx-1',
                  opt.disabled ? 'cursor-not-allowed opacity-40' : '',
                  isFocused && !opt.disabled
                    ? 'bg-white/[0.07]'
                    : '',
                  isSelected && grid
                    ? 'border-[#4F7CFF]/40 bg-[#4F7CFF]/10 text-[#F4F5F7]'
                    : grid
                      ? 'border-white/[0.07] bg-white/[0.03] text-[#9CA3AF]'
                      : '',
                ].join(' ')}
              >
                {/* Icon */}
                {opt.icon && (
                  <span className={['shrink-0', isSelected ? 'text-[#4F7CFF]' : 'text-[#6B7280]'].join(' ')}>
                    {opt.icon}
                  </span>
                )}

                {/* Label + description */}
                <span className="flex-1 min-w-0">
                  <span className={[
                    'block text-sm font-medium truncate',
                    isSelected ? 'text-[#F4F5F7]' : 'text-[#D1D5DB]',
                  ].join(' ')}>
                    {opt.label}
                  </span>
                  {opt.description && (
                    <span className="block text-[11px] text-[#6B7280] mt-0.5 leading-tight">
                      {opt.description}
                    </span>
                  )}
                </span>

                {/* Check mark — list mode only */}
                {!grid && (
                  <Check
                    size={14}
                    className={[
                      'shrink-0 transition-opacity',
                      isSelected ? 'text-[#4F7CFF] opacity-100' : 'opacity-0',
                    ].join(' ')}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
