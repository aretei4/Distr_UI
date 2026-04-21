import { useState } from "react";
import type { DayEndRecord } from "../pages/types";
import "../pages/DayEnd.css";

interface Props {
  record:    DayEndRecord;
  onClose:   () => void;
  onConfirm: (dto: DayEndDto) => Promise<void>;
}

export default function RejectModal({ record, onClose, onConfirm }: Props) {
  const [reason,  setReason]  = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleConfirm = async (): Promise<void> => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm({
      dayendId:     record.dayendId,
      deliveryId:   record.deliveryId,
      date:         record.deliveryDate,
      totalAmount:  record.totalAmount,
      rejectReason: reason,
    });
    setLoading(false);
  };

  return (
    <div className="dayend-modal-overlay" onClick={onClose}>
      <div className="dayend-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="dayend-modal__title">Reject Request</h2>
        <p className="dayend-modal__subtitle">
          Provide a reason for rejecting{" "}
          <strong>{record.deliveryBoyName}</strong>'s day-end request.
        </p>

        <textarea
          className="dayend-modal__textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Enter rejection reason..."
        />

        <div className="dayend-modal__footer">
          <button className="dayend-modal__cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="dayend-modal__confirm-btn"
            onClick={handleConfirm}
            disabled={!reason.trim() || loading}
          >
            {loading ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
