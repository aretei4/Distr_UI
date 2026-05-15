import React, { useState } from "react";

interface Props {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const CalendarInput: React.FC<Props> = ({ label, value, onChange }) => {
  const [selected, setSelected] = useState("");

  const formatDate = (isoDate: string) => {
    const d = new Date(isoDate);
    const day   = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year  = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{
        fontSize: 11.5, fontWeight: 700, color: "var(--ink-60, #5c6b72)",
        textTransform: "uppercase", letterSpacing: "0.06em",
      }}>{label}</label>
      <input
        type="date"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          onChange(formatDate(e.target.value));
        }}
        style={{
          padding: "9px 12px",
          border: "1.5px solid var(--ink-10, #e8eef0)",
          borderRadius: "var(--radius-md, 10px)",
          fontSize: 13, fontFamily: "'Inter', sans-serif",
          background: "var(--white, #fff)", color: "var(--ink, #0b1215)",
          outline: "none", cursor: "pointer",
        }}
      />
      {value && (
        <span style={{ fontSize: 11, color: "var(--ink-40, #8fa0a8)" }}>
          Selected: {value}
        </span>
      )}
    </div>
  );
};

export default CalendarInput;
