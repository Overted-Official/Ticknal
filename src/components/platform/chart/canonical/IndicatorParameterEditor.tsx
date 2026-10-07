'use client';

import { useState } from 'react';
import type { IndicatorParameterDefinition } from '@ticknal/quant-engine/canonical';

interface IndicatorParameterEditorProps {
  readonly schema: IndicatorParameterDefinition;
  readonly value: unknown;
  readonly locale: 'en' | 'ar';
  readonly onChange: (value: unknown) => void;
}

export default function IndicatorParameterEditor({ schema, value, locale, onChange }: IndicatorParameterEditorProps) {
  const [draft, setDraft] = useState(String(value ?? schema.defaultValue));
  const [error, setError] = useState<string | null>(null);
  const label = schema.label[locale];

  if (schema.kind === 'integer' || schema.kind === 'number') {
    const commit = () => {
      const parsed = Number(draft);
      const validNumber = schema.kind === 'integer' ? Number.isInteger(parsed) : Number.isFinite(parsed);
      if (!validNumber || parsed < schema.min || parsed > schema.max) {
        setError(locale === 'ar' ? `أدخل رقماً من ${schema.min} إلى ${schema.max}` : `Enter ${schema.min}–${schema.max}`);
        return;
      }
      setError(null);
      onChange(parsed);
    };
    return (
      <label className="block text-[10px] text-white/55">
        <span>{label}</span>
        <input type="number" min={schema.min} max={schema.max} step={schema.step} value={draft}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          className="mt-1 h-7 w-full rounded-none border border-white/10 bg-black px-2 font-sans tabular-nums text-white outline-none focus:border-white/30" />
        {error && <span className="mt-1 block text-[#f23645]">{error}</span>}
      </label>
    );
  }

  if (schema.kind === 'select') {
    return (
      <label className="block text-[10px] text-white/55">
        <span>{label}</span>
        <select value={String(value ?? schema.defaultValue)} onChange={(event) => onChange(event.target.value)}
          className="mt-1 h-7 w-full rounded-none border border-white/10 bg-black px-2 font-sans text-white outline-none focus:border-white/30">
          {schema.options.map((option) => <option key={option.value} value={option.value}>{option.label[locale]}</option>)}
        </select>
      </label>
    );
  }

  if (schema.kind === 'symbol' || schema.kind === 'text') {
    const commit = () => {
      const next = draft.trim();
      if (!next) {
        setError(locale === 'ar' ? 'هذه القيمة مطلوبة' : 'This value is required.');
        return;
      }
      setError(null);
      onChange(schema.kind === 'symbol' ? next.toUpperCase() : next);
    };
    return (
      <label className="block text-[10px] text-white/55">
        <span>{label}</span>
        <input type="text" value={draft}
          placeholder={schema.placeholder?.[locale]}
          onChange={(event) => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
          className="mt-1 h-7 w-full rounded-none border border-white/10 bg-black px-2 font-sans text-white outline-none focus:border-white/30" />
        {error && <span className="mt-1 block text-[#f23645]">{error}</span>}
      </label>
    );
  }

  const current = String(value ?? schema.defaultValue);
  return (
    <label className="block text-[10px] text-white/55">
      <span>{label}</span>
      <div className="mt-1 grid grid-cols-[auto_1fr] gap-1">
        <button type="button" onClick={() => { setDraft('first-observation'); setError(null); onChange('first-observation'); }}
          className={`h-7 rounded-none border px-2 ${current === 'first-observation' ? 'border-white bg-white text-black' : 'border-white/10 bg-black text-white/60'}`}>
          {locale === 'ar' ? 'أول مشاهدة' : 'First observation'}
        </button>
        <input type="date" value={draft === 'first-observation' ? '' : draft.slice(0, 10)}
          onChange={(event) => { setDraft(event.target.value); setError(null); if (event.target.value) onChange(event.target.value); }}
          className="h-7 rounded-none border border-white/10 bg-black px-2 font-sans tabular-nums text-white outline-none focus:border-white/30" />
      </div>
      {error && <span className="mt-1 block text-[#f23645]">{error}</span>}
    </label>
  );
}
