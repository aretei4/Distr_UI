import '../styles/pages/InvoiceReportPage.css';
import React, { useEffect, useState } from "react";
import { fetchInvoiceReport } from "../services/DeliveryService";
import CalendarInput from "../components/CalendarInput";
import { Delivery } from "../models/DeliveryModel";
import { PageHeader, DataTable, TR, TD, Select } from "../components/ui";

// dd/MM/yyyy helpers
const todayDMY = (): string => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};
const oneWeekAgoDMY = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

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

const InvoiceReportPage: React.FC = () => {
  const [rows, setRows]         = useState<Delivery[]>([]);
  const [filtered, setFiltered] = useState<Delivery[]>([]);
  const [loading, setLoading]   = useState(false);
  const [fromDate, setFromDate] = useState(oneWeekAgoDMY());
  const [toDate, setToDate]     = useState(todayDMY());
  const [agentSearch, setAgentSearch] = useState("");
  const [modeFilter, setModeFilter]   = useState("ALL");

  useEffect(() => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    fetchInvoiceReport(fromDate, toDate, modeFilter)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fromDate, toDate, modeFilter]);

  useEffect(() => {
    const q = agentSearch.trim().toLowerCase();
    setFiltered(q
      ? rows.filter(d =>
          (d.deliveryBoyName ?? "").toLowerCase().includes(q) ||
          (d.custDesc ?? "").toLowerCase().includes(q) ||
          (d.invoiceNo ?? "").toLowerCase().includes(q))
      : rows);
  }, [agentSearch, rows]);

  const totalNet       = filtered.reduce((a, d) => a + (d.netValue ?? 0), 0);
  const totalCollected = filtered.reduce((a, d) => a + (d.payment_amount ?? 0), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Invoice Report"
        subtitle={`Closed invoices · ${fromDate}${fromDate !== toDate ? ` — ${toDate}` : ""}`}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
        <CalendarInput label="From Date" value={fromDate} onChange={setFromDate} />
        <CalendarInput label="To Date"   value={toDate}   onChange={setToDate} />

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Payment Mode
          </label>
          <Select value={modeFilter} onChange={setModeFilter}>
            <option value="ALL">All modes</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CHEQUE">Cheque</option>
            <option value="NEFT">NEFT</option>
            <option value="CREDIT">Credit</option>
          </Select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Search
          </label>
          <input
            value={agentSearch}
            onChange={e => setAgentSearch(e.target.value)}
            placeholder="Agent, customer or invoice..."
            style={{ padding: "9px 12px", border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)", fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none", minWidth: 220 }}
          />
        </div>

        {/* Summary chips */}
        {rows.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "#dbeafe", color: "#1e40af", fontWeight: 600 }}>
              {filtered.length} Closed
            </span>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "var(--brand-light)", color: "var(--brand)", fontWeight: 600 }}>
              ₹{totalNet.toLocaleString("en-IN")} invoiced
            </span>
            <span style={{ fontSize: 12, padding: "5px 12px", borderRadius: 50, background: "#d1fae5", color: "#065f46", fontWeight: 600 }}>
              ₹{totalCollected.toLocaleString("en-IN")} collected
            </span>
          </div>
        )}
      </div>

      <DataTable
        headers={["DIRE ID", "Invoice No", "Customer Name", "Net Value", "Agent", "Payment Modes", "Collected", "Date"]}
        loading={loading}
        empty={!loading && filtered.length === 0}
        emptyText="No closed invoices found for this range"
      >
        {filtered.map((d, i) => (
          <TR key={i}>
            <TD>
              {d.direId
                ? <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 6, padding: "3px 9px", display: "inline-block" }}>#{d.direId}</span>
                : <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>}
            </TD>
            <TD>
              {d.invoiceNo
                ? <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 12, color: "var(--ink)", background: "var(--ink-5)", border: "1px solid var(--ink-10)", borderRadius: 6, padding: "3px 9px", display: "inline-block" }}>{d.invoiceNo}</span>
                : <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>}
            </TD>
            <TD style={{ fontWeight: 500 }}>{d.custDesc || "—"}</TD>
            <TD style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap" }}>
              ₹{(d.netValue ?? 0).toLocaleString("en-IN")}
            </TD>
            <TD style={{ fontWeight: 600, fontSize: 13 }}>{d.deliveryBoyName || "—"}</TD>
            <TD>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(d.paymentModes ?? []).length === 0
                  ? <span style={{ color: "var(--ink-40)", fontSize: 12 }}>—</span>
                  : d.paymentModes.map((m, mi) => {
                      const s = MODE_STYLE[m.mode?.toUpperCase()] ?? DEFAULT_MODE_STYLE;
                      return (
                        <span key={mi} style={{
                          display: "inline-flex", alignItems: "center",
                          background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                          borderRadius: 50, padding: "2px 9px",
                          fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap",
                        }}>
                          {m.mode}&nbsp;₹{m.amount.toLocaleString("en-IN")}
                        </span>
                      );
                    })}
              </div>
            </TD>
            <TD style={{ fontWeight: 700, textAlign: "right", whiteSpace: "nowrap", color: "#065f46" }}>
              ₹{(d.payment_amount ?? 0).toLocaleString("en-IN")}
            </TD>
            <TD style={{ color: "var(--ink-60)", fontSize: 12.5, whiteSpace: "nowrap" }}>{d.delivery_date}</TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default InvoiceReportPage;
