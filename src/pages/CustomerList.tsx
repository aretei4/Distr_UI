import '../styles/pages/CustomerList.css';
import React, { useEffect, useMemo, useState } from "react";
import { CustomerService } from "../services/customerService";
import { PageHeader, DataTable, TR, TD, SearchInput, Btn } from "../components/ui";

const PAGE_SIZE = 20;

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch]       = useState("");
  const [page, setPage]           = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    CustomerService.getCustomerList()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter(c =>
      c.custNo?.toLowerCase().includes(q) ||
      c.custDesc?.toLowerCase().includes(q) ||
      c.custMobile?.includes(q)
    );
  }, [customers, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const paged = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  // Reset to page 0 when search changes
  useMemo(() => { setPage(0); }, [search]);

  const openMap = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Customer List"
        subtitle={`${filtered.length} customers`}
        action={
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search customer…" />
          </div>
        }
      />

      <DataTable
        headers={["Customer No", "Customer Name", "Mobile", "Address", "Location"]}
        loading={loading}
        empty={paged.length === 0}
        emptyText="No customers found"
      >
        {paged.map((c, i) => (
          <TR key={i}>
            <TD style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13 }}>{c.custNo}</TD>
            <TD style={{ fontWeight: 500 }}>{c.custDesc}</TD>
            <TD style={{ fontFamily: "monospace", color: "var(--ink-60)" }}>{c.custMobile ?? "—"}</TD>
            <TD style={{ color: "var(--ink-60)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.address ?? "—"}
            </TD>
            <TD>
              {c.lat && c.lon ? (
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => openMap(c.lat, c.lon)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  Map
                </Btn>
              ) : (
                <span style={{ fontSize: 12, color: "var(--ink-40)" }}>No coords</span>
              )}
            </TD>
          </TR>
        ))}
      </DataTable>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 16, padding: "0 4px",
        }}>
          <span style={{ fontSize: 12.5, color: "var(--ink-60)" }}>
            Page {page + 1} of {totalPages} · {filtered.length} total
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn size="sm" variant="secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Prev
            </Btn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  style={{
                    width: 32, height: 32, borderRadius: "var(--radius-sm)",
                    border: "1.5px solid",
                    borderColor: pg === page ? "var(--brand)" : "var(--ink-10)",
                    background: pg === page ? "var(--brand)" : "var(--white)",
                    color: pg === page ? "#fff" : "var(--ink-60)",
                    fontSize: 12.5, fontWeight: 600, cursor: "pointer",
                  }}
                >{pg + 1}</button>
              );
            })}
            <Btn size="sm" variant="secondary" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
              Next →
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerList;
