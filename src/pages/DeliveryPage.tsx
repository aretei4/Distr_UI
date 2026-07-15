import '../styles/pages/DeliveryPage.css';
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchDeliveryData } from "../services/DeliveryService";
import CalendarInput from "../components/CalendarInput";
import { Delivery } from "../models/DeliveryModel";
import { PageHeader, DataTable, TR, TD, Select, StatusBadge } from "../components/ui";

// Returns today as dd/MM/yyyy
const todayDMY = (): string => {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// Returns one week ago as dd/MM/yyyy
const oneWeekAgoDMY = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

// ── Payment mode colours (same palette as DayEnd) ────────────────────────────
const MODE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  CASH:          { bg: "#d1fae5", color: "#065f46", border: "#6ee7b7" },
  UPI:           { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" },
  CHEQUE:        { bg: "#fef3c7", color: "#92400e", border: "#fcd34d" },
  NEFT:          { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  BANK_TRANSFER: { bg: "#dbeafe", color: "#1e40af", border: "#93c5fd" },
  CARD:          { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
  CREDIT:        { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" },
};
const DEFAULT_MODE_STYLE = { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };

const getModeStyle = (mode: string) =>
  MODE_STYLE[mode?.toUpperCase()] ?? DEFAULT_MODE_STYLE;

// ── Payment breakdown — collapsed pills, expands to detail cards ──────────────
const PaymentModes: React.FC<{ modes: Delivery["paymentModes"]; total: number }> = ({ modes, total }) => {
  const [expanded, setExpanded] = React.useState(false);

  if (!modes || modes.length === 0) {
    return <span style={{ color: "var(--ink-40)", fontSize: 12 }}>—</span>;
  }

  const hasDetail = modes.some(m => m.chequeNo || m.bankName || m.referenceNo);

  // ── Collapsed view ────────────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        {modes.map((m, i) => {
          const s = getModeStyle(m.mode);
          return (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: s.bg, color: s.color,
              border: `1px solid ${s.border}`,
              borderRadius: 50, padding: "2px 9px",
              fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
            }}>
              {m.mode}
              <span style={{ fontWeight: 500, color: s.color, opacity: 0.8 }}>
                &nbsp;₹{m.amount.toLocaleString("en-IN")}
              </span>
            </span>
          );
        })}
        {modes.length > 1 && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>
            = ₹{total.toLocaleString("en-IN")}
          </span>
        )}
        {hasDetail && (
          <button
            onClick={() => setExpanded(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--ink-40)", fontSize: 11, padding: "0 2px",
            }}
            title="Show details"
          >▼</button>
        )}
      </div>
    );
  }

  // ── Expanded detail cards ─────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 180 }}>
      {modes.map((m, i) => {
        const s = getModeStyle(m.mode);
        return (
          <div key={i} style={{
            background: s.bg,
            border: `1px solid ${s.border}`,
            borderRadius: 8, padding: "7px 10px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: s.color }}>{m.mode}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>
                ₹{m.amount.toLocaleString("en-IN")}
              </span>
            </div>
            {m.chequeNo && (
              <div style={{ fontSize: 11, color: s.color, opacity: 0.8, marginTop: 3 }}>
                Cheque: {m.chequeNo}
              </div>
            )}
            {m.bankName && (
              <div style={{ fontSize: 11, color: s.color, opacity: 0.8 }}>
                Bank: {m.bankName}
              </div>
            )}
            {m.referenceNo && (
              <div style={{ fontSize: 11, color: s.color, opacity: 0.8 }}>
                Ref: {m.referenceNo}
              </div>
            )}
          </div>
        );
      })}
      {modes.length > 1 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>
          Total: ₹{total.toLocaleString("en-IN")}
        </div>
      )}
      <button
        onClick={() => setExpanded(false)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--ink-40)", fontSize: 11, textAlign: "left", padding: 0,
        }}
      >▲ collapse</button>
    </div>
  );
};

const DeliveryPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const today = todayDMY();

  const [deliveries, setDeliveries]     = useState<Delivery[]>([]);
  const [filtered, setFiltered]         = useState<Delivery[]>([]);
  const [loading, setLoading]           = useState(false);
  const [fromDate, setFromDate]         = useState(searchParams.get("from") ?? oneWeekAgoDMY());
  const [toDate, setToDate]             = useState(searchParams.get("to")   ?? today);
  const [agentSearch, setAgentSearch]   = useState("");
  const [deliveredFilter, setDelFilter] = useState(searchParams.get("delivered") ?? "ALL");

  // Load data whenever date range changes
  useEffect(() => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    fetchDeliveryData(fromDate, toDate)
      .then(data => { setDeliveries(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  // Apply filters
  useEffect(() => {
    let temp = [...deliveries];
    if (agentSearch.trim()) {
      const q = agentSearch.trim().toLowerCase();
      temp = temp.filter(d =>
        (d.deliveryBoyName ?? "").toLowerCase().includes(q)
      );
    }
    if (deliveredFilter !== "ALL") {
      if (deliveredFilter === "YES") temp = temp.filter(d => d.status === "DELIVERED");
      else if (deliveredFilter === "NO") temp = temp.filter(d => d.status === "PENDING" || d.status === "FAILED");
      else if (deliveredFilter === "ASSIGNED") temp = temp.filter(d => d.status === "ASSIGNED");
      else if (deliveredFilter === "REJECTED") temp = temp.filter(d => d.status === "REJECTED");
    }
    setFiltered(temp);
  }, [agentSearch, deliveredFilter, deliveries]);

  const fromDashboard = searchParams.get("delivered") !== null;

  const totalAmount = filtered.reduce((a, d) => a + (d.payment_amount ?? 0), 0);
  const deliveredCount = filtered.filter(d => d.status === "DELIVERED").length;
  const pendingCount   = filtered.filter(d => d.status === "PENDING").length;
  const failedCount    = filtered.filter(d => d.status === "FAILED").length;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Delivery Report"
        subtitle={fromDate && toDate ? `${fromDate}${fromDate !== toDate ? ` — ${toDate}` : ""}` : "Select a date range"}
      />

      {/* Dashboard filter chip */}
      {fromDashboard && (
        <div style={{
          marginBottom: 16, padding: "10px 16px",
          background: "var(--brand-light)", border: "1px solid var(--ink-10)",
          borderRadius: "var(--radius-md)", display: "flex", alignItems: "center",
          gap: 10, fontSize: 13, color: "var(--brand)",
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>
            Filtered from Dashboard —
            <strong style={{ marginLeft: 4 }}>
              {deliveredFilter === "YES" ? "Delivered" : deliveredFilter === "NO" ? "Pending / Not Delivered" : "All Deliveries"}
            </strong>
            {fromDate && (
              <> &middot; <span style={{ color: "var(--ink-60)" }}>{fromDate}{toDate !== fromDate ? ` to ${toDate}` : ""}</span></>
            )}
          </span>
          <button
            onClick={() => { setDelFilter("ALL"); setFromDate(today); setToDate(today); }}
            style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--ink-40)", fontSize: 13 }}
          >
            &#x2715; Clear
          </button>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <CalendarInput label="From Date" value={fromDate} onChange={setFromDate} />
        <CalendarInput label="To Date"   value={toDate}   onChange={setToDate} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Agent Name
          </label>
          <input
            value={agentSearch}
            onChange={e => setAgentSearch(e.target.value)}
            placeholder="Search delivery boy..."
            style={{ padding: "9px 12px", border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)", fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none", minWidth: 180 }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Status
          </label>
          <Select value={deliveredFilter} onChange={setDelFilter}>
            <option value="ALL">All</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="YES">Delivered</option>
            <option value="NO">Pending</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>

        {/* Summary chips */}
        {deliveries.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "#d1fae5", color: "#065f46", fontWeight: 600 }}>
              {deliveredCount} Delivered
            </span>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
              {pendingCount} Pending
            </span>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "#fee2e2", color: "#991b1b", fontWeight: 600 }}>
              {failedCount} Failed
            </span>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "var(--brand-light)", color: "var(--brand)", fontWeight: 600 }}>
              &#8377;{totalAmount.toLocaleString("en-IN")} collected
            </span>
          </div>
        )}
      </div>

      <DataTable
        headers={["DIRE ID", "Invoice No", "Customer Name", "Net Value", "Agent", "Status", "OTP", "Payment Modes", "Reason", "Date"]}
        loading={loading}
        empty={!loading && filtered.length === 0}
        emptyText={fromDate && toDate ? "No records found for this range" : "Select a date range to load data"}
      >
        {filtered.map((d, i) => (
          <TR key={i}>

            {/* DIRE ID */}
            <TD>
              {d.direId
                ? <span style={{
                    fontFamily: "monospace", fontWeight: 700, fontSize: 13,
                    color: "#5b21b6", background: "#ede9fe",
                    border: "1px solid #c4b5fd", borderRadius: 6,
                    padding: "3px 9px", display: "inline-block",
                  }}>#{d.direId}</span>
                : <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>
              }
            </TD>

            {/* Invoice No */}
            <TD>
              {d.invoiceNo
                ? <span style={{
                    fontFamily: "monospace", fontWeight: 600, fontSize: 12,
                    color: "var(--ink)", background: "var(--ink-5)",
                    border: "1px solid var(--ink-10)", borderRadius: 6,
                    padding: "3px 9px", display: "inline-block",
                  }}>{d.invoiceNo}</span>
                : <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>
              }
            </TD>

            {/* Customer Name */}
            <TD style={{ fontWeight: 500, color: "var(--ink)" }}>
              {d.custDesc || "—"}
            </TD>

            {/* Net Value */}
            <TD style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>
              ₹{(d.netValue ?? 0).toLocaleString("en-IN")}
            </TD>

            <TD>
              <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>
                {d.deliveryBoyName || "—"}
              </div>
            </TD>
            <TD><StatusBadge status={d.status} /></TD>
            <TD><StatusBadge status={Boolean(d.otp) ? "YES" : "NO"} /></TD>
            <TD>
              <PaymentModes modes={d.paymentModes} total={d.payment_amount} />
            </TD>
            <TD style={{ color: "var(--ink-60)", fontSize: 12.5 }}>{d.reason || "—"}</TD>
            <TD style={{ color: "var(--ink-60)", fontSize: 12.5, whiteSpace: "nowrap" }}>{d.delivery_date}</TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default DeliveryPage;
