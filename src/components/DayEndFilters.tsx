import { STATUS_OPTIONS } from "../constants/dayEndConstants";
import "../pages/DayEnd.css";

interface Props {
  search:           string;
  onSearchChange:   (v: string) => void;
  statusFilter:     string;
  onStatusChange:   (v: string) => void;
  fromDate:         string;
  onFromDateChange: (v: string) => void;
  toDate:           string;
  onToDateChange:   (v: string) => void;
  onClearDates:     () => void;
}

export default function DayEndFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  fromDate, onFromDateChange,
  toDate, onToDateChange,
  onClearDates,
}: Props) {
  return (
    <div className="dayend-filters">
      <input
        className="dayend-filters__search"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search name..."
      />

      <div className="dayend-filters__row">
        <select
          className="dayend-filters__select"
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="dayend-filters__date-group">
          <span className="dayend-filters__date-label">From</span>
          <input
            type="date"
            className="dayend-filters__date-input"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
          />
          <span className="dayend-filters__date-label">To</span>
          <input
            type="date"
            className="dayend-filters__date-input"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
          />
          {(fromDate || toDate) && (
            <button className="dayend-filters__clear-btn" onClick={onClearDates}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
