import React, { useRef } from "react";

interface Props {
  label: string;
  value: string;          // dd/MM/yyyy
  onChange: (value: string) => void;
}

// dd/MM/yyyy → yyyy-MM-dd  (HTML input[type=date] internal value)
const toISO = (dmy: string): string => {
  if (!dmy || dmy.length !== 10) return "";
  const [dd, mm, yyyy] = dmy.split("/");
  if (!dd || !mm || !yyyy) return "";
  return `${yyyy}-${mm}-${dd}`;
};

// yyyy-MM-dd → dd/MM/yyyy
const toDMY = (iso: string): string => {
  if (!iso || iso.length !== 10) return "";
  const [yyyy, mm, dd] = iso.split("-");
  if (!dd || !mm || !yyyy) return "";
  return `${dd}/${mm}/${yyyy}`;
};

const CalendarInput: React.FC<Props> = ({ label, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{
        fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </label>

      {/* Wrapper: shows dd-MM-yyyy text, clicking opens the hidden date picker */}
      <div
        style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
        onClick={() => inputRef.current?.showPicker?.()}
      >
        {/* Visible styled box showing dd-MM-yyyy */}
        <div style={{
          padding: "9px 36px 9px 12px",
          border: "1.5px solid var(--ink-10)",
          borderRadius: "var(--radius-md)",
          fontSize: 13, fontFamily: "'Inter', sans-serif",
          background: "var(--white)", color: value ? "var(--ink)" : "var(--ink-40)",
          cursor: "pointer", minWidth: 130, userSelect: "none",
        }}>
          {value || "dd/MM/yyyy"}
        </div>

        {/* Calendar icon */}
        <svg
          style={{ position: "absolute", right: 10, pointerEvents: "none", color: "var(--ink-40)" }}
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>

        {/* Hidden native date input — positioned over the visible box */}
        <input
          ref={inputRef}
          type="date"
          value={toISO(value)}
          onChange={e => onChange(toDMY(e.target.value))}
          style={{
            position: "absolute", inset: 0, opacity: 0,
            cursor: "pointer", width: "100%",
          }}
        />
      </div>
    </div>
  );
};

export default CalendarInput;
