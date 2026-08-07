import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { fetchViolationRows } from "../services/DeliveryService";
import { CustomerService } from "../services/customerService";

/* ── helpers ─────────────────────────────────────────────────── */
const toDay  = () => { const d = new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const sixMonthsAgo = () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };
const toInputVal  = (dmy: string) => { const [dd,mm,yyyy] = dmy.split("/"); return `${yyyy}-${mm}-${dd}`; };
const fromInputVal = (iso: string) => { const [yyyy,mm,dd] = iso.split("-"); return `${dd}/${mm}/${yyyy}`; };
const fmtAmt = (n: number) => "₹" + Number(n).toLocaleString("en-IN");
const ordinal = (n: number) => { const s=["th","st","nd","rd"]; const v=n%100; return n+(s[(v-20)%10]||s[v]||s[0]); };
const shortDMY = (iso: string) => { const [y,m,d]=iso.split("-"); return `${d}/${m}/${y.slice(2)}`; };

function haverDist(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R=6371000, r=Math.PI/180;
  const dLat=(lat2-lat1)*r, dLng=(lng2-lng1)*r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

/* ── types ───────────────────────────────────────────────────── */
interface ViolationRow {
  direId: number; agentId: number; agentName: string;
  custName: string; custNo: string; invoiceNo: string;
  date: string;                          // yyyy-MM-dd from API
  delLat: number; delLng: number;        // actual delivery GPS
  custLat: number; custLng: number;      // customer registered location
  netValue: number; delivered: boolean;
  dist: number;                          // computed haversine metres
}

interface StoreGroup {
  custNo: string; custName: string; agentName: string;
  invoiceNo: string;
  byDate: Record<string, ViolationRow>;  // date → worst row that day
  peakDist: number;
  hasFlagged: boolean;
}

/* ── map projection ──────────────────────────────────────────── */
const SVG_W = 900, SVG_H = 600;
const PAD   = 0.005;

function calcBounds(rows: ViolationRow[]) {
  const lats = rows.flatMap(r => [r.delLat, r.custLat]).filter(v => v > 1);
  const lngs = rows.flatMap(r => [r.delLng, r.custLng]).filter(v => v > 1);
  if (!lats.length) return { latMin:20.22, latMax:20.38, lngMin:85.77, lngMax:85.88 };
  return { latMin:Math.min(...lats)-PAD, latMax:Math.max(...lats)+PAD, lngMin:Math.min(...lngs)-PAD, lngMax:Math.max(...lngs)+PAD };
}

type Bounds = ReturnType<typeof calcBounds>;

function toXY(lat: number, lng: number, b: Bounds) {
  return {
    x: ((lng - b.lngMin) / (b.lngMax - b.lngMin)) * SVG_W,
    y: ((b.latMax - lat) / (b.latMax - b.latMin)) * SVG_H,
  };
}

function xyToLatLng(x: number, y: number, b: Bounds) {
  return {
    lat: b.latMax - (y / SVG_H) * (b.latMax - b.latMin),
    lng: b.lngMin + (x / SVG_W) * (b.lngMax - b.lngMin),
  };
}

/* ── badge colour by distance ────────────────────────────────── */
function badgeStyle(dist: number, radius: number): React.CSSProperties {
  if (!dist)              return { background: "#f1f5f9", color: "#94a3b8" };
  if (dist <= radius)     return { background: "#dcfce7", color: "#166534" };
  if (dist <= radius * 2) return { background: "#fef3c7", color: "#92400e" };
  return                         { background: "#fee2e2", color: "#991b1b" };
}

/* ── export CSV ──────────────────────────────────────────────── */
function exportCSV(groups: StoreGroup[], dates: string[]) {
  const header = ["Store","CustNo","Invoice","Agent",...dates.map((_,i)=>ordinal(i+1))].join(",");
  const rows = groups.map(g => {
    const cells = dates.map(d => g.byDate[d]?.dist ?? "");
    return [g.custName, g.custNo, g.invoiceNo, g.agentName, ...cells].join(",");
  });
  const csv  = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a"); a.href=url; a.download="deviation-report.csv"; a.click();
  URL.revokeObjectURL(url);
}

/* ── component ───────────────────────────────────────────────── */
const DeliveryViolationPage: React.FC = () => {
  const [fromDate, setFromDate] = useState(sixMonthsAgo);
  const [toDate,   setToDate]   = useState(toDay);
  const [loading,  setLoading]  = useState(false);
  const [data,     setData]     = useState<ViolationRow[]>([]);
  const [error,    setError]    = useState("");

  const [agentFilter, setAgentFilter] = useState("all");
  const [radius,      setRadius]      = useState(100);

  /* selected store group key for map panel */
  const [mapKey, setMapKey] = useState<string | null>(null);

  /* selected individual row inside the map */
  const [activeRow, setActiveRow] = useState<ViolationRow | null>(null);

  /* location picking mode */
  type PickMode = "idle" | "picking" | "confirm";
  const [pickMode, setPickMode]       = useState<PickMode>("idle");
  const [pendingLoc, setPendingLoc]   = useState<{ lat: number; lng: number } | null>(null);
  const [saving,     setSaving]       = useState(false);
  const [saveError,  setSaveError]    = useState("");

  const svgRef = useRef<SVGSVGElement>(null);

  /* ── load ── */
  const load = useCallback(() => {
    setLoading(true); setError(""); setMapKey(null); setActiveRow(null); setPickMode("idle");
    fetchViolationRows(fromDate, toDate)
      .then((rows: Omit<ViolationRow,"dist">[]) =>
        setData((Array.isArray(rows) ? rows : []).map(r => ({
          ...r,
          dist: r.custLat && r.custLng ? haverDist(r.delLat, r.delLng, r.custLat, r.custLng) : 0,
        })))
      )
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  /* ── derived ── */
  const agents = useMemo(() => Array.from(new Set(data.map(d => d.agentName))).sort(), [data]);

  const filtered = useMemo(() => data.filter(d =>
    agentFilter === "all" || d.agentName === agentFilter
  ), [data, agentFilter]);

  /* Unique dates sorted ascending */
  const dates = useMemo(() => Array.from(new Set(filtered.map(d => d.date))).sort(), [filtered]);

  /* Group by customer */
  const groups = useMemo<StoreGroup[]>(() => {
    const map = new Map<string, StoreGroup>();
    for (const row of filtered) {
      const key = row.custNo || row.custName;
      if (!map.has(key)) {
        map.set(key, { custNo: row.custNo, custName: row.custName, agentName: row.agentName, invoiceNo: row.invoiceNo, byDate: {}, peakDist: 0, hasFlagged: false });
      }
      const g = map.get(key)!;
      // Keep worst row per date
      if (!g.byDate[row.date] || row.dist > g.byDate[row.date].dist) g.byDate[row.date] = row;
      if (row.dist > g.peakDist) g.peakDist = row.dist;
      if (row.dist > radius) g.hasFlagged = true;
    }
    return Array.from(map.values()).sort((a,b) => b.peakDist - a.peakDist);
  }, [filtered, radius]);

  const flaggedCount = groups.filter(g => g.hasFlagged).length;

  /* Map data: all rows for the selected store group */
  const mapGroup  = mapKey ? groups.find(g => (g.custNo || g.custName) === mapKey) ?? null : null;
  const mapRows   = useMemo(() => mapGroup ? Object.values(mapGroup.byDate) : [], [mapGroup]);
  const peakRow   = useMemo(() => mapRows.reduce<ViolationRow|null>((best, r) => (!best || r.dist > best.dist) ? r : best, null), [mapRows]);
  const bounds    = useMemo(() => calcBounds(mapRows), [mapRows]);
  const osmBbox   = `${bounds.lngMin}%2C${bounds.latMin}%2C${bounds.lngMax}%2C${bounds.latMax}`;

  /* ── map click handler (for location picking) ── */
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pickMode !== "picking") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pctX = (e.clientX - rect.left) / rect.width;
    const pctY = (e.clientY - rect.top)  / rect.height;
    const { lat, lng } = xyToLatLng(pctX * SVG_W, pctY * SVG_H, bounds);
    setPendingLoc({ lat, lng });
    setPickMode("confirm");
  };

  const handleAClick = (row: ViolationRow) => {
    if (pickMode !== "idle") return;
    setActiveRow(row);
    setPickMode("picking");
    setSaveError("");
    setPendingLoc(null);
  };

  const cancelPick = () => { setPickMode("idle"); setPendingLoc(null); setSaveError(""); };

  const saveLoc = async () => {
    if (!pendingLoc || !activeRow) return;
    setSaving(true); setSaveError("");
    try {
      await CustomerService.updateLocation(activeRow.custNo, pendingLoc.lat, pendingLoc.lng);
      setPickMode("idle"); setPendingLoc(null); load();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  /* ── render map SVG overlay ── */
  const renderMapSvg = () => {
    if (!mapGroup || !peakRow) return null;
    const custPt = peakRow.custLat > 1 ? toXY(peakRow.custLat, peakRow.custLng, bounds) : null;
    const isPickingOrConfirm = pickMode === "picking" || pickMode === "confirm";

    return (
      <svg
        ref={svgRef}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", cursor: pickMode==="picking" ? "crosshair" : "default" }}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        preserveAspectRatio="none"
        onClick={handleSvgClick}
      >
        {/* Gray overlay in picking mode */}
        {isPickingOrConfirm && (
          <rect x={0} y={0} width={SVG_W} height={SVG_H} fill="rgba(100,100,100,0.35)" />
        )}

        {/* P pin = planned/registered customer location */}
        {custPt && !isPickingOrConfirm && (
          <g style={{ pointerEvents: "none" }}>
            <circle cx={custPt.x} cy={custPt.y} r={14} fill="#CBD5E1" stroke="#94A3B8" strokeWidth={2} />
            <text x={custPt.x} y={custPt.y+1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold" fill="#475569">P</text>
          </g>
        )}

        {/* Pending location pin */}
        {pickMode === "confirm" && pendingLoc && (() => {
          const pt = toXY(pendingLoc.lat, pendingLoc.lng, bounds);
          return (
            <g style={{ pointerEvents: "none" }}>
              <circle cx={pt.x} cy={pt.y} r={14} fill="#534AB7" stroke="#fff" strokeWidth={2.5} />
              <text x={pt.x} y={pt.y+1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight="bold" fill="#fff">A</text>
            </g>
          );
        })()}

        {/* A pins = actual delivery locations */}
        {mapRows.map(row => {
          const pt     = toXY(row.delLat, row.delLng, bounds);
          const isPeak = row.direId === peakRow.direId;
          const isSel  = activeRow?.direId === row.direId;
          const color  = "#7C2D12";

          if (isPickingOrConfirm) {
            // In picking mode only show the selected row's A pin, dimmed others
            if (!isSel) return null;
          }

          return (
            <g key={row.direId} style={{ pointerEvents: isPickingOrConfirm ? "none" : "all", cursor: "pointer" }}
              onClick={e => { e.stopPropagation(); handleAClick(row); }}>

              {/* Line from A to P (only for peak row, not in picking mode) */}
              {isPeak && custPt && !isPickingOrConfirm && (
                <>
                  <line x1={pt.x} y1={pt.y} x2={custPt.x} y2={custPt.y}
                    stroke="#DC2626" strokeWidth={2} strokeDasharray="10 5" />

                  {/* "+Xm peak dev." label */}
                  <rect
                    x={(pt.x+custPt.x)/2 - 48} y={(pt.y+custPt.y)/2 - 12}
                    width={96} height={22} rx={5}
                    fill="white" stroke="#e2e8f0" strokeWidth={1} />
                  <text
                    x={(pt.x+custPt.x)/2} y={(pt.y+custPt.y)/2 + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fontWeight="700" fill="#DC2626"
                    style={{ pointerEvents: "none" }}>
                    +{row.dist} m peak dev.
                  </text>
                </>
              )}

              {/* Outer ring for selected/peak */}
              {(isSel || isPeak) && !isPickingOrConfirm && (
                <circle cx={pt.x} cy={pt.y} r={20} fill="none" stroke={color} strokeWidth={1.5} opacity={0.25} />
              )}

              {/* A pin */}
              <circle cx={pt.x} cy={pt.y} r={isSel ? 15 : 12}
                fill={color} stroke="#fff" strokeWidth={2} />
              <text x={pt.x} y={pt.y+1} textAnchor="middle" dominantBaseline="middle"
                fontSize={isSel ? 12 : 10} fontWeight="bold" fill="#fff"
                style={{ pointerEvents: "none" }}>A</text>
            </g>
          );
        })}
      </svg>
    );
  };

  /* ═══════════════════════════════════════════════════════════ */
  return (
    <div style={{ margin:"-24px", height:"calc(100vh - 60px)", display:"flex", flexDirection:"column", overflow:"hidden", fontFamily:"'Inter',sans-serif", background:"#f8fafc" }}>

      {/* ── Top header bar ── */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"10px 20px", display:"flex", alignItems:"center", gap:12, flexShrink:0, flexWrap:"wrap" }}>

        {/* Title */}
        <span style={{ fontSize:15, fontWeight:700, color:"#1a1a2e", whiteSpace:"nowrap" }}>Delivery deviation</span>

        {/* Agent badge (shows when one agent selected) */}
        {agentFilter !== "all" && (
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#EEF2FF", border:"1px solid #C7D2FE", borderRadius:20, padding:"3px 10px 3px 8px" }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:"#534AB7" }} />
            <span style={{ fontSize:12, fontWeight:600, color:"#3730A3" }}>DA-{String(agentFilter).padStart(3,"0")} · {agentFilter}</span>
            <button onClick={() => setAgentFilter("all")} style={{ background:"none", border:"none", cursor:"pointer", color:"#818CF8", fontSize:14, lineHeight:1, padding:"0 0 0 2px" }}>×</button>
          </div>
        )}

        <div style={{ flex:1 }} />

        {/* Filters */}
        <input type="date" value={toInputVal(fromDate)} onChange={e => setFromDate(fromInputVal(e.target.value))}
          style={{ padding:"5px 8px", border:"1px solid #e2e8f0", borderRadius:7, fontSize:12, outline:"none", color:"#334155" }} />
        <span style={{ fontSize:11, color:"#94a3b8" }}>→</span>
        <input type="date" value={toInputVal(toDate)} onChange={e => setToDate(fromInputVal(e.target.value))}
          style={{ padding:"5px 8px", border:"1px solid #e2e8f0", borderRadius:7, fontSize:12, outline:"none", color:"#334155" }} />

        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          style={{ padding:"5px 8px", border:"1px solid #e2e8f0", borderRadius:7, fontSize:12, outline:"none", color:"#334155", minWidth:120 }}>
          <option value="all">All agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Radius */}
        <div style={{ display:"flex", alignItems:"center", gap:6, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:7, padding:"4px 10px" }}>
          <span style={{ fontSize:11, color:"#64748b" }}>Radius</span>
          <input type="range" min={50} max={500} step={25} value={radius} onChange={e => setRadius(Number(e.target.value))}
            style={{ width:70, accentColor:"#534AB7" }} />
          <span style={{ fontSize:11, fontWeight:700, color:"#534AB7", minWidth:32 }}>{radius}m</span>
        </div>

        <button onClick={load} disabled={loading}
          style={{ padding:"6px 14px", background:"#534AB7", color:"#fff", border:"none", borderRadius:7, fontWeight:600, fontSize:12, cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1 }}>
          {loading ? "…" : "⟳ Load"}
        </button>

        {/* Export */}
        <button onClick={() => exportCSV(groups, dates)}
          style={{ padding:"6px 14px", background:"#fff", color:"#334155", border:"1px solid #e2e8f0", borderRadius:7, fontWeight:600, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", gap:5 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
      </div>

      {error && (
        <div style={{ background:"#FEE2E2", borderBottom:"1px solid #FCA5A5", padding:"7px 20px", fontSize:12, color:"#991B1B", flexShrink:0 }}>{error}</div>
      )}

      {/* ── Body ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

        {/* ── Table pane ── */}
        <div style={{ flex: mapKey ? "0 0 55%" : "1 1 auto", display:"flex", flexDirection:"column", overflow:"hidden", transition:"flex 0.2s" }}>

          {/* Sub-header */}
          <div style={{ padding:"11px 20px", background:"#fff", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center", flexShrink:0 }}>
            <span style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>Deviation summary — click row to view map</span>
            {flaggedCount > 0 && (
              <span style={{ fontSize:12, fontWeight:700, color:"#991b1b", background:"#fee2e2", border:"1px solid #fecaca", borderRadius:20, padding:"2px 10px" }}>
                {flaggedCount} flagged
              </span>
            )}
          </div>

          {/* Colour legend */}
          <div style={{ display:"flex", gap:16, padding:"7px 20px", background:"#fafafa", borderBottom:"1px solid #f1f5f9", flexShrink:0, flexWrap:"wrap" }}>
            {[
              { bg:"#dcfce7", color:"#166534", label:`≤ ${radius}m — OK` },
              { bg:"#fef3c7", color:"#92400e", label:`${radius}–${radius*2}m — Caution` },
              { bg:"#fee2e2", color:"#991b1b", label:`> ${radius*2}m — Flagged` },
            ].map(c => (
              <div key={c.label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span style={{ display:"inline-block", width:30, textAlign:"center", padding:"2px 0", borderRadius:5, fontSize:10, fontWeight:700, background:c.bg, color:c.color }}>—</span>
                <span style={{ fontSize:11, color:"#64748b" }}>{c.label}</span>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ flex:1, overflowY:"auto", overflowX:"auto" }}>
            {loading ? (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200 }}>
                <div style={{ width:34, height:34, borderRadius:"50%", border:"3px solid #ede9fe", borderTopColor:"#534AB7", animation:"spin .7s linear infinite" }} />
              </div>
            ) : groups.length === 0 ? (
              <div style={{ padding:60, textAlign:"center", color:"#94a3b8" }}>
                <div style={{ fontSize:32, marginBottom:8, opacity:.4 }}>📋</div>
                <p style={{ fontSize:13 }}>No data — adjust filters and click Load</p>
              </div>
            ) : (
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:480 }}>
                <thead>
                  <tr style={{ background:"#f8fafc", borderBottom:"1px solid #e2e8f0", position:"sticky", top:0, zIndex:2 }}>
                    <th style={TH}>#</th>
                    <th style={{ ...TH, textAlign:"left" }}>Store</th>
                    {dates.map((d, i) => (
                      <th key={d} style={{ ...TH, minWidth:52 }} title={shortDMY(d)}>{ordinal(i+1)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, idx) => {
                    const key     = g.custNo || g.custName;
                    const isSel   = mapKey === key;
                    return (
                      <tr key={key}
                        onClick={() => { setMapKey(isSel ? null : key); setActiveRow(null); setPickMode("idle"); }}
                        style={{ borderBottom:"1px solid #f1f5f9", cursor:"pointer", background:isSel?"#EEF2FF":"transparent", transition:"background 0.1s" }}
                        onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background="#f8fafc"; }}
                        onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background="transparent"; }}
                      >
                        <td style={TD}>
                          <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:24, height:24, borderRadius:"50%", fontSize:11, fontWeight:700,
                            background: g.hasFlagged ? "#fee2e2" : "#dcfce7",
                            color:      g.hasFlagged ? "#991b1b" : "#166534",
                          }}>{idx+1}</span>
                        </td>
                        <td style={{ ...TD, fontWeight:600, color:"#1a1a2e", whiteSpace:"nowrap", textAlign:"left" }}>{g.custName}</td>
                        {dates.map(d => {
                          const row = g.byDate[d];
                          if (!row) return <td key={d} style={{ ...TD, textAlign:"center" }}><span style={{ color:"#e2e8f0" }}>—</span></td>;
                          const bs  = badgeStyle(row.dist, radius);
                          return (
                            <td key={d} style={{ ...TD, textAlign:"center" }}>
                              <span style={{ display:"inline-block", padding:"3px 8px", borderRadius:6, fontSize:11, fontWeight:700, whiteSpace:"nowrap", ...bs }}>
                                {row.dist > 0 ? `${row.dist}m` : "—"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Map panel ── */}
        {mapKey && mapGroup && (
          <div style={{ flex:"0 0 45%", borderLeft:"1px solid #e2e8f0", display:"flex", flexDirection:"column", overflow:"hidden", background:"#fff" }}>

            {/* Panel header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>{mapGroup.custName}</div>
                <div style={{ fontSize:11, color:"#94a3b8", marginTop:1 }}>{mapGroup.invoiceNo} · {mapGroup.agentName}</div>
              </div>
              <button onClick={() => { setMapKey(null); setActiveRow(null); setPickMode("idle"); }}
                style={{ background:"none", border:"none", fontSize:20, color:"#94a3b8", cursor:"pointer", padding:"2px 6px", lineHeight:1 }}>×</button>
            </div>

            {/* Map container */}
            <div style={{ flex:1, position:"relative", overflow:"hidden" }}>

              {/* OSM base */}
              <iframe
                key={osmBbox}
                title="osm"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${osmBbox}&layer=mapnik`}
                style={{ width:"100%", height:"100%", border:"none", display:"block", pointerEvents:"none" }}
              />

              {/* SVG overlay */}
              {renderMapSvg()}

              {/* Tooltip hint */}
              {pickMode === "idle" && (
                <div style={{ position:"absolute", top:14, left:"50%", transform:"translateX(-50%)", background:"rgba(255,255,255,.97)", borderRadius:24, padding:"7px 14px", fontSize:12, fontWeight:500, color:"#334155", boxShadow:"0 2px 10px rgba(0,0,0,.14)", display:"flex", alignItems:"center", gap:6, pointerEvents:"none", whiteSpace:"nowrap" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4.5 8-11.8A8 8 0 0 0 4 10.2C4 17.5 12 22 12 22z"/><circle cx="12" cy="10" r="3"/></svg>
                  Click the actual location pin to change it
                </div>
              )}

              {/* Picking tooltip */}
              {pickMode === "picking" && (
                <div style={{ position:"absolute", top:14, left:"50%", transform:"translateX(-50%)", background:"rgba(255,255,255,.97)", borderRadius:24, padding:"7px 14px", fontSize:12, fontWeight:500, color:"#334155", boxShadow:"0 2px 10px rgba(0,0,0,.14)", display:"flex", alignItems:"center", gap:6, pointerEvents:"none", whiteSpace:"nowrap" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                  Click anywhere on the map to set new location
                </div>
              )}

              {/* Confirm card */}
              {pickMode === "confirm" && pendingLoc && (
                <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", background:"#fff", borderRadius:16, padding:"22px 22px 18px", width:310, boxShadow:"0 8px 32px rgba(0,0,0,.18)", zIndex:30, pointerEvents:"all" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#534AB7" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4.5 8-11.8A8 8 0 0 0 4 10.2C4 17.5 12 22 12 22z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span style={{ fontSize:14, fontWeight:700, color:"#1a1a2e" }}>Confirm new location</span>
                  </div>
                  <p style={{ fontSize:12, color:"#64748b", margin:"0 0 16px", lineHeight:1.6 }}>
                    This will replace the actual delivery location for this stop. The deviation distance will be recalculated.
                  </p>
                  <div style={{ background:"#f8fafc", borderRadius:9, padding:"12px 14px", marginBottom:14 }}>
                    {[
                      { label:"New latitude",  val:`${pendingLoc.lat.toFixed(5)}°` },
                      { label:"New longitude", val:`${pendingLoc.lng.toFixed(5)}°` },
                    ].map(r => (
                      <div key={r.label} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:12, color:"#64748b" }}>{r.label}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:"#1a1a2e", fontVariantNumeric:"tabular-nums" }}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                  {saveError && (
                    <div style={{ fontSize:12, color:"#DC2626", background:"#FEF2F2", borderRadius:7, padding:"7px 10px", marginBottom:12 }}>{saveError}</div>
                  )}
                  <div style={{ display:"flex", gap:10 }}>
                    <button onClick={cancelPick}
                      style={{ flex:1, padding:"9px 0", background:"#f1f5f9", border:"none", borderRadius:9, fontWeight:600, fontSize:13, color:"#64748b", cursor:"pointer" }}>
                      Cancel
                    </button>
                    <button onClick={saveLoc} disabled={saving}
                      style={{ flex:1, padding:"9px 0", background:saving?"#A5B4FC":"#534AB7", border:"none", borderRadius:9, fontWeight:600, fontSize:13, color:"#fff", cursor:saving?"not-allowed":"pointer" }}>
                      {saving ? "Saving…" : "Save location"}
                    </button>
                  </div>
                </div>
              )}

              {/* ↓ scroll button (bottom-left) */}
              <button
                onClick={() => {
                  const el = document.getElementById("viol-list");
                  el?.scrollIntoView({ behavior:"smooth" });
                }}
                style={{ position:"absolute", bottom:14, left:14, width:32, height:32, borderRadius:"50%", background:"rgba(255,255,255,.9)", border:"1px solid #e2e8f0", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 2px 6px rgba(0,0,0,.1)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            </div>

            {/* ── Legend ── */}
            <div style={{ padding:"8px 16px", borderTop:"1px solid #f1f5f9", background:"#fafafa", flexShrink:0, display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:"#7C2D12", border:"2px solid #fff", boxShadow:"0 0 0 1px #7C2D12" }} />
                <span style={{ fontSize:11, color:"#475569" }}>A — Actual (click to change)</span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <div style={{ width:14, height:14, borderRadius:"50%", background:"#CBD5E1", border:"2px solid #94A3B8" }} />
                <span style={{ fontSize:11, color:"#475569" }}>P — Planned location</span>
              </div>
            </div>

            {/* ── Per-delivery list ── */}
            <div id="viol-list" style={{ maxHeight:170, overflowY:"auto", borderTop:"1px solid #e2e8f0", background:"#fff" }}>
              {mapRows.sort((a,b) => b.dist - a.dist).map(row => {
                const bs    = badgeStyle(row.dist, radius);
                const isSel = activeRow?.direId === row.direId;
                return (
                  <div key={row.direId}
                    onClick={() => setActiveRow(isSel ? null : row)}
                    style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 16px", cursor:"pointer", borderBottom:"1px solid #f8fafc", background:isSel?"#EEF2FF":"transparent", transition:"background 0.1s" }}
                    onMouseEnter={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background="#f8fafc"; }}
                    onMouseLeave={e => { if (!isSel) (e.currentTarget as HTMLElement).style.background="transparent"; }}>
                    <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700, ...bs }}>{row.dist > 0 ? `${row.dist}m` : "—"}</span>
                    <span style={{ fontSize:12, color:"#64748b", flex:1 }}>{shortDMY(row.date)}</span>
                    <span style={{ fontSize:11, color: row.delivered ? "#1D9E75" : "#D85A30", fontWeight:600 }}>{row.delivered ? "Delivered" : "Undelivered"}</span>
                    <span style={{ fontSize:11, color:"#94a3b8" }}>{fmtAmt(row.netValue)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

/* ── table cell styles ── */
const TH: React.CSSProperties = {
  padding:"10px 14px", fontSize:11, fontWeight:700, color:"#94a3b8",
  textTransform:"uppercase", letterSpacing:"0.06em", textAlign:"center",
  whiteSpace:"nowrap", background:"#f8fafc",
};
const TD: React.CSSProperties = {
  padding:"11px 14px", fontSize:13, color:"#475569", verticalAlign:"middle", textAlign:"center",
};

export default DeliveryViolationPage;
