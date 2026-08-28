import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import {
  fetchTrackAgents, fetchTrackTrail,
  type TrackAgent, type TrackPoint, type TrackTrail,
} from "../../services/trackingService";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const ROUTE_COLOR   = "#4f46e5";
const STOP_COLOR    = "#d97706";
const START_COLOR   = "#1a7a4a";
const END_COLOR     = "#b3261e";

/* HTML date inputs speak yyyy-MM-dd; the API speaks dd/MM/yyyy. */
const toApiDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};
const todayIso = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const km = (v: number) => (v >= 1 ? `${v.toFixed(2)} km` : `${Math.round(v * 1000)} m`);

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{
      flex: "1 1 150px", background: "#fff", border: "1px solid var(--ink-10)",
      borderRadius: 10, padding: "12px 14px",
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-40)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: color ?? "var(--ink)", marginTop: 3, fontFamily: "'Inter', sans-serif" }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--ink-40)", marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

/** Detail shown for whichever point the user picked. */
function PointDetail({ point }: { point: TrackPoint }) {
  const rows: Array<[string, string]> = [
    ["Time",              point.timeText],
    ["Time spent here",   point.dwellText],
    ["Distance from previous", km(point.legDistanceKm)],
    ["Distance covered so far", km(point.cumulativeKm)],
    ["Elapsed since start", point.elapsedText],
    ["Coordinates",       `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`],
    ["GPS accuracy",      point.accuracy != null ? `±${point.accuracy.toFixed(0)} m` : "—"],
    ["Speed",             point.speed != null ? `${point.speed.toFixed(1)} m/s` : "—"],
  ];

  return (
    <div style={{
      background: "var(--brand-xlight, #f5f7ff)", border: "1px solid var(--ink-10)",
      borderRadius: 10, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span style={{
          background: point.stopped ? "#fef9ec" : "var(--brand)",
          color: point.stopped ? "#92610a" : "#fff",
          border: point.stopped ? "1px solid #fcd48a" : "none",
          borderRadius: 6, padding: "2px 9px", fontSize: 11, fontWeight: 800,
        }}>
          Point #{point.seq}
        </span>
        {point.stopped && (
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#92610a" }}>
            Stopped here for {point.dwellText}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "8px 18px" }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5 }}>
            <span style={{ color: "var(--ink-40)" }}>{k}</span>
            <span style={{ fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>{v}</span>
          </div>
        ))}
      </div>

      <a
        href={`https://www.google.com/maps?q=${point.latitude},${point.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "inline-block", marginTop: 12, fontSize: 12, fontWeight: 700,
          color: "var(--brand)", textDecoration: "none",
        }}
      >
        Open in Google Maps ↗
      </a>
    </div>
  );
}

/**
 * The day's trail drawn as a route: a polyline through every ping, numbered
 * markers at each one, and an info window on the point the user picks. Start,
 * stops and the final position are colour-coded.
 */
function TrailMap({
  trail, selected, onSelect,
}: { trail: TrackTrail; selected: number | null; onSelect: (seq: number | null) => void }) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });
  const mapRef = useRef<google.maps.Map | null>(null);

  const path = trail.points.map(p => ({ lat: p.latitude, lng: p.longitude }));

  /* Frame the whole trail whenever it changes */
  const fitTrail = useCallback((map: google.maps.Map | null) => {
    if (!map || path.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    path.forEach(p => bounds.extend(p));
    if (path.length === 1) map.setCenter(path[0]);
    else                   map.fitBounds(bounds, 48);
  }, [trail.deliveryId, trail.date, trail.pointCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fitTrail(mapRef.current); }, [fitTrail]);

  /* Pan to the point picked in the table so map and list stay in step */
  useEffect(() => {
    const p = trail.points.find(x => x.seq === selected);
    if (p && mapRef.current) mapRef.current.panTo({ lat: p.latitude, lng: p.longitude });
  }, [selected, trail.points]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div style={{ padding: "14px 16px", border: "1px dashed var(--ink-10)", borderRadius: 10, color: "var(--ink-40)", fontSize: 13 }}>
        Map unavailable — VITE_GOOGLE_MAPS_API_KEY is not set.
      </div>
    );
  }
  if (loadError) {
    return (
      <div style={{ padding: "14px 16px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, color: "#991b1b", fontSize: 13 }}>
        Could not load Google Maps.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div style={{ height: 420, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--ink-10)", borderRadius: 12, color: "var(--ink-40)", fontSize: 13 }}>
        Loading map…
      </div>
    );
  }

  const sel = trail.points.find(p => p.seq === selected) ?? null;

  return (
    <div style={{ border: "1px solid var(--ink-10)", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: 420 }}
        zoom={13}
        center={path[0]}
        onLoad={m => { mapRef.current = m; fitTrail(m); }}
        onUnmount={() => { mapRef.current = null; }}
        options={{
          streetViewControl: false, mapTypeControl: false, fullscreenControl: true,
          styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
        }}
      >
        {/* The route itself */}
        {path.length > 1 && (
          <Polyline
            path={path}
            options={{
              strokeColor: ROUTE_COLOR, strokeOpacity: 0.75, strokeWeight: 4, geodesic: true,
              icons: [{
                icon: { path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 2.6, strokeColor: ROUTE_COLOR },
                offset: "0", repeat: "90px",
              }],
            }}
          />
        )}

        {/* One marker per ping */}
        {trail.points.map(p => {
          const isSel   = p.seq === selected;
          const isFirst = p.seq === 1;
          const isLast  = p.seq === trail.pointCount;
          const color   = isFirst ? START_COLOR : isLast ? END_COLOR : p.stopped ? STOP_COLOR : ROUTE_COLOR;
          return (
            <Marker
              key={p.seq}
              position={{ lat: p.latitude, lng: p.longitude }}
              onClick={() => onSelect(isSel ? null : p.seq)}
              label={{ text: String(p.seq), color: "#fff", fontWeight: "800", fontSize: "11px" }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: isSel ? 15 : p.stopped ? 13 : 11,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: isSel ? 3 : 1.5,
              }}
              zIndex={isSel ? 999 : p.stopped ? 50 : 10}
              title={`#${p.seq} · ${p.timeText}`}
            />
          );
        })}

        {/* Details for the picked point */}
        {sel && (
          <InfoWindow
            position={{ lat: sel.latitude, lng: sel.longitude }}
            onCloseClick={() => onSelect(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -16) }}
          >
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, minWidth: 190, color: "#111" }}>
              <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 5 }}>
                Point #{sel.seq} · {sel.timeText}
              </div>
              {sel.stopped && (
                <div style={{ display: "inline-block", background: "#fef3c7", border: "1px solid #fcd48a", color: "#92610a", borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 800, marginBottom: 5 }}>
                  STOP
                </div>
              )}
              {([
                ["Time spent here",  sel.dwellText],
                ["From previous",    km(sel.legDistanceKm)],
                ["Covered so far",   km(sel.cumulativeKm)],
                ["Elapsed",          sel.elapsedText],
                ["Accuracy",         sel.accuracy != null ? `±${sel.accuracy.toFixed(0)} m` : "—"],
              ] as Array<[string, string]>).map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 14, lineHeight: 1.65 }}>
                  <span style={{ color: "#666" }}>{k}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
              <div style={{ color: "#888", fontSize: 10.5, marginTop: 5 }}>
                {sel.latitude.toFixed(6)}, {sel.longitude.toFixed(6)}
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center",
        padding: "8px 14px", borderTop: "1px solid var(--ink-10)", background: "var(--ink-5)",
        fontSize: 11.5, color: "var(--ink-60)",
      }}>
        {([["Start", START_COLOR], ["Route", ROUTE_COLOR], ["Stop", STOP_COLOR], ["Last seen", END_COLOR]] as Array<[string, string]>)
          .map(([label, c]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: c, border: "1px solid #fff", boxShadow: "0 0 0 1px var(--ink-10)" }} />
              {label}
            </span>
          ))}
        <span style={{ marginLeft: "auto", color: "var(--ink-40)" }}>Click any point for details</span>
      </div>
    </div>
  );
}

const AgentTrackingTab: React.FC = () => {
  const [date,     setDate]     = useState(todayIso());   // defaults to today
  const [agents,   setAgents]   = useState<TrackAgent[]>([]);
  const [agentId,  setAgentId]  = useState<number | null>(null);
  const [trail,    setTrail]    = useState<TrackTrail | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  /* Agents for the chosen date — the one with data is pre-selected */
  useEffect(() => {
    let live = true;
    fetchTrackAgents(toApiDate(date))
      .then(list => {
        if (!live) return;
        setAgents(list);
        setAgentId(prev => {
          if (prev && list.some(a => a.deliveryId === prev)) return prev;
          return (list.find(a => a.pointCount > 0) ?? list[0])?.deliveryId ?? null;
        });
      })
      .catch(() => { if (live) { setAgents([]); setError("Could not load agents"); } });
    return () => { live = false; };
  }, [date]);

  const loadTrail = useCallback(() => {
    if (!agentId) { setTrail(null); return; }
    setLoading(true);
    setError("");
    setSelected(null);
    fetchTrackTrail(agentId, toApiDate(date))
      .then(setTrail)
      .catch(() => { setTrail(null); setError("Could not load the trail for this agent"); })
      .finally(() => setLoading(false));
  }, [agentId, date]);

  useEffect(() => { loadTrail(); }, [loadTrail]);

  const point = trail?.points.find(p => p.seq === selected) ?? null;

  const inputStyle: React.CSSProperties = {
    padding: "7px 10px", border: "1.5px solid var(--ink-10)", borderRadius: 8,
    fontSize: 13, background: "#fff", color: "var(--ink)", fontFamily: "'Inter', sans-serif",
    outline: "none",
  };

  return (
    <div>
      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ink-40)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Delivery agent
          </label>
          <select
            value={agentId ?? ""}
            onChange={e => setAgentId(e.target.value ? Number(e.target.value) : null)}
            style={{ ...inputStyle, minWidth: 220, cursor: "pointer" }}
          >
            {agents.length === 0 && <option value="">No agents</option>}
            {agents.map(a => (
              <option key={a.deliveryId} value={a.deliveryId}>
                {a.agentName}{a.pointCount > 0 ? ` — ${a.pointCount} points` : " — no data"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "var(--ink-40)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".04em" }}>
            Date
          </label>
          <input
            type="date"
            value={date}
            max={todayIso()}
            onChange={e => setDate(e.target.value || todayIso())}
            style={{ ...inputStyle, cursor: "pointer" }}
          />
        </div>

        <button
          onClick={() => setDate(todayIso())}
          style={{
            ...inputStyle, cursor: "pointer", fontWeight: 700,
            color: "var(--brand)", borderColor: "var(--brand)", background: "transparent",
          }}
        >
          Today
        </button>

        <button
          onClick={loadTrail}
          style={{
            padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "var(--brand)", color: "#fff", fontWeight: 700, fontSize: 13,
          }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, color: "#991b1b", fontSize: 13, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-40)", fontSize: 14 }}>
          Loading trail…
        </div>
      )}

      {!loading && trail && trail.pointCount === 0 && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-40)", fontSize: 14 }}>
          No location recorded for {trail.agentName ?? "this agent"} on {trail.date}
        </div>
      )}

      {!loading && trail && trail.pointCount > 0 && (
        <>
          {/* ── Day summary ── */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <Stat label="Distance covered" value={km(trail.totalDistanceKm)} color="var(--brand)" />
            <Stat label="On the road"      value={trail.totalDurationText} sub={`${trail.firstPointAt} → ${trail.lastPointAt}`} />
            <Stat label="Moving"           value={trail.movingText} color="#1a7a4a" />
            <Stat label="Stopped"          value={trail.stoppedText} sub={`${trail.stopCount} stop${trail.stopCount === 1 ? "" : "s"}`} color="#92610a" />
            <Stat label="Points logged"    value={String(trail.pointCount)} />
          </div>

          {/* ── Route on the map ── */}
          <TrailMap trail={trail} selected={selected} onSelect={setSelected} />

          {/* ── Selected point ── */}
          <div style={{ marginBottom: 16 }}>
            {point
              ? <PointDetail point={point} />
              : (
                <div style={{
                  padding: "12px 16px", border: "1px dashed var(--ink-10)", borderRadius: 10,
                  color: "var(--ink-40)", fontSize: 13,
                }}>
                  Select a point below to see the time spent there and the distance covered.
                </div>
              )}
          </div>

          {/* ── Trail ── */}
          <div style={{ border: "1px solid var(--ink-10)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "var(--ink-5)" }}>
                    {["#", "Time", "Time spent", "Leg", "Total distance", "Elapsed", "Coordinates"].map((h, i) => (
                      <th key={h} style={{
                        padding: "9px 12px", textAlign: i >= 3 && i <= 5 ? "right" : "left",
                        fontSize: 10, fontWeight: 700, color: "var(--ink-60)",
                        textTransform: "uppercase", letterSpacing: ".05em",
                        borderBottom: "1px solid var(--ink-10)", whiteSpace: "nowrap",
                        position: "sticky", top: 0, background: "var(--ink-5)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trail.points.map(p => {
                    const isSel = p.seq === selected;
                    return (
                      <tr
                        key={p.seq}
                        onClick={() => setSelected(isSel ? null : p.seq)}
                        style={{
                          cursor: "pointer",
                          borderBottom: "1px solid var(--ink-5)",
                          background: isSel ? "var(--brand-xlight, #eef2ff)" : p.stopped ? "#fffbf0" : "#fff",
                        }}
                      >
                        <td style={{ padding: "8px 12px", fontWeight: 800, color: isSel ? "var(--brand)" : "var(--ink-40)" }}>
                          {p.seq}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, whiteSpace: "nowrap" }}>
                          {p.timeText}
                          {p.stopped && (
                            <span style={{ marginLeft: 7, fontSize: 9.5, fontWeight: 800, color: "#92610a", background: "#fef3c7", border: "1px solid #fcd48a", borderRadius: 4, padding: "1px 5px" }}>
                              STOP
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: p.stopped ? "#92610a" : "var(--ink-60)", fontWeight: p.stopped ? 700 : 400 }}>
                          {p.dwellText}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--ink-60)", whiteSpace: "nowrap" }}>
                          {p.legDistanceKm > 0 ? km(p.legDistanceKm) : "—"}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {km(p.cumulativeKm)}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "right", color: "var(--ink-60)", whiteSpace: "nowrap" }}>
                          {p.elapsedText}
                        </td>
                        <td style={{ padding: "8px 12px", color: "var(--ink-40)", fontSize: 11.5, whiteSpace: "nowrap" }}>
                          {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentTrackingTab;
