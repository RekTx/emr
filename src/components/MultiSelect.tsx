'use client';

import { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function MultiSelect({ options, selected, onChange, placeholder = 'Select...', disabled }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  const display = selected.length > 0 ? selected.join(', ') : '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full h-9 px-2.5 text-left text-sm border rounded bg-white flex items-center justify-between gap-1 cursor-pointer
          ${disabled ? 'bg-gray-50 text-text-muted border-border cursor-not-allowed' : 'border-border hover:border-border-dark'}
          ${open ? 'border-primary ring-1 ring-primary/20' : ''}`}
      >
        <span className={`truncate ${selected.length === 0 ? 'text-text-muted' : 'text-text'}`}>
          {display || placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>

      {open && options.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded shadow-lg max-h-48 overflow-y-auto animate-slide-down">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-primary-50 cursor-pointer select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-border-dark accent-primary w-3.5 h-3.5"
              />
              <span className="text-text">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
