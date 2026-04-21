import { useState, useEffect, useCallback } from "react";

import "./DayEnd";
import type { DayEndRecord, ToastState } from "./types";
import { fetchDayEndSummary, approveDayEnd, rejectDayEnd } from "../services/dayEndService";
import DayEndFilters from "../components/DayEndFilters";
import DayEndTable   from "../components/DayEndTable";
import DayEndSummary from "../components/DayEndSummary";
import RejectModal   from "../components/RejectModal";

export default function DayEnd() {
  const [data,          setData]          = useState<DayEndRecord[]>([]);
  const [loading,       setLoading]       = useState<boolean>(false);
  const [search,        setSearch]        = useState<string>("");
  const [statusFilter,  setStatusFilter]  = useState<string>("ALL");
  const [fromDate,      setFromDate]      = useState<string>("");
  const [toDate,        setToDate]        = useState<string>("");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toast,         setToast]         = useState<ToastState | null>(null);
  const [rejectModal,   setRejectModal]   = useState<DayEndRecord | null>(null);

  // ── Toast helper ──────────────────────────
  const showToast = (message: string, type: ToastState["type"] = "success"): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch ─────────────────────────────────
  const loadData = useCallback(async (): Promise<void> => {
    setLoading(true);
    const result = await fetchDayEndSummary();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Approve ───────────────────────────────
  const handleApprove = async (dayendId: number): Promise<void> => {
    setActionLoading((p) => ({ ...p, [`approve_${dayendId}`]: true }));
    try {
      await approveDayEnd(dayendId);
      setData((prev) =>
        prev.map((r) => (r.dayendId === dayendId ? { ...r, status: "APPROVED" as const } : r))
      );
      showToast("Request approved successfully", "success");
    } catch {
      showToast("Failed to approve request", "error");
    } finally {
      setActionLoading((p) => ({ ...p, [`approve_${dayendId}`]: false }));
    }
  };

  // ── Reject ────────────────────────────────
  const handleReject = async (dayendId: number, reason: string): Promise<void> => {
    try {
      await rejectDayEnd(dayendId, reason);
      setData((prev) =>
        prev.map((r) =>
          r.dayendId === dayendId
            ? { ...r, status: "REJECTED" as const, rejectReason: reason }
            : r
        )
      );
      setRejectModal(null);
      showToast("Request rejected", "error");
    } catch {
      showToast("Failed to reject request", "error");
    }
  };

  // ── Filter logic ──────────────────────────
  const filtered = data.filter((r) => {
    const nameMatch   = r.deliveryBoyName?.toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === "ALL" || r.status === statusFilter;
    let   dateMatch   = true;
    if (fromDate || toDate) {
      const reqDate = r.requestDate ? r.requestDate.split(" ")[0] : "";
      if (fromDate && reqDate < fromDate) dateMatch = false;
      if (toDate   && reqDate > toDate)   dateMatch = false;
    }
    return nameMatch && statusMatch && dateMatch;
  });

  // ── Render ────────────────────────────────
  return (
    <div className="dayend-page">

      {/* Toast */}
      {toast && (
        <div className={`dayend-toast dayend-toast--${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <RejectModal
          record={rejectModal}
          onClose={() => setRejectModal(null)}
          onConfirm={handleReject}
        />
      )}

      <div className="dayend-container">
        {/* Header */}
        <div className="dayend-header">
          <div>
            <h1 className="dayend-header__title">Day End</h1>
            <p className="dayend-header__subtitle">
              Review and manage delivery day-end requests
            </p>
          </div>
          <button
            className="dayend-refresh-btn"
            onClick={loadData}
            disabled={loading}
          >
            <span className={loading ? "dayend-refresh-btn__icon--spinning" : ""}>↻</span>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <DayEndFilters
          search={search}               onSearchChange={setSearch}
          statusFilter={statusFilter}   onStatusChange={setStatusFilter}
          fromDate={fromDate}           onFromDateChange={setFromDate}
          toDate={toDate}               onToDateChange={setToDate}
          onClearDates={() => { setFromDate(""); setToDate(""); }}
        />

        {/* Table */}
        <DayEndTable
          rows={filtered}
          loading={loading}
          actionLoading={actionLoading}
          onApprove={handleApprove}
          onReject={setRejectModal}
        />

        {/* Summary */}
        <DayEndSummary data={data} />
      </div>
    </div>
  );
}
