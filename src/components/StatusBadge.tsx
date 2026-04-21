import { STATUS_CONFIG } from "../constants/dayEndConstants";
import type { DayEndRecord } from "../pages/types";
import "../pages/DayEnd.css";

interface Props {
  status: DayEndRecord["status"];
}

export default function StatusBadge({ status }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;

  return (
    <span
      className="dayend-badge"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {cfg.label}
    </span>
  );
}
