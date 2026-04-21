import { STATUS_CONFIG } from "../constants/dayEndConstants";
import type { DayEndRecord } from "../pages/types";
import "../pages/DayEnd.css";

interface Props {
  data: DayEndRecord[];
}

export default function DayEndSummary({ data }: Props) {
  return (
    <div className="dayend-summary">
      {Object.keys(STATUS_CONFIG).map((s) => {
        const count = data.filter((r) => r.status === s).length;
        const cfg   = STATUS_CONFIG[s];
        return (
          <div
            key={s}
            className="dayend-summary__card"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
          >
            <span className="dayend-summary__count" style={{ color: cfg.color }}>
              {count}
            </span>
            <span className="dayend-summary__label" style={{ color: cfg.color }}>
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}
