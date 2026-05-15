import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard, PageHeader, Card, SearchInput, DataTable, TR, TD } from "../components/ui";
import {
  getDeliverySummary, fetchDeliveryAgents,
  DeliverySummary, DeliveryBoy,
} from "../services/dashboardService";

const TEN_MINUTES = 10 * 60 * 1000;

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DeliverySummary | null>(null);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [selectedBoy, setSelectedBoy] = useState<DeliveryBoy | null>(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const loadSummary = async () => {
    try {
      const data = await getDeliverySummary(selectedBoy?.id ?? null);
      setSummary(data);
    } catch { /* use demo data */ }
  };

  const loadDeliveryBoys = async () => {
    try {
      const res = await fetchDeliveryAgents();
      const mapped = res.map((b: any) => ({
        id: b.id, name: b.name || "", phone: b.contact || "",
      }));
      setDeliveryBoys(mapped);
      localStorage.setItem("DELIVERY_BOYS", JSON.stringify(mapped));
    } catch { /* silent */ }
  };

  useEffect(() => { loadDeliveryBoys(); }, []);
  useEffect(() => {
    loadSummary();
    const iv = setInterval(loadSummary, TEN_MINUTES);
    return () => clearInterval(iv);
  }, [selectedBoy]);

  const filteredBoys = deliveryBoys.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) || b.phone.includes(search)
  );

  // demo fallback
  const s = summary ?? {
    todayTotal: 48, todayDelivered: 31, todayPending: 14, todayCancelled: 3,
    totalDeliveries: 248, delivered: 198, pending: 42, cancelled: 8,
  };

  const todayCards = [
    { label: "Today Total", value: s.todayTotal, color: "var(--brand)", colorBg: "var(--brand-light)", icon: <BoxIcon /> },
    { label: "Delivered", value: s.todayDelivered, color: "#0d7a4e", colorBg: "#d1fae5", icon: <CheckIcon /> },
    { label: "Pending", value: s.todayPending, color: "#b45309", colorBg: "#fef3c7", icon: <ClockIcon /> },
    { label: "Cancelled", value: s.todayCancelled, color: "#c0392b", colorBg: "#fde8e6", icon: <XIcon /> },
  ];

  const totalCards = [
    { label: "Total Deliveries", value: s.totalDeliveries, color: "var(--brand)", colorBg: "var(--brand-light)", icon: <BoxIcon /> },
    { label: "Delivered", value: s.delivered, color: "#0d7a4e", colorBg: "#d1fae5", icon: <CheckIcon /> },
    { label: "Pending", value: s.pending, color: "#b45309", colorBg: "#fef3c7", icon: <ClockIcon /> },
    { label: "Cancelled", value: s.cancelled, color: "#c0392b", colorBg: "#fde8e6", icon: <XIcon /> },
  ];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Delivery Dashboard"
        subtitle="Live overview of delivery operations"
        action={
          <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
            <SearchInput
              value={search}
              onChange={v => { setSearch(v); setShowDropdown(true); }}
              placeholder="Filter by agent…"
              width="240px"
            />
            {showDropdown && search && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "var(--white)", border: "1px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)",
                maxHeight: 220, overflowY: "auto", zIndex: 100,
              }}>
                <div
                  style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: "var(--ink-60)", borderBottom: "1px solid var(--ink-5)" }}
                  onClick={() => { setSelectedBoy(null); setSearch(""); setShowDropdown(false); }}
                >All agents</div>
                {filteredBoys.map(boy => (
                  <div
                    key={boy.id}
                    onClick={() => { setSelectedBoy(boy); setSearch(boy.name); setShowDropdown(false); }}
                    style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--ink-5)", transition: "background 0.12s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ink-5)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    <span style={{ fontWeight: 500, color: "var(--ink)" }}>{boy.name}</span>
                    <span style={{ color: "var(--ink-40)", marginLeft: 6 }}>{boy.phone}</span>
                  </div>
                ))}
                {filteredBoys.length === 0 && (
                  <div style={{ padding: "10px 14px", fontSize: 13, color: "var(--ink-40)" }}>No agents found</div>
                )}
              </div>
            )}
          </div>
        }
      />

      {selectedBoy && (
        <div style={{
          marginBottom: 20, padding: "10px 16px",
          background: "var(--brand-light)", borderRadius: "var(--radius-md)",
          border: "1px solid rgba(13,92,58,0.15)",
          display: "flex", alignItems: "center", gap: 10, fontSize: 13,
          color: "var(--brand)",
        }}>
          <span style={{ fontWeight: 700 }}>Showing data for:</span> {selectedBoy.name} · {selectedBoy.phone}
          <span
            style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.6 }}
            onClick={() => { setSelectedBoy(null); setSearch(""); }}
          >✕ Clear</span>
        </div>
      )}

      {/* Today */}
      <div style={{ marginBottom: 10 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Today's Performance
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="stagger">
          {todayCards.map(c => (
            <StatCard key={c.label} {...c} onClick={() => navigate("/delivery")} />
          ))}
        </div>
      </div>

      <div style={{ height: 24 }} />

      {/* Overall */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
          Overall Summary
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }} className="stagger">
          {totalCards.map(c => (
            <StatCard key={c.label} {...c} onClick={() => navigate("/delivery")} />
          ))}
        </div>
      </div>

      <div style={{ height: 24 }} />

      {/* Delivery Boys table */}
      <Card>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>Delivery Agents</h3>
          <span style={{ fontSize: 12, color: "var(--ink-40)" }}>{deliveryBoys.length} agents</span>
        </div>
        <DataTable
          headers={["Agent", "Phone", "Today", "Total", "Action"]}
          empty={deliveryBoys.length === 0}
          emptyText="No agents loaded"
        >
          {deliveryBoys.slice(0, 6).map(boy => (
            <TR key={boy.id} onClick={() => navigate(`/agents/${boy.id}`)}>
              <TD>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--brand-light)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: "var(--brand)", flexShrink: 0,
                  }}>{boy.name.slice(0, 2).toUpperCase()}</div>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{boy.name}</span>
                </div>
              </TD>
              <TD>{boy.phone}</TD>
              <TD><span style={{ fontWeight: 600 }}>—</span></TD>
              <TD><span style={{ fontWeight: 600 }}>—</span></TD>
              <TD>
                <span style={{ fontSize: 11.5, color: "var(--brand)", fontWeight: 600, cursor: "pointer" }}>View →</span>
              </TD>
            </TR>
          ))}
        </DataTable>
      </Card>
    </div>
  );
};

const BoxIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const ClockIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const XIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default Dashboard;
