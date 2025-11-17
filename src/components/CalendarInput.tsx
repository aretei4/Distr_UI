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
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div>
      <label>{label}</label>
      <br />
      <input
        type="date"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          onChange(formatDate(e.target.value)); // return dd/MM/yyyy
        }}
      />
      <div style={{ marginTop: 4, fontSize: 12, color: "gray" }}>
        {value && `Selected: ${value}`}
      </div>
    </div>
  );
};

export default CalendarInput;
