import '../styles/pages/Dashboard.css';
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, SearchInput } from "../components/ui";
import {
  getDeliverySummary, getOverallSummary, getOverallReport, fetchDeliveryAgents,
  DeliverySummary, OverallSummary, OverallReport, DeliveryBoy,
} from "../services/dashboardService";

const TEN_MINUTES = 10 * 60 * 1000;

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
  const [report,  setReport]        = useState<OverallReport | null>(null);
  const [repMonth, setRepMonth]     = useState(new Date().getMonth() + 1);
  const [repYear]                   = useState(new Date().getFullYear());
  const [deliveryBoys, setDeliveryBoys] = useState<DeliveryBoy[]>([]);
  const [selectedBoy, setSelectedBoy]  = useState<DeliveryBoy | null>(null);
  const [search, setSearch]            = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

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
    if (tab !== "overall") return;
    getOverallReport(repMonth, repYear).then(setReport).catch(() => {});
  }, [tab, repMonth, repYear]);
  useEffect(() => {
    loadSummary();
    const iv = setInterval(loadSummary, TEN_MINUTES);
    return () => clearInterval(iv);
  }, [loadSummary]);

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

      {/* ── TODAY: stat cards + wide cards ── */}
      {isToday && (
        <>
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
                  navigate(`/delivery?delivered=${c.filter}&from=${todayStr}&to=${todayStr}`);
                }}
              />
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
            <WideCard label="TODAY NET VALUE" value={netValue}  sub={netLabel} color="#1e40af" bg="#dbeafe" icon={<NetValueIcon />} />
            <WideCard label="TODAY COLLECTED" value={collected} sub={colLabel} color="#065f46" bg="#d1fae5" icon={<CollectedIcon />} />
          </div>
        </>
      )}

      {/* ── OVERALL: monthly report from payment_details ── */}
      {!isToday && (
        <OverallReportView
          report={report}
          month={repMonth}
          onMonthChange={setRepMonth}
          onCreditClick={() => navigate("/invoice-report")}
        />
      )}

    </div>
  );
};

/* ── Icons ───────────────────────────────────────────────────────────────── */
/* ── Overall monthly report view ─────────────────────────────────────────── */

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// CVD-validated categorical palette (checked with dataviz validator)
const MODE_COLORS: { key: keyof OverallReport; label: string; color: string }[] = [
  { key: "cashAmount",   label: "Cash",   color: "#2563eb" },
  { key: "upiAmount",    label: "UPI",    color: "#15803d" },
  { key: "chequeAmount", label: "Cheque", color: "#db2777" },
  { key: "neftAmount",   label: "NEFT",   color: "#d97706" },
  { key: "creditAmount", label: "Credit", color: "#64748b" },
];

function StatTile({ label, value, sub, sub2, danger, onClick }: {
  label: string; value: string; sub?: string; sub2?: string; danger?: boolean; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        background: danger ? "#fee2e2" : "#fff",
        border: `1px solid ${danger ? "#fca5a5" : "var(--ink-10)"}`,
        borderRadius: 12, padding: "16px 18px",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ fontSize: 12, color: danger ? "#991b1b" : "var(--ink-40)", marginBottom: 8, fontWeight: 600 }}>
        {danger ? "⚠ " : ""}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: danger ? "#b91c1c" : "var(--ink)", lineHeight: 1 }}>{value}</div>
      {sub  && <div style={{ fontSize: 12, color: danger ? "#991b1b" : "var(--ink-60)", marginTop: 6 }}>{sub}</div>}
      {sub2 && <div style={{ fontSize: 11.5, color: danger ? "#991b1b" : "var(--ink-40)", marginTop: 2 }}>{sub2}</div>}
    </div>
  );
}

function OverallReportView({ report, month, onMonthChange, onCreditClick }: {
  report: OverallReport | null;
  month: number;
  onMonthChange: (m: number) => void;
  onCreditClick: () => void;
}) {
  const r = report;
  const modes = MODE_COLORS
    .map(m => ({ ...m, amount: (r?.[m.key] as number) ?? 0 }))
    .filter(m => m.amount > 0);
  const modeTotal = modes.reduce((s, m) => s + m.amount, 0);
  const maxCredit = Math.max(1, ...(r?.topCreditStores ?? []).map(s => s.amount));

  // Donut geometry: r=60, thin ring, 2px surface gaps between segments
  const R = 60, C = 2 * Math.PI * R;
  let acc = 0;
  const segments = modes.map(m => {
    const frac = modeTotal > 0 ? m.amount / modeTotal : 0;
    const seg = { ...m, offset: acc * C, len: Math.max(0, frac * C - 3) };
    acc += frac;
    return seg;
  });

  return (
    <div>
      {/* Month filter */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 180 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Month</label>
          <select
            value={month}
            onChange={e => onMonthChange(Number(e.target.value))}
            style={{
              padding: "9px 12px", border: "1.5px solid var(--ink-10)", borderRadius: 8,
              fontSize: 13, fontFamily: "'Inter',sans-serif", background: "#fff", outline: "none",
            }}
          >
            {MONTH_NAMES.map((mn, i) => <option key={i} value={i + 1}>{mn}</option>)}
          </select>
        </div>
      </div>

      {/* Stat tiles — each opens the Invoice Report */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <StatTile label="Total orders"      value={String(r?.totalOrders ?? 0)}   sub="Closed"           onClick={onCreditClick} />
        <StatTile label="Total net value"   value={fmt(r?.totalNetValue ?? 0)}    sub="Invoice value"    onClick={onCreditClick} />
        <StatTile label="Total collected"   value={fmt(r?.totalCollected ?? 0)}   sub="Payment received" onClick={onCreditClick} />
        <StatTile
          label="Outstanding credit"
          value={fmt(r?.outstandingCredit ?? 0)}
          sub="Net − collected"
          sub2={`${r?.pendingStores ?? 0} stores pending`}
          danger
          onClick={onCreditClick}
        />
      </div>

      {/* Charts row — cards open the Invoice Report */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>

        {/* Payment mode breakdown — donut */}
        <div
          onClick={onCreditClick}
          style={{ background: "#fff", border: "1px solid var(--ink-10)", borderRadius: 12, padding: "16px 20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Payment mode breakdown</span>
            <span style={{ fontSize: 12, color: "var(--ink-40)" }}>{MONTH_NAMES[month - 1]}</span>
          </div>

          {modes.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-40)", fontSize: 13 }}>
              No payments recorded for this month
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              {/* Legend — identity + amount, never color alone */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 190 }}>
                {modes.map(m => (
                  <div key={m.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 11, height: 11, borderRadius: 3, background: m.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12.5, color: "var(--ink)", fontWeight: 600 }}>{m.label}</span>
                    <span style={{ fontSize: 12.5, color: "var(--ink-60)" }}>
                      {modeTotal > 0 ? Math.round((m.amount / modeTotal) * 100) : 0}% · {fmt(m.amount)}
                    </span>
                  </div>
                ))}
              </div>

              <svg width="170" height="170" viewBox="0 0 170 170" role="img" aria-label="Payment mode breakdown">
                {segments.map(s => (
                  <circle
                    key={s.label}
                    cx="85" cy="85" r={R}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="26"
                    strokeDasharray={`${s.len} ${C - s.len}`}
                    strokeDashoffset={-s.offset}
                    transform="rotate(-90 85 85)"
                  >
                    <title>{`${s.label}: ${fmt(s.amount)}`}</title>
                  </circle>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Top 5 credit stores — single-hue bars (magnitude, one measure) */}
        <div
          onClick={onCreditClick}
          style={{ background: "#fff", border: "1px solid var(--ink-10)", borderRadius: 12, padding: "16px 20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>Top 5 credit stores</span>
            <span style={{ fontSize: 12, color: "var(--ink-40)" }}>{MONTH_NAMES[month - 1]}</span>
          </div>

          {(r?.topCreditStores ?? []).length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--ink-40)", fontSize: 13 }}>
              No outstanding credit this month
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(r?.topCreditStores ?? []).map(s => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10 }} title={`${s.name}: ${fmt(s.amount)}`}>
                  <span style={{
                    width: 120, fontSize: 12, color: "var(--ink)", textAlign: "right",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0,
                  }}>{s.name}</span>
                  <div style={{ flex: 1, height: 18, background: "var(--ink-5)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{
                      width: `${(s.amount / maxCredit) * 100}%`, height: "100%",
                      background: "#b91c1c", borderRadius: "0 4px 4px 0",
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", width: 70, flexShrink: 0 }}>
                    {fmt(s.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const NetValueIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
const CollectedIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>;

export default Dashboard;
