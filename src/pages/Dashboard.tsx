import '../styles/pages/Dashboard.css';
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, Card, SearchInput } from "../components/ui";
import {
  getDeliverySummary, getOverallSummary, fetchDeliveryAgents,
  DeliverySummary, OverallSummary, DeliveryBoy,
} from "../services/dashboardService";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";

interface OnlineAgent {
  deliveryId:      number;
  deliveryBoyName: string;
  status:          "STARTED" | "PENDING";
  startTime:       string | null;
  totalDeliveries: number;
  deliveredCount:  number;
  totalAmount:     number;
}

const TEN_MINUTES = 10 * 60 * 1000;
const TWO_MINUTES  =  2 * 60 * 1000;

const DEMO_ONLINE: OnlineAgent[] = [
  { deliveryId: 50, deliveryBoyName: "DA1", status: "STARTED", startTime: "23-05-2026 09:15:00", totalDeliveries: 5,  deliveredCount: 3, totalAmount: 12500 },
  { deliveryId: 51, deliveryBoyName: "DA2", status: "PENDING", startTime: "23-05-2026 08:40:00", totalDeliveries: 8,  deliveredCount: 8, totalAmount: 34062 },
  { deliveryId: 74, deliveryBoyName: "DA3", status: "STARTED", startTime: "23-05-2026 10:05:00", totalDeliveries: 6,  deliveredCount: 2, totalAmount:  8400 },
  { deliveryId: 55, deliveryBoyName: "DA4", status: "STARTED", startTime: "23-05-2026 09:30:00", totalDeliveries: 7,  deliveredCount: 5, totalAmount: 21000 },
];

const DEMO: DeliverySummary = {
  todayTotal: 6,    todayDelivered: 4,   todayPending: 0,  todayCancelled: 2,
  totalDeliveries: 248, delivered: 198, pending: 42, cancelled: 8,
  todayNetValue: 78060,   totalNetValue: 980000,
  todayCollected: 52148,  totalCollected: 742000,
  assigned: 3, assignedValue: 15400,
  rejected: 1, rejectedValue: 4200,
};

const DEMO_OVERALL: OverallSummary = {
  closed: 198, closedValue: 742000, closedCollected: 715000,
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
const fmt = (v: number) => "₹" + (v ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

/* ── small stat card ─────────────────────────────────────────────────────── */
function MiniCard({
  label, count, amount, color, bg, onClick,
}: {
  label: string; count: number; amount: number;
  color: string; bg: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff", borderRadius: 12, padding: "18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        cursor: onClick ? "pointer" : "default",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"; }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)"; }}
    >
      {/* Count */}
      <div style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 44, height: 44, borderRadius: 11, background: bg,
        fontSize: 20, fontWeight: 800, color, marginBottom: 10,
      }}>{count}</div>
      {/* Amount */}
      <div style={{ fontSize: 14, fontWeight: 700, color, marginBottom: 4 }}>{fmt(amount)}</div>
      {/* Label */}
      <div style={{ fontSize: 12, color: "var(--ink-40)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/* ── wide amount card ────────────────────────────────────────────────────── */
function WideCard({
  label, value, sub, color, bg, icon,
}: {
  label: string; value: number; sub: string;
  color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, padding: "20px 24px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: bg, color,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1 }}>{fmt(value)}</div>
        <div style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 5 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ── Dashboard ───────────────────────────────────────────────────────────── */
const Dashboard: React.FC = () => {
  const [tab, setTab]               = useState<"today" | "overall">("today");
  const [summary, setSummary]       = useState<DeliverySummary | null>(null);
  const [overall, setOverall]       = useState<OverallSummary | null>(null);
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [selectedBoy, setSelectedBoy]  = useState<DeliveryBoy | null>(null);
  const [search, setSearch]            = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [onlineAgents, setOnlineAgents] = useState<OnlineAgent[]>(DEMO_ONLINE);
  const navigate = useNavigate();

  const loadOnlineAgents = useCallback(async () => {
    try {
      const res = await fetch(ApiEndpoints.ONLINE_AGENTS, { headers: authHeaders() });
      if (res.ok) setOnlineAgents(await res.json());
    } catch { /* keep demo */ }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getDeliverySummary(selectedBoy?.id ?? null);
      setSummary(data);
    } catch { /* keep demo */ }
    try {
      const ov = await getOverallSummary(selectedBoy?.id ?? null);
      setOverall(ov);
    } catch { /* keep demo */ }
  }, [selectedBoy]);

  const loadDeliveryBoys = async () => {
    try {
      const res = await fetchDeliveryAgents();
      const mapped = res.map((b: any) => ({ id: b.id, name: b.name || "", phone: b.contact || "" }));
      setDeliveryBoys(mapped);
      localStorage.setItem("DELIVERY_BOYS", JSON.stringify(mapped));
    } catch { /* silent */ }
  };

  useEffect(() => { loadDeliveryBoys(); }, []);
  useEffect(() => {
    loadSummary();
    const iv = setInterval(loadSummary, TEN_MINUTES);
    return () => clearInterval(iv);
  }, [loadSummary]);
  useEffect(() => {
    loadOnlineAgents();
    const iv = setInterval(loadOnlineAgents, TWO_MINUTES);
    return () => clearInterval(iv);
  }, [loadOnlineAgents]);

  const s = summary ?? DEMO;
  const o = overall ?? DEMO_OVERALL;
  const todayStr = new Date().toLocaleDateString("en-GB");

  const filteredBoys = deliveryBoys.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) || b.phone.includes(search)
  );

  /* data for each tab */
  const isToday = tab === "today";
  const cards = isToday
    ? [
        { label: "Total", count: s.todayTotal,     amount: s.todayNetValue   ?? 0, color: "#5b21b6", bg: "#ede9fe", filter: "ALL" },
        { label: "Assignments",      count: s.assigned ?? 0,  amount: s.assignedValue   ?? 0, color: "#1e40af", bg: "#dbeafe", filter: "ALL", to: "/assignments?status=9" },
        { label: "Rejected",         count: s.rejected ?? 0,  amount: s.rejectedValue   ?? 0, color: "#7f1d1d", bg: "#fee2e2", filter: "ALL", to: "/assignments?status=8" },
        { label: "Delivered",        count: s.todayDelivered, amount: s.todayCollected  ?? 0, color: "#065f46", bg: "#d1fae5", filter: "YES" },
        { label: "Pending",          count: s.todayPending,   amount: 0,                       color: "#b45309", bg: "#fef3c7", filter: "NO"  },
        { label: "Cancelled",        count: s.todayCancelled, amount: 0,                       color: "#9d174d", bg: "#fce7f3", filter: "NO"  },
      ]
    : [
        { label: "Closed", count: o.closed, amount: o.closedValue ?? 0, color: "#1e40af", bg: "#dbeafe", filter: "ALL", to: "/invoice-report" },
      ];

  const netValue  = isToday ? (s.todayNetValue  ?? 0) : (o.closedValue     ?? 0);
  const collected = isToday ? (s.todayCollected ?? 0) : (o.closedCollected ?? 0);
  const netLabel  = isToday ? "Total invoice value today"      : "Closed orders invoice value";
  const colLabel  = isToday ? "Payment received today"         : "Closed orders payment received";

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
              width="220px"
            />
            {showDropdown && search && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100,
                background: "#fff", border: "1px solid var(--ink-10)",
                borderRadius: "var(--radius-md)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                maxHeight: 220, overflowY: "auto",
              }}>
                <div
                  style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", color: "var(--ink-60)", borderBottom: "1px solid var(--ink-5)" }}
                  onClick={() => { setSelectedBoy(null); setSearch(""); setShowDropdown(false); }}
                >All agents</div>
                {filteredBoys.map(boy => (
                  <div key={boy.id}
                    onClick={() => { setSelectedBoy(boy); setSearch(boy.name); setShowDropdown(false); }}
                    style={{ padding: "10px 14px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid var(--ink-5)" }}
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
          marginBottom: 16, padding: "9px 16px",
          background: "var(--brand-light)", borderRadius: "var(--radius-md)",
          display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--brand)",
        }}>
          <span style={{ fontWeight: 700 }}>Showing data for:</span>
          {selectedBoy.name} · {selectedBoy.phone}
          <span style={{ marginLeft: "auto", cursor: "pointer", opacity: 0.6 }}
            onClick={() => { setSelectedBoy(null); setSearch(""); }}>✕ Clear</span>
        </div>
      )}

      {/* ── Tab pills ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {(["today", "overall"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
            fontWeight: 600, fontSize: 13, fontFamily: "'Inter', sans-serif",
            background: tab === t ? "var(--brand)" : "transparent",
            color: tab === t ? "#fff" : "var(--ink-60)",
            transition: "all 0.15s",
          }}>
            {t === "today" ? "Today's performance" : "Overall summary"}
          </button>
        ))}
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 }}>
        {cards.map(c => (
          <MiniCard
            key={c.label}
            label={c.label}
            count={c.count}
            amount={c.amount}
            color={c.color}
            bg={c.bg}
            onClick={() => {
              if ("to" in c && c.to) { navigate(c.to); return; }
              isToday
                ? navigate(`/delivery?delivered=${c.filter}&from=${todayStr}&to=${todayStr}`)
                : navigate(`/delivery?delivered=${c.filter}`);
            }}
          />
        ))}
      </div>

      {/* ── Net value + Collected ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        <WideCard label={isToday ? "TODAY NET VALUE" : "TOTAL NET VALUE"} value={netValue}  sub={netLabel}  color="#1e40af" bg="#dbeafe" icon={<NetValueIcon />} />
        <WideCard label={isToday ? "TODAY COLLECTED" : "TOTAL COLLECTED"} value={collected} sub={colLabel}  color="#065f46" bg="#d1fae5" icon={<CollectedIcon />} />
      </div>

      {/* ── Online Agents table ── */}
      <Card>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Online Agents
          </span>
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center", width: 8, height: 8 }}>
            <span style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "#10b981", opacity: 0.5, animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite" }} />
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} />
          </span>
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>
            {onlineAgents.length} active today
          </span>
        </div>

        {onlineAgents.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-40)", textAlign: "center", padding: "20px 0" }}>No agents online right now</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ink-10)" }}>
                  {["AGENT","ID","SINCE", ...(isToday ? ["STATUS"] : []), "DELIVERED","PROGRESS","COLLECTED"].map(h => (
                    <th key={h} style={{
                      padding: "8px 12px", textAlign: "left",
                      fontSize: 10.5, fontWeight: 700, color: "var(--ink-40)",
                      textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {onlineAgents.map((agent, i) => {
                  const isStarted = agent.status === "STARTED";
                  const pct       = agent.totalDeliveries > 0
                    ? Math.round((agent.deliveredCount / agent.totalDeliveries) * 100) : 0;
                  const initials  = (agent.deliveryBoyName ?? "DA").slice(0, 2).toUpperCase();
                  const timeLabel = agent.startTime?.split(" ")[1]?.slice(0, 5) ?? "—";
                  const rowBg     = i % 2 === 0 ? "#fff" : "transparent";

                  return (
                    <tr key={agent.deliveryId} style={{ background: rowBg, borderBottom: "1px solid var(--ink-5)" }}>

                      {/* AGENT */}
                      <td style={{ padding: "12px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%",
                              background: isStarted ? "#d1fae5" : "var(--brand-light)",
                              color: isStarted ? "#065f46" : "var(--brand)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 12, fontWeight: 800,
                            }}>{initials}</div>
                            <span style={{
                              position: "absolute", bottom: 1, right: 1,
                              width: 8, height: 8, borderRadius: "50%",
                              background: isStarted ? "#10b981" : "#7c3aed",
                              border: "2px solid #fff",
                            }} />
                          </div>
                          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{agent.deliveryBoyName}</span>
                        </div>
                      </td>

                      {/* ID */}
                      <td style={{ padding: "12px 12px", color: "var(--ink-60)", fontWeight: 600 }}>
                        #{agent.deliveryId}
                      </td>

                      {/* SINCE */}
                      <td style={{ padding: "12px 12px", color: "var(--ink-60)", fontFamily: "monospace", fontSize: 12.5 }}>
                        {timeLabel}
                      </td>

                      {/* STATUS — today only */}
                      {isToday && (
                        <td style={{ padding: "12px 12px" }}>
                          <span style={{
                            display: "inline-block", padding: "4px 12px", borderRadius: 50,
                            fontSize: 11.5, fontWeight: 700,
                            background: isStarted ? "#d1fae5" : "var(--brand-xlight)",
                            color: isStarted ? "#065f46" : "var(--brand)",
                            border: `1px solid ${isStarted ? "#6ee7b7" : "var(--brand)"}`,
                          }}>
                            {isStarted ? "Active" : "Submitting"}
                          </span>
                        </td>
                      )}

                      {/* DELIVERED */}
                      <td style={{ padding: "12px 12px", fontWeight: 600, color: "var(--ink)" }}>
                        {agent.deliveredCount}/{agent.totalDeliveries}
                      </td>

                      {/* PROGRESS */}
                      <td style={{ padding: "12px 12px", minWidth: 140 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 50, overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: isStarted ? "#10b981" : "var(--brand)",
                              borderRadius: 50,
                            }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-60)", minWidth: 34 }}>{pct}%</span>
                        </div>
                      </td>

                      {/* COLLECTED */}
                      <td style={{ padding: "12px 12px", fontWeight: 700, color: "var(--ink)", textAlign: "right", whiteSpace: "nowrap" }}>
                        {agent.totalAmount > 0 ? fmt(agent.totalAmount) : <span style={{ color: "var(--ink-30)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ── Icons ───────────────────────────────────────────────────────────────── */
const NetValueIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const CollectedIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;

export default Dashboard;
