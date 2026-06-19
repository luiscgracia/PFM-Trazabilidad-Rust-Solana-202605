import { useState, useRef, useEffect } from "react";
import { useS } from "./styles";
import { MUNICIPIOS_COLOMBIA } from "../lib/municipios";

interface LocationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export function LocationSearch({ value, onChange, placeholder = "Buscar municipio...", label }: LocationSearchProps) {
  const S = useS();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setQuery(value); }, [value]);

  // Scroll al elemento resaltado
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[highlighted]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  const handleInput = (q: string) => {
    setQuery(q);
    onChange(q);
    setHighlighted(-1);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    const q_lower = q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const filtered = MUNICIPIOS_COLOMBIA.filter(m => {
      const m_lower = m.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return m_lower.includes(q_lower);
    }).slice(0, 8);
    setResults(filtered);
    setOpen(filtered.length > 0);
  };

  const handleSelect = (municipio: string) => {
    setQuery(municipio);
    onChange(municipio);
    setOpen(false);
    setHighlighted(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted >= 0) handleSelect(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlighted(-1);
    }
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {label && <label style={S.fLabel}>{label}</label>}
      <input
        style={S.fInput}
        value={query}
        onChange={e => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (
        <div ref={listRef} style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: S.modalBox.background as string,
          border: `1px solid ${S.card.border?.toString().split(" ").pop()}`,
          borderRadius: 8, marginTop: 2, maxHeight: 220, overflowY: "auto",
          boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        }}>
          {results.map((m, i) => (
            <div
              key={m}
              data-item
              onClick={() => handleSelect(m)}
              style={{
                padding: "8px 12px", cursor: "pointer", fontSize: 13,
                color: S.fInput.color as string,
                borderBottom: `1px solid ${S.card.border?.toString().split(" ").pop()}`,
                background: i === highlighted ? S.navActive.background as string : "transparent",
              }}
              onMouseEnter={() => setHighlighted(i)}
              onMouseLeave={() => setHighlighted(-1)}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
