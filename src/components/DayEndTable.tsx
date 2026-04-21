import StatusBadge from "./StatusBadge";
import { TABLE_HEADERS } from "../constants/dayEndConstants";
import type { DayEndRecord } from "../pages/types";
import "../pages/DayEnd.css";
 
interface Props {
  rows:          DayEndRecord[];
  loading:       boolean;
  actionLoading: Record<string, boolean>;
  onApprove:     (dayendId: number) => void;
  onReject:      (record: DayEndRecord) => void;
}

export default function DayEndTable({
  rows,
  loading,
  actionLoading,
  onApprove,
  onReject,
}: Props) {
  return (
    <div className="dayend-table">
      {/* Header */}
      <div className="dayend-table__header">
        {TABLE_HEADERS.map((h) => (
          <div key={h} className="dayend-table__header-cell">
            {h}
          </div>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="dayend-table__state">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="dayend-table__state">No records found</div>
      ) : (
        rows.map((row) => (
          <div key={row.dayendId} className="dayend-table__row">
            <div className="dayend-table__cell--name">{row.deliveryBoyName}</div>

            <div className="dayend-table__cell--date">{row.requestDate}</div>

            <div>
              <StatusBadge status={row.status} />
            </div>

            <div className="dayend-table__cell--amount">
              ₹{row.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>

            <div
              className="dayend-table__cell--reason"
              title={row.rejectReason ?? ""}
            >
              {row.rejectReason ?? "—"}
            </div>

            <div>
              {row.status === "PENDING" ? (
                <div className="dayend-actions">
                  <button
                    className="dayend-actions__btn dayend-actions__btn--approve"
                    onClick={() => onApprove(row.dayendId)}
                    disabled={actionLoading[`approve_${row.dayendId}`]}
                  >
                    ✓ Approve
                  </button>
                  <button
                    className="dayend-actions__btn dayend-actions__btn--reject"
                    onClick={() => onReject(row)}
                  >
                    ✕ Reject
                  </button>
                </div>
              ) : (
                <div className="dayend-actions__settled">
                  {row.status === "APPROVED" ? "✓ Approved" : "✕ Rejected"}
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
