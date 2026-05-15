import { useState, useEffect, useCallback } from "react";
import type { DayEndRecord, ToastState } from "./types";
import { fetchDayEndSummary, approveDayEnd, rejectDayEnd } from "../services/dayEndService";
import {
  PageHeader, Card, DataTable, TR, TD, StatusBadge,
  SearchInput, Select, Btn, Toast,
} from "../components/ui";

/* ── REJECT MODAL ─────────────────────────── */
function RejectModal({
  record, onClose, onConfirm,
}: {
  record: DayEndRecord;
  onClose: () => void;
  onConfirm: (id: number, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(record.dayendId, reason);
    setLoading(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(11,18,21,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: "fadeIn 0.2s ease",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--white)", borderRadius: "var(--radius-xl)",
          padding: "28px 28px 24px", width: 440,
          boxShadow: "var(--shadow-lg)", animation: "fadeUp 0.25s ease",
        }}
      >
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>
          Reject Request
        </h2>
        <p style={{ fontSize: 13.5, color: "var(--ink-60)", marginBottom: 20 }}>
          Provide a reason for rejecting <strong style={{ color: "var(--ink)" }}>{record.deliveryBoyName}</strong>'s day-end.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={3}
          placeholder="Enter rejection reason…"
          style={{
            width: "100%", padding: "12px 14px",
            border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)",
            fontSize: 13.5, fontFamily: "'Inter', sans-serif",
            color: "var(--ink)", resize: "none", outline: "none",
            transition: "border 0.2s",
          }}
          onFocus={e => e.currentTarget.style.borderColor = "var(--danger)"}
          onBlur={e => e.currentTarget.style.borderColor = "var(--ink-10)"}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="danger"
            onClick={confirm}
            disabled={!reason.trim() || loading}
          >
            {loading ? "Rejecting…" : "Reject"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ───────────────────────────── */
export default function DayEnd() {
  const [data, setData]          = useState<DayEndRecord[]>([]);
  const [loading, setLoading]    = useState(false);
  const [search, setSearch]      = useState("");
  const [status, setStatus]      = useState("ALL");
  const [from, setFrom]          = useState("");
  const [to, setTo]              = useState("");
  const [actionLoading, setAL]   = useState<Record<string, boolean>>({});
  const [toast, setToast]        = useState<ToastState | null>(null);
  const [rejectRec, setRejectRec] = useState<DayEndRecord | null>(null);

  const showToast = (message: string, type: ToastState["type"] = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchDayEndSummary();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (id: number) => {
    setAL(p => ({ ...p, [`a_${id}`]: true }));
    try {
      await approveDayEnd(id);
      setData(prev => prev.map(r => r.dayendId === id ? { ...r, status: "APPROVED" as const } : r));
      showToast("Approved successfully", "success");
    } catch { showToast("Failed to approve", "error"); }
    finally { setAL(p => ({ ...p, [`a_${id}`]: false })); }
  };

  const handleReject = async (id: number, reason: string) => {
    try {
      await rejectDayEnd(id, reason);
      setData(prev => prev.map(r => r.dayendId === id ? { ...r, status: "REJECTED" as const, rejectReason: reason } : r));
      setRejectRec(null);
      showToast("Request rejected", "error");
    } catch { showToast("Failed to reject", "error"); }
  };

  const filtered = data.filter(r => {
    const nameOk   = r.deliveryBoyName?.toLowerCase().includes(search.toLowerCase());
    const statusOk = status === "ALL" || r.status === status;
    let   dateOk   = true;
    if (from || to) {
      const d = r.requestDate?.split(" ")[0] ?? "";
      if (from && d < from) dateOk = false;
      if (to   && d > to)   dateOk = false;
    }
    return nameOk && statusOk && dateOk;
  });

  // Summary counts
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  data.forEach(r => { if (r.status in counts) counts[r.status]++; });

  return (
    <div className="animate-fade-up">
      {toast && <Toast message={toast.message} type={toast.type} />}
      {rejectRec && (
        <RejectModal
          record={rejectRec}
          onClose={() => setRejectRec(null)}
          onConfirm={handleReject}
        />
      )}

      <PageHeader
        title="Day End"
        subtitle="Review and settle delivery day-end requests"
        action={
          <Btn variant="secondary" onClick={load} disabled={loading}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: loading ? "spin 1s linear infinite" : "none" }}>
              <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </Btn>
        }
      />

      {/* Summary pills */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Pending",  count: counts.PENDING,  color: "#92400e", bg: "#fef3c7" },
          { label: "Approved", count: counts.APPROVED, color: "#065f46", bg: "#d1fae5" },
          { label: "Rejected", count: counts.REJECTED, color: "#991b1b", bg: "#fee2e2" },
        ].map(s => (
          <div key={s.label} style={{
            padding: "10px 18px", borderRadius: "var(--radius-md)",
            background: s.bg, display: "flex", alignItems: "center", gap: 10,
          }}>
            <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, color: s.color }}>{s.count}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 16 }} padding="14px 18px">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search agent name…" />
          <Select value={status} onChange={setStatus}>
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 600 }}>From</span>
            <input
              type="date" value={from}
              onChange={e => setFrom(e.target.value)}
              style={{
                padding: "8px 12px", border: "1.5px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", fontSize: 13,
                fontFamily: "'Inter', sans-serif", background: "var(--white)",
                color: "var(--ink)", outline: "none", cursor: "pointer",
              }}
            />
            <span style={{ fontSize: 12, color: "var(--ink-60)", fontWeight: 600 }}>To</span>
            <input
              type="date" value={to}
              onChange={e => setTo(e.target.value)}
              style={{
                padding: "8px 12px", border: "1.5px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", fontSize: 13,
                fontFamily: "'Inter', sans-serif", background: "var(--white)",
                color: "var(--ink)", outline: "none", cursor: "pointer",
              }}
            />
            {(from || to) && (
              <Btn size="sm" variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>✕ Clear</Btn>
            )}
          </div>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        headers={["Agent", "Request Date", "Status", "Amount", "Reason", "Action"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No day-end records match your filters"
      >
        {filtered.map(row => (
          <TR key={row.dayendId}>
            <TD>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "var(--brand-light)", color: "var(--brand)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{row.deliveryBoyName?.slice(0, 2).toUpperCase()}</div>
                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{row.deliveryBoyName}</span>
              </div>
            </TD>
            <TD style={{ color: "var(--ink-60)" }}>{row.requestDate?.split(" ")[0] ?? "—"}</TD>
            <TD><StatusBadge status={row.status} /></TD>
            <TD style={{ fontWeight: 700, color: "var(--ink)", fontFamily: "'Inter', sans-serif" }}>
              ₹{row.totalAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </TD>
            <TD style={{ color: "var(--ink-40)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {row.rejectReason ?? "—"}
            </TD>
            <TD>
              {row.status === "PENDING" ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn
                    size="sm" variant="primary"
                    onClick={() => handleApprove(row.dayendId)}
                    disabled={actionLoading[`a_${row.dayendId}`]}
                  >✓ Approve</Btn>
                  <Btn size="sm" variant="danger" onClick={() => setRejectRec(row)}>✕ Reject</Btn>
                </div>
              ) : (
                <span style={{ fontSize: 12, color: "var(--ink-40)", fontWeight: 500 }}>
                  {row.status === "APPROVED" ? "✓ Approved" : "✕ Rejected"}
                </span>
              )}
            </TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
}
