import React, { useState, useEffect, useCallback } from "react";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";
import { PageHeader, DataTable, TR, TD, Btn, Select } from "../components/ui";

/* ── Types ─────────────────────────────────────────────────────── */
interface ReportRow {
  danId:      number;
  danCode:    string;
  date:       string;   // yyyy-MM-dd
  agentName:  string;
  agentCode:  string;
  deliveries: number;
  amount:     number;
  returnsAmt: number;
  status:     "Closed" | "Pending";
}

interface PaymentEntry {
  mode:         string;
  amount:       number;
  chequeNo?:    string;
  bankName?:    string;
  referenceNo?: string;
}
interface ReturnItem {
  description: string;
  qty:         number;
  amount:      number;
  reason:      string;
}
interface InvoiceRow {
  direId:     number;
  invoiceNo:  string;
  custName:   string;
  amount:     number;
  returnAmt:  number;
  paidAmount: number;
  payments:   PaymentEntry[];
  returns:    ReturnItem[];
}
interface ReportDetail {
  danId:        number;
  danCode:      string;
  date:         string;
  agentName:    string;
  agentCode:    string;
  status:       string;
  totalAmount:  number;
  netSettled:   number;
  deliveries:   number;
  returnsCount: number;
  returnsAmt:   number;
  invoices:     InvoiceRow[];
}

interface Agent { id: number; name: string; }

const MODE_STYLE: Record<string, { bg: string; color: string }> = {
  CASH:   { bg: "#dbeafe", color: "#1e40af" },
  UPI:    { bg: "#d1fae5", color: "#065f46" },
  CHEQUE: { bg: "#fef3c7", color: "#92400e" },
  NEFT:   { bg: "#dbeafe", color: "#1e40af" },
  CARD:   { bg: "#fce7f3", color: "#9d174d" },
  CREDIT: { bg: "#fce7f3", color: "#9d174d" },
};

const fmt = (n: number) => "₹" + Number(n ?? 0).toLocaleString("en-IN");

/* dd/MM/yyyy for API from a yyyy-MM-dd input value */
const isoToDMY = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

/* ── Detail panel (second screen) ──────────────────────────────── */
const DetailPanel: React.FC<{ detail: ReportDetail; onClose: () => void }> = ({ detail, onClose }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15,23,42,0.4)",
        display: "flex", justifyContent: "flex-end",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, maxWidth: "95vw", height: "100%",
          background: "#fff", overflowY: "auto",
          boxShadow: "-8px 0 30px rgba(0,0,0,0.15)",
          padding: "20px 22px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ink)" }}>{detail.danCode}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-60)", marginTop: 3 }}>
              {detail.date} · {detail.agentName} ({detail.agentCode})
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: "50%", border: "1px solid var(--ink-10)",
            background: "#fff", cursor: "pointer", fontSize: 14, color: "var(--ink-60)",
          }}>✕</button>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
          <div style={{ border: "1px solid var(--ink-10)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 4 }}>Total amount</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{fmt(detail.totalAmount)}</div>
          </div>
          <div style={{ border: "1px solid #6ee7b7", background: "#d1fae5", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#065f46", marginBottom: 4 }}>Net settled</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#065f46" }}>{fmt(detail.netSettled)}</div>
          </div>
          <div style={{ border: "1px solid var(--ink-10)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "var(--ink-40)", marginBottom: 4 }}>Deliveries</div>
            <div style={{ fontSize: 15, fontWeight: 800 }}>{detail.deliveries}</div>
          </div>
          <div style={{ border: "1px solid #fca5a5", background: "#fee2e2", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#991b1b", marginBottom: 4 }}>Returns</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#991b1b" }}>
              {detail.returnsCount} · -{fmt(detail.returnsAmt)}
            </div>
          </div>
        </div>

        {/* Invoice list */}
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-60)", marginBottom: 10 }}>
          🧾 Invoice list — click to expand payment breakdown
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {detail.invoices.map(inv => {
            const open = expanded === inv.direId;
            return (
              <div key={inv.direId} style={{
                border: `1px solid ${open ? "var(--brand)" : "var(--ink-10)"}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div
                  onClick={() => setExpanded(open ? null : inv.direId)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", cursor: "pointer",
                    background: open ? "var(--brand-xlight)" : "#fff",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "var(--brand)", fontSize: 13, fontFamily: "monospace" }}>
                    {inv.invoiceNo || `#${inv.direId}`}
                  </span>
                  <span style={{ fontSize: 13, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {inv.custName}
                  </span>
                  {inv.payments.map((p, i) => {
                    const s = MODE_STYLE[p.mode?.toUpperCase()] ?? { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <span key={i} style={{
                        fontSize: 10.5, fontWeight: 700, padding: "2px 8px",
                        borderRadius: 50, background: s.bg, color: s.color, whiteSpace: "nowrap",
                      }}>{p.mode}</span>
                    );
                  })}
                  <span style={{ fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" }}>{fmt(inv.amount)}</span>
                  {inv.returnAmt > 0 && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", whiteSpace: "nowrap" }}>
                      -{fmt(inv.returnAmt)}
                    </span>
                  )}
                  <span style={{ color: "var(--ink-40)", fontSize: 11 }}>{open ? "▲" : "▼"}</span>
                </div>

                {open && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid var(--ink-5)" }}>
                    {inv.payments.length === 0 ? (
                      <div style={{ fontSize: 12, color: "var(--ink-40)" }}>No payment recorded</div>
                    ) : (
                      <>
                        {inv.payments.map((p, i) => {
                          const pct = inv.paidAmount > 0 ? Math.round((p.amount / inv.paidAmount) * 100) : 0;
                          const hasDetail = p.chequeNo || p.bankName || p.referenceNo;
                          return (
                            <div key={i} style={{ marginBottom: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0f766e", flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 600, width: 60 }}>{p.mode}</span>
                                <div style={{ flex: 1, height: 6, background: "var(--ink-5)", borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{ width: `${pct}%`, height: "100%", background: "#0f766e", borderRadius: 4 }} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
                                  {fmt(p.amount)} <span style={{ color: "var(--ink-40)", fontWeight: 500 }}>{pct}%</span>
                                </span>
                              </div>
                              {hasDetail && (
                                <div style={{
                                  marginLeft: 18, marginTop: 5, padding: "6px 10px",
                                  background: "var(--ink-5)", borderRadius: 6,
                                  display: "flex", flexWrap: "wrap", gap: "4px 16px",
                                }}>
                                  {p.chequeNo && (
                                    <span style={{ fontSize: 11.5, color: "var(--ink-60)" }}>
                                      Cheque No: <strong style={{ color: "var(--ink)" }}>{p.chequeNo}</strong>
                                    </span>
                                  )}
                                  {p.bankName && (
                                    <span style={{ fontSize: 11.5, color: "var(--ink-60)" }}>
                                      Bank: <strong style={{ color: "var(--ink)" }}>{p.bankName}</strong>
                                    </span>
                                  )}
                                  {p.referenceNo && (
                                    <span style={{ fontSize: 11.5, color: "var(--ink-60)" }}>
                                      Ref No: <strong style={{ color: "var(--ink)" }}>{p.referenceNo}</strong>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        <div style={{
                          display: "flex", justifyContent: "space-between",
                          borderTop: "1px solid var(--ink-5)", paddingTop: 8, marginTop: 4,
                        }}>
                          <span style={{ fontSize: 12, color: "var(--ink-60)" }}>Total paid</span>
                          <span style={{ fontSize: 12.5, fontWeight: 800 }}>{fmt(inv.paidAmount)}</span>
                        </div>
                      </>
                    )}

                    {/* Invoice-wise returns */}
                    {inv.returns && inv.returns.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #fca5a5" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
                          ↩ Returns ({inv.returns.length})
                        </div>
                        {inv.returns.map((rt, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "5px 10px", marginBottom: 4,
                            background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6,
                          }}>
                            <span style={{ fontSize: 12, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {rt.description || "—"}
                            </span>
                            <span style={{ fontSize: 11.5, color: "var(--ink-60)", whiteSpace: "nowrap" }}>
                              Qty {rt.qty}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", whiteSpace: "nowrap" }}>
                              -{fmt(rt.amount)}
                            </span>
                          </div>
                        ))}
                        {inv.returns.some(rt => rt.reason) && (
                          <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 2 }}>
                            {inv.returns.filter(rt => rt.reason).map(rt => rt.reason).join(" · ")}
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                          <span style={{ fontSize: 12, color: "#991b1b" }}>Total returns</span>
                          <span style={{ fontSize: 12.5, fontWeight: 800, color: "#b91c1c" }}>-{fmt(inv.returnAmt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {detail.invoices.length === 0 && (
            <div style={{ fontSize: 13, color: "var(--ink-40)", textAlign: "center", padding: "24px 0" }}>
              No invoices found for this DAN
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Main page ─────────────────────────────────────────────────── */
const DanReportPage: React.FC = () => {
  const [rows,    setRows]    = useState<ReportRow[]>([]);
  const [agents,  setAgents]  = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail,  setDetail]  = useState<ReportDetail | null>(null);

  const [fromDate,    setFromDate]    = useState("");     // yyyy-MM-dd ("" = all)
  const [toDate,      setToDate]      = useState("");
  const [agentFilter, setAgentFilter] = useState("all");

  useEffect(() => {
    fetch(ApiEndpoints.DELIVERY_AGENTS, { headers: authHeaders() })
      .then(r => r.json())
      .then(list => setAgents(list.map((a: any) => ({ id: a.id, name: a.name }))))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate)              params.set("fromDate", isoToDMY(fromDate));
    if (toDate)                params.set("toDate",   isoToDMY(toDate));
    if (agentFilter !== "all") params.set("agentId", agentFilter);
    const qs = params.toString();
    fetch(`${ApiEndpoints.DAN_REPORT}${qs ? `?${qs}` : ""}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setRows(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fromDate, toDate, agentFilter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = (danId: number) => {
    fetch(ApiEndpoints.DAN_REPORT_DETAIL(danId), { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d && !d.error) setDetail(d); })
      .catch(() => {});
  };

  const exportCsv = () => {
    const head = "DAN ID,Date,Agent,Agent Code,Deliveries,Amount,Returns,Status";
    const body = rows.map(r =>
      [r.danCode, r.date, r.agentName, r.agentCode, r.deliveries, r.amount, r.returnsAmt, r.status].join(",")
    ).join("\n");
    const blob = new Blob([head + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dan-close-report.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="DAN Close Report"
        subtitle={`Showing ${rows.length} DANs · Click row to view details`}
        action={<Btn variant="secondary" onClick={exportCsv}>⬇ Export</Btn>}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--ink-60)", fontWeight: 600 }}>FROM</label>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: "8px 10px", border: "1.5px solid var(--ink-10)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--ink-60)", fontWeight: 600 }}>TO</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: "8px 10px", border: "1.5px solid var(--ink-10)", borderRadius: 8, fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: "var(--ink-60)", fontWeight: 600 }}>AGENT</label>
          <Select value={agentFilter} onChange={setAgentFilter}>
            <option value="all">All agents</option>
            {agents.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
          </Select>
        </div>
        <Btn variant="primary"   onClick={load}>Apply</Btn>
        <Btn variant="secondary" onClick={() => { setFromDate(""); setToDate(""); setAgentFilter("all"); }}>Clear</Btn>
      </div>

      <DataTable
        headers={["DAN ID", "Date", "Agent", "Deliveries", "Amount", "Returns", "Status"]}
        loading={loading}
        empty={rows.length === 0}
        emptyText="No DANs found for the selected filters"
      >
        {rows.map(r => (
          <TR key={r.danId} onClick={() => openDetail(r.danId)}>
            <TD style={{ fontWeight: 700, color: "var(--brand)", fontFamily: "monospace", fontSize: 13, whiteSpace: "nowrap", cursor: "pointer" }}>
              {r.danCode}
            </TD>
            <TD style={{ color: "var(--ink-60)", whiteSpace: "nowrap" }}>{r.date}</TD>
            <TD>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{r.agentName}</div>
              <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 2 }}>{r.agentCode}</div>
            </TD>
            <TD style={{ fontWeight: 600 }}>{r.deliveries}</TD>
            <TD style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{fmt(r.amount)}</TD>
            <TD style={{ whiteSpace: "nowrap" }}>
              {r.returnsAmt > 0
                ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>-{fmt(r.returnsAmt)}</span>
                : <span style={{ color: "var(--ink-30)" }}>—</span>}
            </TD>
            <TD>
              <span style={{
                display: "inline-block", padding: "3px 12px", borderRadius: 20,
                fontSize: 11.5, fontWeight: 700,
                background: r.status === "Closed" ? "#d1fae5" : "#fef3c7",
                color:      r.status === "Closed" ? "#065f46" : "#92400e",
              }}>{r.status}</span>
            </TD>
          </TR>
        ))}
      </DataTable>

      {detail && <DetailPanel detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

export default DanReportPage;
