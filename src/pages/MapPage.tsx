import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import CalendarInput from "../components/CalendarInput";
import { fetchMapPoints, MapPoint } from "../services/MapService";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
};

type Status = "ALL" | "PENDING" | "DELIVERED" | "FAILED";
interface Agent     { id: number; name: string; }
interface Warehouse { id: number; name: string; address: string; lat: number; lon: number; }

const mapContainerStyle = { width: "100%", height: "100%" };
const bbsrCenter        = { lat: 20.3010, lng: 85.8240 };

// ── Status colour palette ─────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  DELIVERED: "#10b981",   // emerald
  FAILED:    "#ef4444",   // red
  PENDING:   "#f59e0b",   // amber
};
const STATUS_LABEL: Record<string, string> = {
  DELIVERED: "Delivered",
  FAILED:    "Failed",
  PENDING:   "Pending",
};

// ── Small helpers ─────────────────────────────────────────────────────────────
const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--ink-60)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
};
const fieldInput: React.CSSProperties = {
  padding: "9px 12px", border: "1.5px solid var(--ink-10)",
  borderRadius: "var(--radius-md)", fontSize: 13,
  fontFamily: "'Inter',sans-serif", background: "#fff",
  color: "var(--ink)", outline: "none", width: "100%", boxSizing: "border-box",
};

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "#94a3b8";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 9px", borderRadius: 50, fontSize: 11, fontWeight: 700,
      background: color + "22", color,
      border: `1px solid ${color}55`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const MapPage: React.FC = () => {
  const today = todayDMY();

  const [fromDate, setFromDate] = useState(today);
  const [toDate,   setToDate]   = useState(today);
  const [points,   setPoints]   = useState<MapPoint[]>([]);
  const [agents,   setAgents]   = useState<Agent[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Filters
  const [agentFilter,  setAgentFilter]  = useState<string>("");   // delivery boy name
  const [statusFilter, setStatusFilter] = useState<Status>("ALL");

  // UI
  const [loading,  setLoading]  = useState(false);
  const [hovered,  setHovered]  = useState<MapPoint | null>(null);
  const [hoveredWh, setHoveredWh] = useState<Warehouse | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  useEffect(() => {
    fetch(ApiEndpoints.DELIVERY_AGENTS, { headers: { ...authHeaders() } })
      .then(r => r.json())
      .then((d: any[]) => setAgents(d.map(a => ({ id: a.id, name: a.name }))))
      .catch(console.error);

    fetch(ApiEndpoints.WAREHOUSES, { headers: { ...authHeaders() } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: Warehouse[]) => setWarehouses(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  // ── Load map points ─────────────────────────────────────────────────────────

  const load = useCallback(() => {
    setLoading(true);
    setPoints([]);
    setHovered(null);
    fetchMapPoints(fromDate, toDate)
      .then(data => {
        setPoints(data);
        if (data.length > 0 && mapRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          data.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
          mapRef.current.fitBounds(bounds, 60);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const visiblePoints = points.filter(p => {
    const agentOk  = !agentFilter || p.deliveryBoyName === agentFilter;
    const statusOk = statusFilter === "ALL" || p.status === statusFilter;
    return agentOk && statusOk;
  });

  const countBy = (s: string) => points.filter(p => p.status === s && (!agentFilter || p.deliveryBoyName === agentFilter)).length;
  const delivered = countBy("DELIVERED");
  const failed    = countBy("FAILED");
  const pending   = countBy("PENDING");
  const total     = delivered + failed + pending;

  // ── Early exits ─────────────────────────────────────────────────────────────

  if (loadError) return (
    <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
      Failed to load Google Maps. Check your API key.
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-height) - 48px)", gap: 14 }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap",
        background: "#fff", padding: "14px 18px",
        borderRadius: "var(--radius-md)", border: "1px solid var(--ink-10)", flexShrink: 0,
      }}>
        <CalendarInput label="From Date" value={fromDate} onChange={setFromDate} />
        <CalendarInput label="To Date"   value={toDate}   onChange={setToDate} />

        {/* Agent filter */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 190 }}>
          <label style={fieldLabel}>Delivery Agent</label>
          <select
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            style={fieldInput}
          >
            <option value="">All agents</option>
            {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
          <label style={fieldLabel}>Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as Status)}
            style={fieldInput}
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Load button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ ...fieldLabel, opacity: 0 }}>Load</label>
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "9px 22px", borderRadius: "var(--radius-md)",
              background: "var(--brand,#7f35b2)", color: "#fff",
              border: "none", fontWeight: 600, fontSize: 13,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, whiteSpace: "nowrap",
            }}
          >
            {loading ? "Loading…" : "⟳ Load Points"}
          </button>
        </div>

        {/* Status summary chips */}
        {points.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {(["DELIVERED","FAILED","PENDING"] as const).map(s => {
              const n = countBy(s);
              const color = STATUS_COLOR[s];
              const active = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(active ? "ALL" : s)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "6px 12px", borderRadius: 20, border: `1.5px solid ${active ? color : color + "55"}`,
                    background: active ? color + "22" : "#fff",
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color }}>{STATUS_LABEL[s]}</span>
                  <span style={{
                    fontSize: 11, fontWeight: 800, color: active ? color : "var(--ink-60)",
                    background: active ? color + "33" : "var(--ink-5)",
                    borderRadius: 10, padding: "1px 7px",
                  }}>{n}</span>
                </button>
              );
            })}
            <span style={{ fontSize: 12, color: "var(--ink-40)", paddingLeft: 4 }}>
              {visiblePoints.length} / {total} shown
            </span>
          </div>
        )}
      </div>

      {/* ── BODY: map + side panel ──────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", gap: 14, minHeight: 0 }}>

        {/* MAP */}
        <div style={{
          flex: 1, borderRadius: "var(--radius-md)", overflow: "hidden",
          border: "1px solid var(--ink-10)", position: "relative",
        }}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={bbsrCenter}
              zoom={12}
              onLoad={m => { mapRef.current = m; }}
              options={{
                streetViewControl: false, mapTypeControl: false, fullscreenControl: false,
                zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
                styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
              }}
            >
              {/* Warehouse markers */}
              {warehouses.map(wh => (
                <Marker
                  key={`wh-${wh.id}`}
                  position={{ lat: wh.lat, lng: wh.lon }}
                  onMouseOver={() => setHoveredWh(wh)}
                  onMouseOut={()  => setHoveredWh(null)}
                  label={{ text: "W", color: "#fff", fontWeight: "800", fontSize: "12px" }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 15, fillColor: "#1e0a3c", fillOpacity: 1,
                    strokeColor: "#c77dff", strokeWeight: 3,
                  }}
                  zIndex={999}
                  title={wh.name}
                />
              ))}

              {hoveredWh && (
                <InfoWindow
                  position={{ lat: hoveredWh.lat, lng: hoveredWh.lon }}
                  onCloseClick={() => setHoveredWh(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#111", marginBottom: 2 }}>📦 {hoveredWh.name}</div>
                    <div style={{ color: "#666", fontSize: 11 }}>{hoveredWh.address}</div>
                  </div>
                </InfoWindow>
              )}

              {/* Delivery stop markers — coloured by status */}
              {visiblePoints.map(pt => {
                const color  = STATUS_COLOR[pt.status] ?? "#94a3b8";
                const isHov  = hovered?.picklist_no === pt.picklist_no;
                return (
                  <Marker
                    key={pt.picklist_no}
                    position={{ lat: pt.lat, lng: pt.lon }}
                    onMouseOver={() => setHovered(pt)}
                    onMouseOut={()  => setHovered(null)}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: isHov ? 13 : 10,
                      fillColor: color,
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: isHov ? 2.5 : 1.5,
                    }}
                    zIndex={isHov ? 100 : 10}
                    title={pt.picklist_no}
                  />
                );
              })}

              {/* Hover info window */}
              {hovered && (
                <InfoWindow
                  position={{ lat: hovered.lat, lng: hovered.lon }}
                  onCloseClick={() => setHovered(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, minWidth: 170 }}>
                    <div style={{ fontWeight: 700, color: "#111", marginBottom: 4, fontSize: 13 }}>
                      {hovered.picklist_no}
                    </div>
                    <div style={{ marginBottom: 5 }}>
                      <StatusBadge status={hovered.status} />
                    </div>
                    <div style={{ color: "#555", marginBottom: 2 }}>
                      👤 {hovered.deliveryBoyName}
                    </div>
                    {hovered.address && (
                      <div style={{ color: "#666", fontSize: 11, marginBottom: 2 }}>
                        📍 {hovered.address}
                      </div>
                    )}
                    {hovered.net_value > 0 && (
                      <div style={{ fontWeight: 600, color: "#333", fontSize: 11, marginBottom: 2 }}>
                        ₹{hovered.net_value.toLocaleString("en-IN")}
                      </div>
                    )}
                    <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 3 }}>
                      {hovered.delivery_date}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#aaa" }}>
              Loading map…
            </div>
          )}

          {/* Loading overlay */}
          {loading && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.5)",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: "3px solid #f3e8ff", borderTopColor: "#7f35b2",
                animation: "spin 0.7s linear infinite",
              }} />
            </div>
          )}

          {/* Empty state */}
          {isLoaded && !loading && points.length === 0 && (
            <div style={{
              position: "absolute", inset: 0, display:"flex", alignItems:"center", justifyContent:"center",
              background: "rgba(255,255,255,0.6)", backdropFilter: "blur(2px)",
            }}>
              <div style={{
                background:"#fff", borderRadius:14, padding:"22px 36px", textAlign:"center",
                boxShadow:"0 4px 24px rgba(0,0,0,0.1)",
              }}>
                <div style={{ fontSize:32, marginBottom:10 }}>🗺️</div>
                <div style={{ fontWeight:700, color:"#111", marginBottom:4 }}>No Deliveries Found</div>
                <div style={{ fontSize:12.5, color:"#888" }}>
                  Adjust the date range and click <strong>Load Points</strong>
                </div>
              </div>
            </div>
          )}

          {/* Colour legend — bottom-left overlay */}
          <div style={{
            position: "absolute", bottom: 24, left: 16,
            background: "rgba(255,255,255,0.95)", borderRadius: 10,
            padding: "10px 14px", boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            {(["DELIVERED","PENDING","FAILED"] as const).map(s => (
              <div key={s} style={{ display:"flex", alignItems:"center", gap: 8 }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: STATUS_COLOR[s], flexShrink: 0,
                  boxShadow: `0 0 0 2px #fff, 0 0 0 3px ${STATUS_COLOR[s]}55`,
                }} />
                <span style={{ fontSize: 11.5, fontWeight: 600, color: "#333" }}>
                  {STATUS_LABEL[s]}
                </span>
              </div>
            ))}
            <div style={{ display:"flex", alignItems:"center", gap: 8, paddingTop: 4, borderTop: "1px solid #eee" }}>
              <div style={{
                width: 12, height: 12, borderRadius: 2,
                background: "#1e0a3c", flexShrink: 0,
              }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: "#333" }}>Warehouse</span>
            </div>
          </div>
        </div>

        {/* ── SIDE PANEL ──────────────────────────────────────────────────── */}
        <div style={{ width: 280, display:"flex", flexDirection:"column", gap:10, flexShrink:0 }}>

          {/* Summary card */}
          <div style={{
            background:"#fff", borderRadius:"var(--radius-md)",
            border:"1px solid var(--ink-10)", padding:"14px 16px", flexShrink:0,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:"var(--ink-60)", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:12 }}>
              Summary
            </div>
            {/* Total */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontSize:13, color:"var(--ink-60)" }}>Total</span>
              <span style={{ fontSize:17, fontWeight:800, color:"var(--ink)" }}>{total}</span>
            </div>
            {/* Per-status bars */}
            {(["DELIVERED","PENDING","FAILED"] as const).map(s => {
              const n     = countBy(s);
              const color = STATUS_COLOR[s];
              const pct   = total > 0 ? (n / total) * 100 : 0;
              return (
                <div key={s} style={{ marginBottom: 8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                    <span style={{ fontSize:11.5, fontWeight:600, color }}>{STATUS_LABEL[s]}</span>
                    <span style={{ fontSize:11.5, fontWeight:700, color:"var(--ink)" }}>{n}</span>
                  </div>
                  <div style={{ height:5, borderRadius:3, background:"var(--ink-5)", overflow:"hidden" }}>
                    <div style={{
                      height:"100%", borderRadius:3, width:`${pct}%`,
                      background: color, transition:"width 0.4s",
                    }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Per-agent breakdown */}
          {points.length > 0 && (
            <div style={{
              flex:1, background:"#fff", borderRadius:"var(--radius-md)",
              border:"1px solid var(--ink-10)", display:"flex", flexDirection:"column", minHeight:0,
            }}>
              <div style={{
                padding:"12px 14px 10px", borderBottom:"1px solid var(--ink-10)", flexShrink:0,
                fontSize:11, fontWeight:700, color:"var(--ink-60)", textTransform:"uppercase", letterSpacing:"0.06em",
              }}>
                By Agent
              </div>
              <div style={{ flex:1, overflowY:"auto", padding:"8px 10px" }}>
                {Array.from(new Set(points.map(p => p.deliveryBoyName))).sort().map(name => {
                  const agentPts = points.filter(p => p.deliveryBoyName === name);
                  const d = agentPts.filter(p => p.status === "DELIVERED").length;
                  const f = agentPts.filter(p => p.status === "FAILED").length;
                  const pend = agentPts.filter(p => p.status === "PENDING").length;
                  const isActive = agentFilter === name;
                  return (
                    <div
                      key={name}
                      onClick={() => setAgentFilter(isActive ? "" : name)}
                      style={{
                        padding:"10px 10px", borderRadius:10, marginBottom:6, cursor:"pointer",
                        border:`1px solid ${isActive ? "var(--brand,#7f35b2)" : "var(--ink-10)"}`,
                        background: isActive ? "#f3e8ff" : "#fafafa",
                        transition:"all 0.15s",
                      }}
                    >
                      <div style={{ fontWeight:700, fontSize:12.5, color:"var(--ink)", marginBottom:5 }}>
                        {name}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        {d > 0 && (
                          <span style={{
                            fontSize:10.5, fontWeight:700, padding:"1px 7px", borderRadius:50,
                            background:"#d1fae5", color:"#065f46",
                          }}>{d} ✓</span>
                        )}
                        {pend > 0 && (
                          <span style={{
                            fontSize:10.5, fontWeight:700, padding:"1px 7px", borderRadius:50,
                            background:"#fef3c7", color:"#92400e",
                          }}>{pend} ⏳</span>
                        )}
                        {f > 0 && (
                          <span style={{
                            fontSize:10.5, fontWeight:700, padding:"1px 7px", borderRadius:50,
                            background:"#fee2e2", color:"#991b1b",
                          }}>{f} ✗</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPage;
