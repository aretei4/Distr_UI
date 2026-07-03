import React, { useState, useEffect, useCallback } from "react";
import { ApiEndpoints } from "../constants/config";
import { PageHeader, DataTable, TR, TD, SearchInput, Btn } from "../components/ui";

interface Assignment {
  direId:      number;
  invoiceNo:   string;
  customerNo:  string;
  custDesc:    string;
  custMobile:  string;
  netValue:    string;
  billingDate: string;
  agentId:     string;
  agentName:   string;
  statusLabel: string;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  ASSIGNED:  { color: "#5b21b6", bg: "#ede9fe" },
  PENDING:   { color: "#92400e", bg: "#fef3c7" },
  DELIVERED: { color: "#166534", bg: "#dcfce7" },
  FAILED:    { color: "#991b1b", bg: "#fee2e2" },
};

const toDay       = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const oneMonthAgo = () => { const d = new Date(); d.setMonth(d.getMonth()-1); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };

const AssignmentPage: React.FC = () => {
  const [data,     setData]     = useState<Assignment[]>([]);
  const [filtered, setFiltered] = useState<Assignment[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${ApiEndpoints.ASSIGNMENTS}`)
      .then(r => r.json())
      .then(rows => { setData(rows); setFiltered(rows); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? data.filter(row =>
      row.custDesc.toLowerCase().includes(q) ||
      (row.invoiceNo ?? "").toLowerCase().includes(q) ||
      (row.agentName ?? "").toLowerCase().includes(q) ||
      String(row.direId ?? "").includes(q)
    ) : data);
  }, [search, data]);

  const deleteRow = async (direId: number) => {
    if (!confirm("Delete this assignment?")) return;
    try {
      const res = await fetch(ApiEndpoints.DELETE_DELIVERY_BY_DIRE(direId), { method: "DELETE" });
      if (!res.ok) throw new Error();
      const next = data.filter(r => r.direId !== direId);
      setData(next); setFiltered(next);
    } catch { alert("Delete failed"); }
  };

  const totalValue = filtered.reduce((s, r) => s + parseFloat(r.netValue || "0"), 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Assignments"
        subtitle={`${filtered.length} records · ₹${totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`}
      />

      <div style={{ marginBottom: 14 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search customer, invoice, agent…" width="340px" />
      </div>

      <DataTable
        headers={["DIRE ID", "Invoice No", "Customer No", "Customer Name", "Agent", "Net Value", "Billing Date", "Status", "Action"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No assignments found for the selected filters"
      >
        {filtered.map((row, i) => (
          <TR key={i}>
            <TD>
              {row.direId
                ? <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 6, padding: "3px 9px", display: "inline-block" }}>#{row.direId}</span>
                : <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>}
            </TD>
            <TD>
              {row.invoiceNo
                ? <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 12, color: "var(--ink)", background: "var(--ink-5)", border: "1px solid var(--ink-10)", borderRadius: 6, padding: "3px 9px", display: "inline-block" }}>{row.invoiceNo}</span>
                : <span style={{ color: "var(--ink-30)", fontSize: 12 }}>—</span>}
            </TD>
            <TD style={{ color: "var(--ink-60)", fontFamily: "monospace", fontSize: 12 }}>{row.customerNo}</TD>
            <TD style={{ fontWeight: 500 }}>{row.custDesc}</TD>
            <TD>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{row.agentName}</div>
              <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 2 }}>DA-{row.agentId}</div>
            </TD>
            <TD style={{ fontWeight: 700, textAlign: "right" }}>
              ₹{parseFloat(row.netValue || "0").toFixed(2)}
            </TD>
            <TD style={{ color: "var(--ink-60)", fontSize: 13 }}>{row.billingDate}</TD>
            <TD>
              {row.statusLabel && (
                <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, ...(STATUS_STYLE[row.statusLabel] ?? { color: "#374151", background: "#f3f4f6" }) }}>
                  {row.statusLabel}
                </span>
              )}
            </TD>
            <TD>
              <Btn size="sm" variant="danger" onClick={() => deleteRow(row.direId)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                Delete
              </Btn>
            </TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default AssignmentPage;
