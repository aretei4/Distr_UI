import '../styles/pages/SalesTable.css';
import React, { useEffect, useState, useMemo } from "react";
import { fetchSales, deleteSalesByDire } from "../services/salesService";
import { useNavigate } from "react-router-dom";
import { PageHeader, DataTable, TR, TD, SearchInput, Btn } from "../components/ui";

interface SalesEntry {
  direId:      number;
  picklistNo:   string;
  salesOrderNo: string;
  customerNo:   string;
  custDesc:     string;
  salesRepNo:   string;
  salesRepName: string;
  route:        string;
  routeName:    string;
  billingDate:  number;
  warehouse:    string;
  netValue:     number;
  updateDate:   number;
  buId:         number;
  companyName:  string;
}

const PAGE_SIZE = 30;

const SalesTable: React.FC = () => {
  const [sales, setSales]           = useState<SalesEntry[]>([]);
  const [filteredSales, setFiltered] = useState<SalesEntry[]>([]);
  const [selected, setSelected]     = useState<number[]>([]);
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [page, setPage]             = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSales()
      .then(data => { setSales(data); setFiltered(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    const rows = !q ? [...sales] : sales.filter(s =>
      (s.picklistNo   ?? "").toLowerCase().includes(q) ||
      (s.salesOrderNo ?? "").toLowerCase().includes(q) ||
      (s.customerNo   ?? "").toLowerCase().includes(q) ||
      (s.custDesc     ?? "").toLowerCase().includes(q)
    );
    rows.sort((a, b) => (a.salesOrderNo ?? "").localeCompare(b.salesOrderNo ?? "", undefined, { numeric: true }));
    setFiltered(rows);
    setPage(1);
  }, [search, sales]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / PAGE_SIZE));
  const pageRows   = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, page]);

  const toggleRow = (id: number) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // Select/deselect only visible page rows
  const allPageSelected = pageRows.length > 0 && pageRows.every(r => selected.includes(r.direId));
  const togglePageAll   = () => {
    const ids = pageRows.map(r => r.direId);
    if (allPageSelected) setSelected(p => p.filter(x => !ids.includes(x)));
    else                 setSelected(p => Array.from(new Set([...p, ...ids])));
  };

  const handleDelete = () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} selected row(s)?`)) return;
    deleteSalesByDire(selected)
      .then(() => {
        setSales(p => p.filter(s => !selected.includes(s.direId)));
        setSelected([]);
      })
      .catch(() => alert("Delete failed"));
  };

  const handleNext = () => {
    const sel = sales.filter(s => selected.includes(s.direId));
    if (!sel.length) { alert("Select at least one record."); return; }
    navigate("/sales/sales-detail", { state: { selectedSales: sel } });
  };

  const totalValue    = filteredSales.reduce((a, s) => a + (s.netValue ?? 0), 0);
  const selectedValue = sales.reduce((a, s) => selected.includes(s.direId) ? a + (s.netValue ?? 0) : a, 0);

  return (
    <div className="animate-fade-up" style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Sales Picklist"
        subtitle={`${filteredSales.length} records · ₹${totalValue.toLocaleString("en-IN")}`}
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {selected.length > 0 && (
              <span style={{
                fontSize: 13, fontWeight: 700, color: "var(--brand)",
                background: "var(--brand-light)", padding: "6px 14px",
                borderRadius: 50, whiteSpace: "nowrap",
              }}>
                {selected.length} · ₹{selectedValue.toLocaleString("en-IN")}
              </span>
            )}
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
        <SearchInput value={search} onChange={setSearch} placeholder="Search picklist, invoice or customer…" width="340px" />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {selected.length > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light)", padding: "4px 12px", borderRadius: 50 }}>
              {selected.length} selected
            </span>
          )}
          <span style={{ fontSize: 12, color: "var(--ink-40)" }}>
            Page {page} of {totalPages}
          </span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <DataTable
          headers={["☐", "Dire ID", "Invoice No", "Picklist No", "Customer No", "Customer Name", "Sales Rep", "Company", "Net Value", "Billing Date"]}
          loading={loading}
          empty={filteredSales.length === 0}
          emptyText="No matching records found"
        >
          {/* Select-all row for current page */}
          <tr style={{ background: "var(--ink-5)", borderBottom: "1px solid var(--ink-10)" }}>
            <td style={{ padding: "11px 16px" }}>
              <input
                type="checkbox"
                checked={allPageSelected}
                onChange={togglePageAll}
                style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--brand)" }}
              />
            </td>
            <td colSpan={10} style={{ padding: "11px 0", fontSize: 11, color: "var(--ink-40)" }}>
              {selected.length > 0
                ? `${selected.length} of ${filteredSales.length} rows selected (across all pages)`
                : `Showing ${(page-1)*PAGE_SIZE + 1}–${Math.min(page*PAGE_SIZE, filteredSales.length)} of ${filteredSales.length}`}
            </td>
          </tr>

          {pageRows.map(row => (
            <TR key={row.direId} onClick={() => toggleRow(row.direId)}>
              <TD style={{ width: 48 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(row.direId)}
                  onChange={() => toggleRow(row.direId)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--brand)" }}
                />
              </TD>
              {/* Dire ID */}
              <TD style={{ fontWeight: 700, color: "var(--brand)", fontSize: 12.5, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {row.companyName ? `${row.companyName.trim().slice(0, 3).toUpperCase()}-${row.direId}` : row.direId}
              </TD>
              {/* Invoice No */}
              <TD style={{ color: "#b45309", fontSize: 12.5, fontFamily: "monospace" }}>
                {row.salesOrderNo || "—"}
              </TD>
              {/* Picklist No */}
              <TD style={{ fontWeight: 600, color: "var(--brand)", fontSize: 12.5, fontFamily: "monospace", whiteSpace: "nowrap" }}>
                {row.picklistNo || "—"}
              </TD>
              {/* Customer No */}
              <TD style={{ color: "var(--ink-60)", fontSize: 12.5 }}>
                {row.customerNo || "—"}
              </TD>
              {/* Customer Name */}
              <TD style={{ fontWeight: 600, color: "var(--ink)" }}>
                {row.custDesc || "—"}
              </TD>
              {/* Sales Rep */}
              <TD style={{ color: "var(--ink-60)", fontSize: 12.5 }}>
                {row.salesRepName || "—"}
              </TD>
              {/* Company */}
              <TD style={{ color: "var(--ink-60)", fontSize: 12.5 }}>
                {row.companyName || "—"}
              </TD>
              {/* Net Value */}
              <TD style={{ fontWeight: 700, color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" }}>
                ₹{(row.netValue ?? 0).toLocaleString("en-IN")}
              </TD>
              {/* Billing Date */}
              <TD style={{ color: "var(--ink-60)", whiteSpace: "nowrap" }}>
                {row.billingDate ? new Date(row.billingDate).toLocaleDateString("en-IN") : "—"}
              </TD>
            </TR>
          ))}
        </DataTable>
      </div>

      {/* Pagination bar */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "12px 0 4px", flexShrink: 0,
        }}>
          <PagBtn onClick={() => setPage(1)}          disabled={page === 1}>«</PagBtn>
          <PagBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}>‹</PagBtn>

          {pageNumbers(page, totalPages).map((n, i) =>
            n === "…"
              ? <span key={`e${i}`} style={{ padding: "0 4px", color: "var(--ink-40)", fontSize: 13 }}>…</span>
              : <PagBtn key={n} onClick={() => setPage(Number(n))} active={page === Number(n)}>{n}</PagBtn>
          )}

          <PagBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>›</PagBtn>
          <PagBtn onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</PagBtn>

          <span style={{ fontSize: 12, color: "var(--ink-40)", marginLeft: 8 }}>
            {filteredSales.length} records · {PAGE_SIZE}/page
          </span>
        </div>
      )}
    </div>
  );
};

// ── Pagination helpers ────────────────────────────────────────────────────────

function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  if (current > 3)          pages.push("…");
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2)  pages.push("…");
  pages.push(total);
  return pages;
}

function PagBtn({ children, onClick, disabled, active }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; active?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: "0 8px",
        border: `1px solid ${active ? "var(--brand)" : "var(--ink-10)"}`,
        borderRadius: 7, fontSize: 13, fontWeight: active ? 700 : 400,
        background: active ? "var(--brand)" : "#fff",
        color: active ? "#fff" : disabled ? "var(--ink-20)" : "var(--ink)",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .12s",
      }}>
      {children}
    </button>
  );
}

export default SalesTable;
