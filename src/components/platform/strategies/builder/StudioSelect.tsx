'use client';

import { Children, isValidElement, useCallback, useEffect, useId, useRef, useState, type OptionHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Check, ChevronDown } from '@/components/ui/icon-library';

interface StudioSelectProps {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly children: ReactNode;
  readonly className?: string;
  readonly ariaLabel?: string;
}

interface SelectOption {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
}

function readOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<OptionHTMLAttributes<HTMLOptionElement>>(child) || child.type !== 'option') return [];
    const label = child.props.label ?? child.props.children;
    return [{ value: String(child.props.value ?? ''), label: typeof label === 'string' || typeof label === 'number' ? String(label) : '', disabled: Boolean(child.props.disabled) }];
  });
}

export function shouldStopStudioSelectKeyPropagation(key: string): boolean {
  return key !== 'Tab';
}

export default function StudioSelect({ value, onValueChange, children, className = '', ariaLabel }: StudioSelectProps) {
  const options = readOptions(children);
  const selected = options.find((option) => option.value === value);
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 200, maxHeight: 240 });

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(Math.max(rect.width, 200), window.innerWidth - 16);
    const availableBelow = window.innerHeight - rect.bottom - 12;
    const above = availableBelow < 180 && rect.top > availableBelow;
    const maxHeight = Math.min(240, Math.max(100, above ? rect.top - 16 : availableBelow));
    setPosition({
      top: above ? Math.max(8, rect.top - maxHeight - 6) : rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
      maxHeight,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    menuRef.current?.focus();
    const onOutsidePointer = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node) || menuRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };
    const onScrollOrResize = () => updatePosition();
    document.addEventListener('pointerdown', onOutsidePointer);
    document.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', onOutsidePointer);
      document.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, updatePosition]);

  const openMenu = () => {
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    updatePosition();
    setOpen(true);
  };
  const choose = (option: SelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };
  const move = (direction: number) => {
    if (!options.length) return;
    let next = activeIndex;
    for (let step = 0; step < options.length; step += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    setActiveIndex(next);
  };

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-controls={open ? listId : undefined}
      aria-expanded={open}
      onClick={() => open ? setOpen(false) : openMenu()}
      onKeyDown={(event) => {
        if (shouldStopStudioSelectKeyPropagation(event.key)) event.stopPropagation();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (!open) openMenu(); else move(event.key === 'ArrowDown' ? 1 : -1);
        }
      }}
      className={`strategy-studio-select flex min-h-10 w-full items-center justify-between gap-2 rounded-lg border border-white/15 bg-black px-3 text-start font-sans text-xs font-medium text-white transition-colors hover:border-white/30 focus-visible:border-brand-blue focus-visible:outline-none ${className}`}
    >
      <span className="min-w-0 truncate">{selected?.label ?? options[0]?.label ?? ''}</span>
      <ChevronDown size={14} className={`shrink-0 text-white/45 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
    </button>
    {open && createPortal(
      <div
        ref={menuRef}
        id={listId}
        role="listbox"
        aria-label={ariaLabel ?? selected?.label}
        aria-activedescendant={`${listId}-${activeIndex}`}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (shouldStopStudioSelectKeyPropagation(event.key)) event.stopPropagation();
          if (event.key === 'Escape' || event.key === 'Tab') {
            setOpen(false);
            if (event.key === 'Escape') event.preventDefault();
            triggerRef.current?.focus();
          } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            move(event.key === 'ArrowDown' ? 1 : -1);
          } else if (event.key === 'Home' || event.key === 'End') {
            event.preventDefault();
            const index = event.key === 'Home' ? options.findIndex((option) => !option.disabled) : options.findLastIndex((option) => !option.disabled);
            if (index >= 0) setActiveIndex(index);
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (options[activeIndex]) choose(options[activeIndex]);
          }
        }}
        className="overflow-y-auto rounded-lg border border-white/15 bg-[#3D3D3D] p-1.5 font-sans shadow-2xl outline-none"
        style={{ position: 'fixed', zIndex: 1000, ...position }}
      >
        {options.map((option, index) => <div
          key={`${option.value}-${index}`}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={value === option.value}
          aria-disabled={option.disabled || undefined}
          onPointerMove={() => !option.disabled && setActiveIndex(index)}
          onClick={(event) => { event.stopPropagation(); choose(option); }}
          className={`flex min-h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-1.5 font-sans text-xs font-medium ${option.disabled ? 'cursor-not-allowed text-white/35' : activeIndex === index ? 'bg-white/15 text-white' : 'text-white/80 hover:bg-white/10'} `}
        >
          <span>{option.label}</span>
          {value === option.value && <Check size={13} className="shrink-0 text-brand-blue" aria-hidden="true" />}
        </div>)}
      </div>, document.body,
    )}
  </>;
}
