import React, { useEffect, useState } from "react";
import { ApiEndpoints } from "../constants/config";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, TR, TD, SearchInput, Btn } from "../components/ui";

interface SalesEntry {
  picklistNo: string; salesOrderNo: string; customerNo: string;
  custDesc: string; salesRepNo: string; salesRepName: string;
  route: string; routeName: string; billingDate: number;
  warehouse: string; netValue: number; updateDate: number; buId: number;
  companyName: string;
}

const SalesTable: React.FC = () => {
  const [sales, setSales]           = useState<SalesEntry[]>([]);
  const [filteredSales, setFiltered] = useState<SalesEntry[]>([]);
  const [selected, setSelected]     = useState<string[]>([]);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(ApiEndpoints.SALES)
      .then(r => r.json())
      .then(data => { setSales(data); setFiltered(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(sales); return; }
    const q = search.toLowerCase();
    setFiltered(sales.filter(s =>
      s.picklistNo.toLowerCase().includes(q) ||
      s.customerNo.toLowerCase().includes(q) ||
      s.custDesc.toLowerCase().includes(q)
    ));
  }, [search, sales]);

  const toggleRow = (no: string) =>
    setSelected(p => p.includes(no) ? p.filter(x => x !== no) : [...p, no]);

  const toggleAll = () =>
    setSelected(selected.length === filteredSales.length ? [] : filteredSales.map(s => s.picklistNo));

  const handleDelete = () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} selected row(s)?`)) return;
    fetch(ApiEndpoints.SALES_DELETE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected),
    }).then(r => {
      if (!r.ok) throw new Error();
      setSales(p => p.filter(s => !selected.includes(s.picklistNo)));
      setSelected([]);
    }).catch(() => alert("Delete failed"));
  };

  const handleNext = () => {
    const sel = sales.filter(s => selected.includes(s.picklistNo));
    if (!sel.length) { alert("Select at least one record."); return; }
    navigate("/sales/sales-detail", { state: { selectedSales: sel } });
  };

  const totalValue = filteredSales.reduce((a, s) => a + s.netValue, 0);

  return (
    <div className="animate-fade-up" style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Sales Picklist"
        subtitle={`${filteredSales.length} records · ₹${totalValue.toLocaleString("en-IN")}`}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            {selected.length > 0 && (
              <Btn variant="danger" onClick={handleDelete}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                Delete {selected.length}
              </Btn>
            )}
            <Btn variant="primary" onClick={handleNext}>
              Assign Delivery →
            </Btn>
          </div>
        }
      />

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search picklist or customer…" width="320px" />
        {selected.length > 0 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light)", padding: "4px 12px", borderRadius: 50 }}>
            {selected.length} selected
          </span>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        <DataTable
          headers={["☐", "Picklist No", "Customer No", "Customer Name", "Company", "Net Value", "Billing Date"]}
          loading={loading}
          empty={filteredSales.length === 0}
          emptyText="No matching records found"
        >
          <tr style={{ background: "var(--ink-5)", borderBottom: "1px solid var(--ink-10)" }}>
            <td style={{ padding: "11px 16px" }}>
              <input
                type="checkbox"
                checked={filteredSales.length > 0 && selected.length === filteredSales.length}
                onChange={toggleAll}
                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--brand)" }}
              />
            </td>
            <td colSpan={6} style={{ padding: "11px 0", fontSize: 11, color: "var(--ink-40)" }}>
              {selected.length > 0 ? `${selected.length} of ${filteredSales.length} rows selected` : "Click rows to select"}
            </td>
          </tr>
          {filteredSales.map(row => (
            <TR key={row.picklistNo} onClick={() => toggleRow(row.picklistNo)}>
              <TD style={{ width: 48 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(row.picklistNo)}
                  onChange={() => toggleRow(row.picklistNo)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--brand)" }}
                />
              </TD>
              <TD style={{
                fontWeight: 600,
                color: selected.includes(row.picklistNo) ? "var(--brand)" : "var(--ink)",
                fontFamily: "'Inter', sans-serif", fontSize: 13,
              }}>{row.picklistNo}</TD>
              <TD style={{ color: "var(--ink-60)" }}>{row.customerNo}</TD>
              <TD style={{ fontWeight: 500 }}>{row.custDesc}</TD>
              <TD style={{ color: "var(--ink-60)", fontSize: 12.5 }}>{row.companyName || "—"}</TD>
              <TD style={{ fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>
                ₹{row.netValue.toLocaleString("en-IN")}
              </TD>
              <TD style={{ color: "var(--ink-60)" }}>
                {new Date(row.billingDate).toLocaleDateString("en-IN")}
              </TD>
            </TR>
          ))}
        </DataTable>
      </div>
    </div>
  );
};

export default SalesTable;
