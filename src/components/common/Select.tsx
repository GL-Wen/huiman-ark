'use client';

import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  value,
  options,
  onChange,
  disabled = false,
  className = '',
  ariaLabel,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = options[selectedIndex] ?? options[0];

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxHeight = 256;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const openUpward = spaceBelow < 180 && rect.top > spaceBelow;

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(maxHeight, Math.max(140, openUpward ? rect.top - 12 : spaceBelow)),
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [isOpen, options.length]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !listRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const handleScrollOrResize = (event: Event) => {
      if (listRef.current && event.target instanceof Node && listRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (!isOpen) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % options.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + options.length) % options.length);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options[activeIndex]) {
        onChange(options[activeIndex].value);
      }
      setIsOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-left flex items-center justify-between gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen
            ? 'border-indigo-400 ring-2 ring-indigo-100 text-gray-900'
            : 'border-gray-200 hover:border-gray-300 text-gray-700'
        } focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 ${className}`}
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          aria-labelledby={selectId}
          style={menuStyle}
          className="z-[90] overflow-y-auto rounded-xl border border-gray-200/90 bg-white p-1 shadow-[0_10px_30px_-5px_rgba(15,23,42,0.12),0_4px_10px_-4px_rgba(15,23,42,0.06)]"
        >
          {options.map((option, idx) => {
            const isSelected = option.value === value;
            const isActive = idx === activeIndex;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                  triggerRef.current?.focus();
                }}
                className={`w-full px-2.5 py-1.5 rounded-lg text-sm flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 text-indigo-600 font-medium'
                    : isActive
                      ? 'bg-gray-50 text-gray-900'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
