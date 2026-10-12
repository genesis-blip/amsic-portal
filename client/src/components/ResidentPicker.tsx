import { useEffect, useId, useState } from 'react';
import { residentsApi } from '../api/residents';
import { useDebounce } from '../hooks/useDebounce';
import type { Resident } from '../types';

interface ResidentPickerProps {
  value: string;
  onChange: (id: string, resident?: Resident) => void;
  error?: string;
  id: string;
  initialLabel?: string;
}

export function ResidentPicker({ value, onChange, error, id, initialLabel = '' }: ResidentPickerProps) {
  const [text, setText] = useState(initialLabel);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounce(text, 250);
  const listId = useId();

  useEffect(() => { setText(initialLabel); }, [initialLabel]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    residentsApi
      .list({ search: debounced, limit: 8, sort: 'lastName' })
      .then((r) => { if (alive) setOptions(r.items); })
      .catch(() => { if (alive) setOptions([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [debounced, open]);

  return (
    <div className="relative">
      <input
        id={id}
        className={`input ${error ? 'input-error' : ''}`}
        placeholder="Search name or resident no."
        value={text}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (value) onChange('');
        }}
      />
      {open && (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-control border border-paper-line bg-white py-1 shadow-lift">
          {loading && <li className="px-3 py-2 text-sm text-ink-muted">Searching…</li>}
          {!loading && options.length === 0 && <li className="px-3 py-2 text-sm text-ink-muted">No resident matches “{text}”.</li>}
          {!loading && options.map((r) => (
            <li key={r._id}>
              <button
                type="button"
                role="option"
                aria-selected={r._id === value}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-brand-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { setText(`${r.fullName} (${r.residentNo})`); onChange(r._id, r); setOpen(false); }}
              >
                <span className="font-bold">{r.fullName}</span>
                <span className="shrink-0 text-right text-ink-muted">{r.residentNo}<br />{r.purok}{r.isSenior ? ', senior' : ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
