import '../styles/pages/MapPage.css';
import React, { useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import { fetchMapPoints, assignRoute, MapPoint } from "../services/MapService";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

interface Agent     { id: number; name: string; }
interface Warehouse { id: number; name: string; address: string; lat: number; lon: number; }

const mapContainerStyle = { width: "100%", height: "100%" };
const bbsrCenter        = { lat: 20.3010, lng: 85.8240 };

const ASSIGNED_COLOR = "#7f35b2";

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

/** Nearest-neighbour ordering, starting from the warehouse (or the first point). */
function orderRoute(points: MapPoint[], start?: { lat: number; lon: number }): MapPoint[] {
  if (points.length <= 1) return [...points];
  const remaining = [...points];
  const ordered: MapPoint[] = [];
  let cur = start ?? { lat: remaining[0].lat, lon: remaining[0].lon };
  while (remaining.length > 0) {
    let bestIdx = 0, bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = (p.lat - cur.lat) ** 2 + (p.lon - cur.lon) ** 2;
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    cur = { lat: next.lat, lon: next.lon };
  }
  return ordered;
}

// ── Main component ────────────────────────────────────────────────────────────

const MapPage: React.FC = () => {
  const [agents,     setAgents]     = useState<Agent[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [agentId,    setAgentId]    = useState<string>("");
  const [points,     setPoints]     = useState<MapPoint[]>([]);
  const [route,      setRoute]      = useState<MapPoint[]>([]);

  const [loading,   setLoading]   = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [message,   setMessage]   = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [hovered,   setHovered]   = useState<MapPoint | null>(null);
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

  // ── Load agent's assigned points ────────────────────────────────────────────

  const load = () => {
    if (!agentId) return;
    setLoading(true);
    setPoints([]);
    setRoute([]);
    setHovered(null);
    setMessage(null);
    fetchMapPoints(agentId)
      .then(data => {
        setPoints(data);
        const wh = warehouses[0];
        setRoute(orderRoute(data, wh ? { lat: wh.lat, lon: wh.lon } : undefined));
        if (data.length > 0 && mapRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          data.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
          mapRef.current.fitBounds(bounds, 60);
        }
      })
      .catch(() => setMessage({ type: "err", text: "Failed to load points" }))
      .finally(() => setLoading(false));
  };

  // ── Assign route ────────────────────────────────────────────────────────────

  const handleAssignRoute = async () => {
    if (!agentId || route.length === 0) return;
    const agent = agents.find(a => String(a.id) === agentId);
    if (!agent) return;
    setAssigning(true);
    setMessage(null);
    try {
      await assignRoute(route.map((p, i) => ({
        direId:   Number(p.picklist_no),
        sequence: i + 1,
      })));
      setMessage({ type: "ok", text: `Route assigned — ${route.length} stops sequenced for ${agent.name}` });
    } catch {
      setMessage({ type: "err", text: "Route assignment failed" });
    } finally {
      setAssigning(false);
    }
  };

  const totalNetValue = points.reduce((s, p) => s + (p.net_value ?? 0), 0);

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
        {/* Agent select */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 220 }}>
          <label style={fieldLabel}>Delivery Agent</label>
          <select
            value={agentId}
            onChange={e => { setAgentId(e.target.value); setPoints([]); setRoute([]); setMessage(null); }}
            style={fieldInput}
          >
            <option value="">— Choose agent —</option>
            {agents.map(a => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
          </select>
        </div>

        {/* Load button */}
        <button
          onClick={load}
          disabled={!agentId || loading}
          style={{
            padding: "9px 22px", borderRadius: "var(--radius-md)",
            background: "var(--brand,#7f35b2)", color: "#fff",
            border: "none", fontWeight: 600, fontSize: 13,
            cursor: !agentId || loading ? "not-allowed" : "pointer",
            opacity: !agentId || loading ? 0.6 : 1, whiteSpace: "nowrap",
          }}
        >
          {loading ? "Loading…" : "⟳ Load Points"}
        </button>

        {/* Assign Route button */}
        <button
          onClick={handleAssignRoute}
          disabled={route.length === 0 || assigning}
          style={{
            padding: "9px 22px", borderRadius: "var(--radius-md)",
            background: route.length === 0 || assigning ? "var(--ink-10)" : "#065f46",
            color: route.length === 0 || assigning ? "var(--ink-40)" : "#fff",
            border: "none", fontWeight: 600, fontSize: 13,
            cursor: route.length === 0 || assigning ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {assigning ? "Assigning…" : "🛣 Assign Route"}
        </button>

        {/* Summary chips */}
        {points.length > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
            <span style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 50,
              background: "#ede9fe", color: "#5b21b6", fontWeight: 700,
            }}>{points.length} assigned stops</span>
            <span style={{
              fontSize: 12, padding: "5px 12px", borderRadius: 50,
              background: "var(--brand-light)", color: "var(--brand)", fontWeight: 700,
            }}>₹{totalNetValue.toLocaleString("en-IN")}</span>
          </div>
        )}

        {/* Result message */}
        {message && (
          <span style={{
            fontSize: 12.5, fontWeight: 600, padding: "6px 14px", borderRadius: 8,
            background: message.type === "ok" ? "#d1fae5" : "#fee2e2",
            color:      message.type === "ok" ? "#065f46" : "#991b1b",
          }}>{message.text}</span>
        )}
      </div>

      {/* ── MAP ─────────────────────────────────────────────────────────────── */}
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

            {/* Route line */}
            {route.length > 1 && (
              <Polyline
                path={route.map(p => ({ lat: p.lat, lng: p.lon }))}
                options={{
                  strokeColor: ASSIGNED_COLOR, strokeOpacity: 0.7, strokeWeight: 3,
                  geodesic: true,
                }}
              />
            )}

            {/* Assigned stop markers — numbered by route order */}
            {route.map((pt, i) => {
              const isHov = hovered?.picklist_no === pt.picklist_no;
              return (
                <Marker
                  key={pt.picklist_no}
                  position={{ lat: pt.lat, lng: pt.lon }}
                  onMouseOver={() => setHovered(pt)}
                  onMouseOut={()  => setHovered(null)}
                  label={{ text: String(i + 1), color: "#fff", fontWeight: "800", fontSize: "11px" }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: isHov ? 14 : 12,
                    fillColor: ASSIGNED_COLOR,
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
                    #{hovered.picklist_no}
                  </div>
                  <div style={{ color: "#555", marginBottom: 2 }}>👤 {hovered.deliveryBoyName}</div>
                  {hovered.address && (
                    <div style={{ color: "#666", fontSize: 11, marginBottom: 2 }}>🏪 {hovered.address}</div>
                  )}
                  {hovered.net_value > 0 && (
                    <div style={{ fontWeight: 600, color: "#333", fontSize: 11, marginBottom: 2 }}>
                      ₹{hovered.net_value.toLocaleString("en-IN")}
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: "#aaa", marginTop: 3 }}>{hovered.delivery_date}</div>
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
              <div style={{ fontWeight:700, color:"#111", marginBottom:4 }}>
                {agentId ? "No Assigned Deliveries" : "Choose an Agent"}
              </div>
              <div style={{ fontSize:12.5, color:"#888" }}>
                {agentId
                  ? "This agent has no assigned (unstarted) deliveries with customer coordinates"
                  : <>Select a delivery agent and click <strong>Load Points</strong></>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapPage;
