import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline,
} from "@react-google-maps/api";
import { fetchMapPoints, MapPoint } from "../services/MapService";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";
import CalendarInput from "../components/CalendarInput";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

// RoutePoint is just MapPoint — net_value is now part of the base interface
type RoutePoint = MapPoint;

interface Agent     { id: number; name: string; }
interface Warehouse { id: number; name: string; address: string; lat: number; lon: number; active?: boolean; }

// ── Maths ──────────────────────────────────────────────────────────────────────

/** Straight-line distance between two coordinates (km) */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Nearest-Neighbour greedy TSP heuristic — O(n²), instant for ≤300 stops */
function nearestNeighbourRoute(
  points: RoutePoint[],
  startLat: number,
  startLon: number,
): RoutePoint[] {
  if (points.length === 0) return [];
  const remaining = [...points];
  const route: RoutePoint[] = [];
  let curLat = startLat;
  let curLon = startLon;
  while (remaining.length > 0) {
    let bestIdx  = 0;
    let bestDist = haversine(curLat, curLon, remaining[0].lat, remaining[0].lon);
    for (let i = 1; i < remaining.length; i++) {
      const d = haversine(curLat, curLon, remaining[i].lat, remaining[i].lon);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    route.push(remaining[bestIdx]);
    curLat = remaining[bestIdx].lat;
    curLon = remaining[bestIdx].lon;
    remaining.splice(bestIdx, 1);
  }
  return route;
}

/** Sum of distances along a route (km) */
function routeDistance(route: RoutePoint[], startLat: number, startLon: number): number {
  if (route.length === 0) return 0;
  let d = haversine(startLat, startLon, route[0].lat, route[0].lon);
  for (let i = 1; i < route.length; i++)
    d += haversine(route[i - 1].lat, route[i - 1].lon, route[i].lat, route[i].lon);
  return d;
}

/** Estimated travel time: 30 km/h urban average + 5 min per stop */
function estimatedMinutes(km: number, stops: number): number {
  return Math.round((km / 30) * 60 + stops * 5);
}

function fmtTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const mapContainerStyle = { width: "100%", height: "100%" };
const bbsrCenter        = { lat: 20.301, lng: 85.824 };
const BRAND             = "#7f35b2";
const BRAND_LIGHT       = "#f3e8ff";

const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ── Label styles ──────────────────────────────────────────────────────────────

const fieldLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--ink-60)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
};

const fieldInput: React.CSSProperties = {
  padding: "9px 12px", border: "1.5px solid var(--ink-10)",
  borderRadius: "var(--radius-md)", fontSize: 13,
  fontFamily: "'Inter',sans-serif", background: "#fff",
  color: "var(--ink)", outline: "none", width: "100%",
  boxSizing: "border-box",
};

// ── Stat pill ─────────────────────────────────────────────────────────────────

function StatPill({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      flex: 1, padding: "10px 12px", borderRadius: 10,
      background: accent ? BRAND_LIGHT : "var(--ink-5)",
      border: `1px solid ${accent ? "#d8b4fe" : "var(--ink-10)"}`,
      display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <span style={{ color: accent ? BRAND : "var(--ink-40)", fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: accent ? BRAND : "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 800, color: accent ? BRAND : "var(--ink)", fontFamily: "'Inter',sans-serif" }}>
        {value}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const SmartRoute: React.FC = () => {
  const today = todayDMY();

  // Data
  const [points,    setPoints]    = useState<RoutePoint[]>([]);
  const [agents,    setAgents]    = useState<Agent[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Filters
  const [fromDate,    setFromDate]    = useState(today);
  const [toDate,      setToDate]      = useState(today);
  const [minNetValue, setMinNetValue] = useState("");
  const [maxStops,    setMaxStops]    = useState("");

  // Warehouse selection — used as route start point
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

  // Route state
  const [route,         setRoute]         = useState<RoutePoint[]>([]);
  const [totalDist,     setTotalDist]     = useState(0);
  const [estTime,       setEstTime]       = useState(0);
  const [routeComputed, setRouteComputed] = useState(false);

  // Assign state
  const [selectedAgent,  setSelectedAgent]  = useState<Agent | null>(null);
  const [assigning,      setAssigning]      = useState(false);
  const [assignSuccess,  setAssignSuccess]  = useState(false);
  const [assignError,    setAssignError]    = useState("");

  // UI
  const [loading,    setLoading]    = useState(false);
  const [hovered,    setHovered]    = useState<RoutePoint | null>(null);
  const [hoveredWh,  setHoveredWh]  = useState<Warehouse | null>(null);

  const mapRef = useRef<google.maps.Map | null>(null);
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  // ── Load agents + warehouses ──────────────────────────────────────────────

  useEffect(() => {
    fetch(ApiEndpoints.DELIVERY_AGENTS, { headers: { ...authHeaders() } })
      .then(r => r.json())
      .then((d: any[]) => setAgents(d.map(a => ({ id: a.id, name: a.name }))))
      .catch(console.error);

    fetch(ApiEndpoints.WAREHOUSES, { headers: { ...authHeaders() } })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((d: Warehouse[]) => {
        const list = Array.isArray(d) ? d : [];
        setWarehouses(list);
        if (list.length > 0) setSelectedWarehouse(list[0]);
      })
      .catch(err => {
        console.error("Warehouse fetch failed:", err);
        // Fallback to static demo warehouses so the map still works
        const fallback: Warehouse[] = [
          { id: 1, name: "Main Warehouse", address: "Mancheswar Industrial Estate, Bhubaneswar", lat: 20.2827, lon: 85.8679 },
          { id: 2, name: "North Hub",      address: "Patia, Bhubaneswar",                        lat: 20.3526, lon: 85.8194 },
          { id: 3, name: "South Depot",    address: "Jagamara, Bhubaneswar",                     lat: 20.2349, lon: 85.8173 },
        ];
        setWarehouses(fallback);
        setSelectedWarehouse(fallback[0]);
      });
  }, []);

  // ── Load map points ───────────────────────────────────────────────────────

  const loadPoints = useCallback(() => {
    setLoading(true);
    setPoints([]);          // clear old map markers immediately
    setRoute([]);
    setRouteComputed(false);
    setAssignSuccess(false);
    setAssignError("");
    fetchMapPoints(fromDate, toDate)
      .then(data => {
        setPoints(data);
        if (data.length > 0 && mapRef.current) {
          const bounds = new window.google.maps.LatLngBounds();
          data.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
          mapRef.current.fitBounds(bounds, 80);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [fromDate, toDate]);

  useEffect(() => { if (isLoaded) loadPoints(); }, [isLoaded, loadPoints]);

  // ── Derived: filtered points ──────────────────────────────────────────────

  const filteredPoints = points.filter(p => {
    const net    = p.net_value ?? 0;
    const minVal = parseFloat(minNetValue) || 0;
    return net >= minVal;
  });

  // Route start = selected warehouse OR centroid of filtered points
  const startLat = selectedWarehouse?.lat
    ?? (filteredPoints.length > 0
        ? filteredPoints.reduce((s, p) => s + p.lat, 0) / filteredPoints.length
        : bbsrCenter.lat);
  const startLon = selectedWarehouse?.lon
    ?? (filteredPoints.length > 0
        ? filteredPoints.reduce((s, p) => s + p.lon, 0) / filteredPoints.length
        : bbsrCenter.lng);

  // ── Compute smart route ───────────────────────────────────────────────────

  const computeSmartRoute = () => {
    if (filteredPoints.length === 0) return;
    const optimized = nearestNeighbourRoute(filteredPoints, startLat, startLon);
    // Apply max-stops cap if set
    const cap     = parseInt(maxStops) || 0;
    const limited = cap > 0 ? optimized.slice(0, cap) : optimized;
    const dist    = routeDistance(limited, startLat, startLon);
    setRoute(limited);
    setTotalDist(dist);
    setEstTime(estimatedMinutes(dist, limited.length));
    setRouteComputed(true);

    if (mapRef.current) {
      const bounds = new window.google.maps.LatLngBounds();
      if (selectedWarehouse) bounds.extend({ lat: selectedWarehouse.lat, lng: selectedWarehouse.lon });
      limited.forEach(p => bounds.extend({ lat: p.lat, lng: p.lon }));
      mapRef.current.fitBounds(bounds, 80);
    }
  };

  // ── Assign route ──────────────────────────────────────────────────────────

  const handleAssign = async () => {
    if (!selectedAgent || route.length === 0) return;
    setAssigning(true);
    setAssignError("");
    try {
      const payload = route.map((p, i) => ({
        picklist_no:     p.picklist_no,
        sequence:        i + 1,
        deliveryBoyId:   selectedAgent.id,
        deliveryBoyName: selectedAgent.name,
        address:         p.address ?? "",
        lat:             p.lat,
        lon:             p.lon,
      }));
      const res = await fetch(ApiEndpoints.SMART_ROUTE_ASSIGN, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setAssignSuccess(true);
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const routeSet = new Set(route.map(p => p.picklist_no));
  const totalNetValue = route.reduce((s, p) => s + (p.net_value ?? 0), 0);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetRoute = () => { setRoute([]); setRouteComputed(false); };

  // ── Early-exit states ─────────────────────────────────────────────────────

  if (loadError) return (
    <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
      Failed to load Google Maps — check your API key.
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      height: "calc(100vh - var(--topbar-height) - 48px)", gap: 14,
    }}>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap",
        background: "#fff", padding: "14px 18px",
        borderRadius: "var(--radius-md)", border: "1px solid var(--ink-10)", flexShrink: 0,
      }}>

        <CalendarInput label="From Date" value={fromDate} onChange={setFromDate} />
        <CalendarInput label="To Date"   value={toDate}   onChange={setToDate} />

        {/* Warehouse selector */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 190 }}>
          <label style={fieldLabel}>Start Warehouse</label>
          <select
            value={selectedWarehouse?.id ?? ""}
            onChange={e => {
              const wh = warehouses.find(w => w.id === Number(e.target.value)) ?? null;
              setSelectedWarehouse(wh);
              resetRoute();
            }}
            style={{ ...fieldInput }}
          >
            {warehouses.length === 0 && <option value="">No warehouses</option>}
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>

        {/* Min net value filter */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 150 }}>
          <label style={fieldLabel}>Min Net Value (₹)</label>
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              fontSize: 13, color: "var(--ink-40)", pointerEvents: "none",
            }}>₹</span>
            <input
              type="number" min={0} placeholder="e.g. 500"
              value={minNetValue}
              onChange={e => { setMinNetValue(e.target.value); resetRoute(); }}
              style={{ ...fieldInput, paddingLeft: 26 }}
            />
          </div>
        </div>

        {/* Max stops */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 120 }}>
          <label style={fieldLabel}>Max Stops</label>
          <input
            type="number" min={1} placeholder="All"
            value={maxStops}
            onChange={e => { setMaxStops(e.target.value); resetRoute(); }}
            style={fieldInput}
          />
        </div>

        {/* Filtered count badge */}
        {points.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={fieldLabel}>Filtered</label>
            <div style={{
              padding: "9px 14px", borderRadius: "var(--radius-md)",
              background: BRAND_LIGHT, border: `1px solid #d8b4fe`,
              fontSize: 13, fontWeight: 700, color: BRAND, whiteSpace: "nowrap",
            }}>
              {filteredPoints.length} / {points.length} stops
            </div>
          </div>
        )}

        {/* Load button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ ...fieldLabel, opacity: 0 }}>Load</label>
          <button
            onClick={loadPoints}
            disabled={loading}
            style={{
              padding: "9px 20px", borderRadius: "var(--radius-md)",
              background: "var(--ink-5)", color: "var(--ink)",
              border: "1.5px solid var(--ink-10)", fontWeight: 600,
              fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1, whiteSpace: "nowrap",
            }}
          >
            {loading ? "Loading…" : "⟳ Load Points"}
          </button>
        </div>

        {/* ★ Smart Route button */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ ...fieldLabel, opacity: 0 }}>Route</label>
          <button
            onClick={computeSmartRoute}
            disabled={filteredPoints.length === 0 || loading}
            style={{
              padding: "9px 22px", borderRadius: "var(--radius-md)",
              background: filteredPoints.length > 0 && !loading ? BRAND : "var(--ink-10)",
              color: filteredPoints.length > 0 && !loading ? "#fff" : "var(--ink-40)",
              border: "none", fontWeight: 700, fontSize: 13,
              cursor: filteredPoints.length > 0 && !loading ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 7, whiteSpace: "nowrap",
              boxShadow: filteredPoints.length > 0 && !loading
                ? "0 2px 8px rgba(127,53,178,0.35)" : "none",
              transition: "all 0.15s",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M3 12h4l3-9 4 18 3-9h4"/>
            </svg>
            Smart Route
          </button>
        </div>
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
              {/* Warehouse markers — click to select as start */}
              {warehouses.map(wh => {
                const isSelected = selectedWarehouse?.id === wh.id;
                return (
                  <Marker
                    key={`wh-${wh.id}`}
                    position={{ lat: wh.lat, lng: wh.lon }}
                    onClick={() => { setSelectedWarehouse(wh); resetRoute(); }}
                    onMouseOver={() => setHoveredWh(wh)}
                    onMouseOut={()  => setHoveredWh(null)}
                    label={{ text: "W", color: "#fff", fontWeight: "800", fontSize: "12px" }}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: isSelected ? 19 : 14,
                      fillColor: isSelected ? BRAND : "#475569",
                      fillOpacity: 1,
                      strokeColor: isSelected ? "#c77dff" : "#94a3b8",
                      strokeWeight: isSelected ? 3.5 : 2,
                    }}
                    zIndex={999}
                    title={isSelected ? `${wh.name} (start)` : wh.name}
                  />
                );
              })}

              {hoveredWh && (
                <InfoWindow
                  position={{ lat: hoveredWh.lat, lng: hoveredWh.lon }}
                  onCloseClick={() => setHoveredWh(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12 }}>
                    <div style={{ fontWeight: 700, color: "#111", marginBottom: 2 }}>
                      📦 {hoveredWh.name}
                    </div>
                    <div style={{ color: "#666", fontSize: 11 }}>{hoveredWh.address}</div>
                    {selectedWarehouse?.id === hoveredWh.id ? (
                      <div style={{ marginTop: 4, fontSize: 10.5, color: BRAND, fontWeight: 600 }}>
                        ✓ Selected as start point
                      </div>
                    ) : (
                      <div style={{ marginTop: 4, fontSize: 10.5, color: "#64748b" }}>
                        Click to set as start
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}

              {/* Optimised route polyline */}
              {route.length >= 2 && (
                <>
                  {/* Start line from warehouse to first stop */}
                  {selectedWarehouse && (
                    <Polyline
                      path={[
                        { lat: selectedWarehouse.lat, lng: selectedWarehouse.lon },
                        { lat: route[0].lat,          lng: route[0].lon          },
                      ]}
                      options={{
                        strokeColor: "#c77dff", strokeOpacity: 0.6,
                        strokeWeight: 2,
                        icons: [{ icon: { path: window.google.maps.SymbolPath.FORWARD_OPEN_ARROW, scale: 3 }, offset: "100%" }],
                      }}
                    />
                  )}
                  {/* Main route */}
                  <Polyline
                    path={route.map(p => ({ lat: p.lat, lng: p.lon }))}
                    options={{
                      strokeColor: BRAND, strokeOpacity: 0.9, strokeWeight: 4,
                      icons: [{
                        icon: {
                          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                          scale: 4, fillColor: BRAND, fillOpacity: 1,
                          strokeColor: "#fff", strokeWeight: 1,
                        },
                        offset: "0%", repeat: "70px",
                      }],
                    }}
                  />
                </>
              )}

              {/* Point markers */}
              {filteredPoints.map(pt => {
                const seqIdx    = route.findIndex(p => p.picklist_no === pt.picklist_no);
                const inRoute   = seqIdx !== -1;
                const isHov     = hovered?.picklist_no === pt.picklist_no;
                const isFirst   = seqIdx === 0;
                const isLast    = seqIdx === route.length - 1;

                return (
                  <Marker
                    key={pt.picklist_no}
                    position={{ lat: pt.lat, lng: pt.lon }}
                    onMouseOver={() => setHovered(pt)}
                    onMouseOut={()  => setHovered(null)}
                    label={inRoute ? {
                      text: String(seqIdx + 1),
                      color: "#fff", fontWeight: "700", fontSize: "11px",
                    } : undefined}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: inRoute ? (isFirst || isLast ? 16 : 13) : (isHov ? 11 : 9),
                      fillColor: inRoute
                        ? isFirst ? "#10b981"
                        : isLast  ? "#ef4444"
                        : BRAND
                        : isHov ? "#64748b" : "#cbd5e1",
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: inRoute ? 2.5 : 1.5,
                    }}
                    zIndex={inRoute ? 10 + seqIdx : 1}
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
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, minWidth: 150 }}>
                    <div style={{ fontWeight: 700, color: "#111", marginBottom: 3 }}>
                      {hovered.picklist_no}
                    </div>
                    {hovered.address && (
                      <div style={{ color: "#666", fontSize: 11, marginBottom: 3 }}>
                        {hovered.address}
                      </div>
                    )}
                    {hovered.net_value > 0 && (
                      <div style={{ fontSize: 11, color: "#333", fontWeight: 600 }}>
                        ₹{hovered.net_value.toLocaleString("en-IN")}
                      </div>
                    )}
                    {routeSet.has(hovered.picklist_no) && (
                      <div style={{
                        marginTop: 5, padding: "2px 8px",
                        background: BRAND_LIGHT, borderRadius: 50,
                        fontSize: 11, fontWeight: 700, color: BRAND, display: "inline-block",
                      }}>
                        Stop #{route.findIndex(p => p.picklist_no === hovered.picklist_no) + 1}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#aaa" }}>
              Loading map…
            </div>
          )}

          {/* Empty-state overlay */}
          {isLoaded && points.length === 0 && !loading && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.6)", backdropFilter: "blur(2px)",
            }}>
              <div style={{
                background: "#fff", borderRadius: 14, padding: "22px 36px", textAlign: "center",
                boxShadow: "0 4px 24px rgba(0,0,0,0.1)",
              }}>
                <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
                <div style={{ fontWeight: 700, color: "#111", marginBottom: 4 }}>No Picklists Found</div>
                <div style={{ fontSize: 12.5, color: "#888" }}>
                  Adjust the date range and click <strong>Load Points</strong>
                </div>
              </div>
            </div>
          )}

          {/* Loading spinner overlay */}
          {loading && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(255,255,255,0.5)",
            }}>
              <div style={{
                width: 36, height: 36, border: `3px solid ${BRAND_LIGHT}`,
                borderTopColor: BRAND, borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }} />
            </div>
          )}
        </div>

        {/* ── SIDE PANEL ──────────────────────────────────────────────────── */}
        <div style={{ width: 310, display: "flex", flexDirection: "column", gap: 10, flexShrink: 0 }}>

          {/* ── Route stats ─────────────────────────────────────────────── */}
          {routeComputed && (
            <div style={{
              background: "#fff", borderRadius: "var(--radius-md)",
              border: "1px solid var(--ink-10)", padding: "14px 14px 12px",
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: "var(--ink-60)",
                textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10,
              }}>
                Route Summary
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <StatPill icon="📍" label="Stops"    value={String(route.length)} accent />
                <StatPill icon="📏" label="Distance" value={`${totalDist.toFixed(1)} km`} />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <StatPill icon="⏱" label="Est. Time" value={fmtTime(estTime)} accent />
                {totalNetValue > 0 && (
                  <StatPill icon="₹" label="Net Value" value={`₹${totalNetValue.toLocaleString("en-IN")}`} />
                )}
              </div>
              {/* Start warehouse chip */}
              {selectedWarehouse && (
                <div style={{
                  marginTop: 10, padding: "6px 10px", borderRadius: 8,
                  background: "#f8f4ff", border: "1px solid #d8b4fe",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: BRAND, flexShrink: 0 }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: BRAND }}>
                    Start: {selectedWarehouse.name}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Stop list ───────────────────────────────────────────────── */}
          <div style={{
            flex: 1, background: "#fff", borderRadius: "var(--radius-md)",
            border: "1px solid var(--ink-10)", display: "flex", flexDirection: "column", minHeight: 0,
          }}>
            <div style={{
              padding: "12px 14px 10px", borderBottom: "1px solid var(--ink-10)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>
                {routeComputed ? "Optimised Stops" : "Filtered Points"}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px",
                borderRadius: 50, background: BRAND_LIGHT, color: BRAND,
              }}>
                {routeComputed ? route.length : filteredPoints.length}
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
              {!routeComputed && filteredPoints.length === 0 && (
                <div style={{ textAlign: "center", color: "var(--ink-40)", padding: "28px 0", fontSize: 13 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
                  No picklists match your filters
                </div>
              )}
              {!routeComputed && filteredPoints.length > 0 && (
                <div style={{ textAlign: "center", color: "var(--ink-40)", padding: "28px 16px", fontSize: 13 }}>
                  <div style={{ fontSize: 22, marginBottom: 6 }}>⚡</div>
                  <strong style={{ color: "var(--ink-60)" }}>{filteredPoints.length} stops</strong> ready<br/>
                  Click <strong style={{ color: BRAND }}>Smart Route</strong> to optimise
                </div>
              )}
              {routeComputed && route.map((stop, idx) => {
                const isFirst = idx === 0;
                const isLast  = idx === route.length - 1;
                const dotColor = isFirst ? "#10b981" : isLast ? "#ef4444" : BRAND;
                return (
                  <div
                    key={stop.picklist_no}
                    onMouseEnter={() => setHovered(stop)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
                      padding: "8px 10px", borderRadius: 10,
                      border: `1px solid ${hovered?.picklist_no === stop.picklist_no ? "#d8b4fe" : "var(--ink-10)"}`,
                      background: hovered?.picklist_no === stop.picklist_no ? BRAND_LIGHT : "#fafafa",
                      cursor: "default", transition: "all 0.1s",
                    }}
                  >
                    {/* Sequence bubble */}
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%",
                      background: dotColor, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10.5, fontWeight: 800, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: "var(--ink)", fontFamily: "monospace" }}>
                        {stop.picklist_no}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--ink-60)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {(stop.address ?? "").replace(", Bhubaneswar", "")}
                      </div>
                    </div>

                    {/* Dist from prev stop */}
                    {idx > 0 && (
                      <div style={{ fontSize: 10, color: "var(--ink-40)", fontWeight: 600, flexShrink: 0, textAlign: "right" }}>
                        +{haversine(route[idx-1].lat, route[idx-1].lon, stop.lat, stop.lon).toFixed(1)} km
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Assign section ─────────────────────────────────────────── */}
            {routeComputed && (
              <div style={{
                padding: "12px 12px 14px", borderTop: "1px solid var(--ink-10)", flexShrink: 0,
              }}>
                {assignSuccess ? (
                  <div style={{
                    padding: "12px 14px", borderRadius: "var(--radius-md)",
                    background: "#d1fae5", border: "1px solid #6ee7b7",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#065f46" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46" }}>Route Assigned!</div>
                      <div style={{ fontSize: 11, color: "#047857" }}>{selectedAgent?.name} · {route.length} stops</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Agent selector */}
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ ...fieldLabel, display: "block", marginBottom: 4 }}>
                        Assign to Agent
                      </label>
                      <select
                        value={selectedAgent?.id ?? ""}
                        onChange={e => setSelectedAgent(agents.find(a => a.id === Number(e.target.value)) ?? null)}
                        style={{ ...fieldInput }}
                      >
                        <option value="">— Select delivery agent —</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Error message */}
                    {assignError && (
                      <div style={{
                        padding: "8px 12px", marginBottom: 8,
                        borderRadius: "var(--radius-md)", background: "#fee2e2",
                        fontSize: 12, color: "#991b1b",
                      }}>
                        ⚠ {assignError}
                      </div>
                    )}

                    {/* Assign button */}
                    <button
                      onClick={handleAssign}
                      disabled={!selectedAgent || assigning}
                      style={{
                        width: "100%", padding: "11px 0",
                        borderRadius: "var(--radius-md)",
                        background: selectedAgent && !assigning ? "#10b981" : "var(--ink-10)",
                        color: selectedAgent && !assigning ? "#fff" : "var(--ink-40)",
                        border: "none", fontWeight: 700, fontSize: 13,
                        cursor: selectedAgent && !assigning ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                        transition: "all 0.15s",
                        boxShadow: selectedAgent && !assigning
                          ? "0 2px 8px rgba(16,185,129,0.35)" : "none",
                      }}
                    >
                      {assigning ? (
                        <>
                          <div style={{
                            width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                            borderTopColor: "#fff", borderRadius: "50%",
                            animation: "spin 0.7s linear infinite",
                          }} />
                          Assigning…
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                          Assign Route to {selectedAgent ? selectedAgent.name : "Agent"}
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartRoute;
