import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline } from "@react-google-maps/api";
import CalendarInput from "../components/CalendarInput";
import { fetchMapPoints, MapPoint } from "../services/MapService";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "../services/authService";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

const todayDMY = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
};

interface Agent { id: number; name: string; }
interface Warehouse { id: number; name: string; address: string; lat: number; lon: number; }

const mapContainerStyle = { width: "100%", height: "100%" };
const bbsrCenter = { lat: 20.3010, lng: 85.8240 };

const MapPage: React.FC = () => {
  const today = todayDMY();
  const [fromDate, setFromDate]     = useState(today);
  const [toDate, setToDate]         = useState(today);
  const [points, setPoints]         = useState<MapPoint[]>([]);
  const [agents, setAgents]         = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [ordered, setOrdered]       = useState<MapPoint[]>([]);   // user-selected, in order
  const [warehouses, setWarehouses]   = useState<Warehouse[]>([]);
  const [hoveredWh, setHoveredWh]     = useState<Warehouse | null>(null);
  const [hovered, setHovered]         = useState<MapPoint | null>(null);
  const [loading, setLoading]       = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [copied, setCopied]         = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: GOOGLE_MAPS_API_KEY });

  /* Load agents + warehouses on mount */
  useEffect(() => {
    fetch(ApiEndpoints.DELIVERY_AGENTS, { headers: { ...authHeaders() } })
      .then(r => r.json())
      .then((data: any[]) => setAgents(data.map(a => ({ id: a.id, name: a.name }))))
      .catch(console.error);

    fetch(ApiEndpoints.WAREHOUSES, { headers: { ...authHeaders() } })
      .then(r => r.json())
      .then((data: Warehouse[]) => setWarehouses(data))
      .catch(console.error);
  }, []);

  /* Load map points */
  const load = useCallback(() => {
    setLoading(true);
    setOrdered([]);
    setShowResult(false);
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

  useEffect(() => { if (isLoaded) load(); }, [isLoaded, load]);

  /* Toggle selection */
  const togglePoint = (pt: MapPoint) => {
    setOrdered(prev => {
      const exists = prev.find(p => p.picklist_no === pt.picklist_no);
      if (exists) return prev.filter(p => p.picklist_no !== pt.picklist_no);
      return [...prev, pt];
    });
  };

  const removeStop = (picklist_no: string) =>
    setOrdered(prev => prev.filter(p => p.picklist_no !== picklist_no));

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setOrdered(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    setOrdered(prev => {
      if (idx === prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  /* Build result JSON */
  const resultJson = JSON.stringify(
    ordered.map((p, i) => ({
      picklist_no:    p.picklist_no,
      sequence:       i + 1,
      deliveryBoyId:  selectedAgent?.id   ?? null,
      deliveryBoyName: selectedAgent?.name ?? null,
      address:        p.address ?? "",
      lat:            p.lat,
      lon:            p.lon,
    })),
    null, 2
  );

  const copyJson = () => {
    navigator.clipboard.writeText(resultJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const selectedSet = new Set(ordered.map(p => p.picklist_no));

  if (loadError) return (
    <div style={{ padding: 40, textAlign: "center", color: "#999" }}>
      Failed to load Google Maps. Check your API key.
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - var(--topbar-height) - 48px)", gap: 14 }}>

      {/* ── TOP BAR ── */}
      <div style={{
        display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap",
        background: "#fff", padding: "14px 18px", borderRadius: "var(--radius-md)",
        border: "1px solid var(--ink-10)", flexShrink: 0,
      }}>
        <CalendarInput label="From Date" value={fromDate} onChange={setFromDate} />
        <CalendarInput label="To Date"   value={toDate}   onChange={setToDate} />

        {/* Agent dropdown */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Delivery Agent
          </label>
          <select
            value={selectedAgent?.id ?? ""}
            onChange={e => {
              const ag = agents.find(a => a.id === Number(e.target.value)) ?? null;
              setSelectedAgent(ag);
            }}
            style={{
              padding: "9px 32px 9px 12px", border: "1.5px solid var(--ink-10)",
              borderRadius: "var(--radius-md)", fontSize: 13, fontFamily: "'Inter',sans-serif",
              background: "#fff", cursor: "pointer", minWidth: 200, outline: "none",
            }}
          >
            <option value="">— Select agent —</option>
            {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <button onClick={load} disabled={loading} style={{
          padding: "9px 22px", borderRadius: "var(--radius-md)",
          background: "var(--brand)", color: "#fff", border: "none",
          fontWeight: 600, fontSize: 13, cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Loading…" : "Load Points"}
        </button>

        {/* Warehouse legend */}
        {warehouses.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#f3e8ff", border: "1px solid #d8b4fe" }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: "#1e0a3c" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#1e0a3c" }}>
              {warehouses.length} Warehouse{warehouses.length > 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Instructions */}
        <div style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-40)", fontStyle: "italic" }}>
          {!selectedAgent
            ? "Select an agent, then click stops on the map in delivery order"
            : ordered.length === 0
            ? `Tap stops on the map to build ${selectedAgent.name}'s route`
            : `${ordered.length} stop${ordered.length > 1 ? "s" : ""} selected — reorder if needed, then Confirm`}
        </div>
      </div>

      {/* ── BODY: map + side panel ── */}
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
                streetViewControl: false, mapTypeControl: false,
                fullscreenControl: false,
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
                  onMouseOut={() => setHoveredWh(null)}
                  label={{ text: "W", color: "#fff", fontWeight: "800", fontSize: "12px" }}
                  icon={{
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 16,
                    fillColor: "#1e0a3c",
                    fillOpacity: 1,
                    strokeColor: "#c77dff",
                    strokeWeight: 3,
                  }}
                  title={wh.name}
                  zIndex={999}
                />
              ))}

              {/* Warehouse info window */}
              {hoveredWh && (
                <InfoWindow
                  position={{ lat: hoveredWh.lat, lng: hoveredWh.lon }}
                  onCloseClick={() => setHoveredWh(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, minWidth: 150 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 4,
                        background: "#1e0a3c", display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="11" height="11" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
                          <path d="M9 21V12h6v9"/>
                        </svg>
                      </div>
                      <span style={{ fontWeight: 700, color: "#111" }}>{hoveredWh.name}</span>
                    </div>
                    <div style={{ color: "#666", fontSize: 11 }}>{hoveredWh.address}</div>
                    <div style={{ marginTop: 4, fontSize: 10, color: "#aaa" }}>
                      {hoveredWh.lat.toFixed(4)}, {hoveredWh.lon.toFixed(4)}
                    </div>
                  </div>
                </InfoWindow>
              )}

              {/* Route line with directional arrows */}
              {ordered.length >= 2 && (
                <Polyline
                  path={ordered.map(p => ({ lat: p.lat, lng: p.lon }))}
                  options={{
                    strokeColor: "#7f35b2",
                    strokeOpacity: 0.9,
                    strokeWeight: 4,
                    icons: [
                      {
                        icon: {
                          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                          scale: 4,
                          fillColor: "#7f35b2",
                          fillOpacity: 1,
                          strokeColor: "#fff",
                          strokeWeight: 1,
                        },
                        offset: "0%",
                        repeat: "80px",
                      },
                    ],
                  }}
                />
              )}

              {points.map(pt => {
                const seqIdx = ordered.findIndex(p => p.picklist_no === pt.picklist_no);
                const isSelected = seqIdx !== -1;
                const isHov = hovered?.picklist_no === pt.picklist_no;

                return (
                  <Marker
                    key={pt.picklist_no}
                    position={{ lat: pt.lat, lng: pt.lon }}
                    onClick={() => selectedAgent && togglePoint(pt)}
                    onMouseOver={() => setHovered(pt)}
                    onMouseOut={() => setHovered(null)}
                    label={isSelected ? {
                      text: String(seqIdx + 1),
                      color: "#fff", fontWeight: "700", fontSize: "11px",
                    } : undefined}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: isSelected ? 14 : isHov ? 12 : 10,
                      fillColor: isSelected ? "var(--brand, #7f35b2)" : isHov ? "#555" : "#94a3b8",
                      fillOpacity: 1,
                      strokeColor: "#fff",
                      strokeWeight: 2,
                    }}
                    title={pt.picklist_no}
                  />
                );
              })}

              {/* Hover info */}
              {hovered && (
                <InfoWindow
                  position={{ lat: hovered.lat, lng: hovered.lon }}
                  onCloseClick={() => setHovered(null)}
                  options={{ disableAutoPan: true }}
                >
                  <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, color: "#111", marginBottom: 3 }}>{hovered.picklist_no}</div>
                    <div style={{ color: "#666" }}>{hovered.address ?? ""}</div>
                    {selectedSet.has(hovered.picklist_no) && (
                      <div style={{ color: "var(--brand,#7f35b2)", fontWeight: 600, marginTop: 4, fontSize: 11 }}>
                        ✓ Stop #{ordered.findIndex(p => p.picklist_no === hovered.picklist_no) + 1}
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#aaa" }}>
              Loading map…
            </div>
          )}

          {/* no-agent overlay */}
          {isLoaded && !selectedAgent && (
            <div style={{
              position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center",
              background:"rgba(255,255,255,0.55)", backdropFilter:"blur(2px)",
            }}>
              <div style={{
                background:"#fff", borderRadius:14, padding:"20px 32px", textAlign:"center",
                boxShadow:"0 4px 24px rgba(0,0,0,0.12)",
              }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📍</div>
                <div style={{ fontWeight:700, color:"#111", marginBottom:4 }}>Select a Delivery Agent</div>
                <div style={{ fontSize:12, color:"#aaa" }}>Choose an agent from the dropdown above to start planning the route</div>
              </div>
            </div>
          )}
        </div>

        {/* SIDE PANEL */}
        <div style={{
          width: 300, display:"flex", flexDirection:"column", gap:10, flexShrink:0,
        }}>
          {/* Selected stops list */}
          <div style={{
            flex:1, background:"#fff", borderRadius:"var(--radius-md)",
            border:"1px solid var(--ink-10)", display:"flex", flexDirection:"column", minHeight:0,
          }}>
            <div style={{
              padding:"14px 16px", borderBottom:"1px solid var(--ink-10)",
              fontWeight:700, fontSize:13.5, color:"var(--ink)", flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <span>Route Order</span>
              {ordered.length > 0 && (
                <span style={{ fontSize:11, fontWeight:500, color:"var(--ink-40)" }}>
                  {ordered.length} stop{ordered.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <div style={{ flex:1, overflowY:"auto", padding:"10px 12px" }}>
              {ordered.length === 0 ? (
                <div style={{ textAlign:"center", color:"var(--ink-40)", padding:"30px 0", fontSize:13 }}>
                  <div style={{ fontSize:24, marginBottom:8 }}>🗺️</div>
                  Click stops on the map<br/>to add them here
                </div>
              ) : (
                ordered.map((stop, idx) => (
                  <div key={stop.picklist_no} style={{
                    display:"flex", alignItems:"center", gap:8, marginBottom:8,
                    padding:"10px 10px", borderRadius:10,
                    border:"1px solid var(--ink-10)", background:"#fafafa",
                  }}>
                    {/* Sequence bubble */}
                    <div style={{
                      width:24, height:24, borderRadius:"50%",
                      background:"var(--brand)", color:"#fff",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:11, fontWeight:700, flexShrink:0,
                    }}>{idx + 1}</div>

                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:12, color:"var(--ink)" }}>{stop.picklist_no}</div>
                      <div style={{ fontSize:11, color:"var(--ink-60)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {(stop.address ?? "").replace(", Bhubaneswar","")}
                      </div>
                    </div>

                    {/* Controls */}
                    <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <button onClick={() => moveUp(idx)} disabled={idx === 0}
                        style={{ background:"none", border:"none", cursor:idx===0?"not-allowed":"pointer", color:idx===0?"#ddd":"#888", padding:"1px 4px", fontSize:12 }}>▲</button>
                      <button onClick={() => moveDown(idx)} disabled={idx === ordered.length - 1}
                        style={{ background:"none", border:"none", cursor:idx===ordered.length-1?"not-allowed":"pointer", color:idx===ordered.length-1?"#ddd":"#888", padding:"1px 4px", fontSize:12 }}>▼</button>
                    </div>
                    <button onClick={() => removeStop(stop.picklist_no)}
                      style={{ background:"none", border:"none", cursor:"pointer", color:"#f87171", fontSize:15, padding:"0 2px", lineHeight:1 }}>×</button>
                  </div>
                ))
              )}
            </div>

            {/* Confirm button */}
            <div style={{ padding:"12px 14px", borderTop:"1px solid var(--ink-10)", flexShrink:0 }}>
              <button
                onClick={() => setShowResult(true)}
                disabled={ordered.length === 0 || !selectedAgent}
                style={{
                  width:"100%", padding:"11px 0", borderRadius:"var(--radius-md)",
                  background: ordered.length > 0 && selectedAgent ? "var(--brand)" : "var(--ink-10)",
                  color: ordered.length > 0 && selectedAgent ? "#fff" : "var(--ink-40)",
                  border:"none", fontWeight:700, fontSize:13.5,
                  cursor: ordered.length > 0 && selectedAgent ? "pointer" : "not-allowed",
                  transition:"all 0.15s",
                }}
              >
                ✓ Confirm Route
              </button>
              {ordered.length > 0 && (
                <button onClick={() => setOrdered([])} style={{
                  width:"100%", marginTop:6, padding:"7px 0", borderRadius:"var(--radius-md)",
                  background:"none", border:"1px solid var(--ink-10)", color:"var(--ink-60)",
                  fontWeight:500, fontSize:12, cursor:"pointer",
                }}>
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RESULT MODAL ── */}
      {showResult && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:9999,
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <div style={{
            background:"#fff", borderRadius:16, width:560, maxHeight:"80vh",
            display:"flex", flexDirection:"column", boxShadow:"0 8px 40px rgba(0,0,0,0.2)",
            overflow:"hidden",
          }}>
            {/* Modal header */}
            <div style={{
              padding:"18px 24px", borderBottom:"1px solid var(--ink-10)",
              display:"flex", alignItems:"center", justifyContent:"space-between",
            }}>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:"var(--ink)" }}>Route Confirmed</div>
                <div style={{ fontSize:12, color:"var(--ink-40)", marginTop:2 }}>
                  {selectedAgent?.name} · {ordered.length} stops
                </div>
              </div>
              <button onClick={() => setShowResult(false)} style={{
                background:"none", border:"none", fontSize:20, cursor:"pointer", color:"var(--ink-40)",
              }}>×</button>
            </div>

            {/* JSON */}
            <pre style={{
              flex:1, overflowY:"auto", margin:0,
              padding:"18px 24px", fontSize:12.5,
              fontFamily:"'Fira Code','Courier New',monospace",
              background:"#f8f9fa", color:"#1e293b",
              lineHeight:1.6,
            }}>
              {resultJson}
            </pre>

            {/* Actions */}
            <div style={{
              padding:"14px 24px", borderTop:"1px solid var(--ink-10)",
              display:"flex", gap:10,
            }}>
              <button onClick={copyJson} style={{
                flex:1, padding:"10px 0", borderRadius:"var(--radius-md)",
                background: copied ? "#10b981" : "var(--brand)",
                color:"#fff", border:"none", fontWeight:700, fontSize:13, cursor:"pointer",
                transition:"background 0.2s",
              }}>
                {copied ? "✓ Copied!" : "Copy JSON"}
              </button>
              <button onClick={() => setShowResult(false)} style={{
                flex:1, padding:"10px 0", borderRadius:"var(--radius-md)",
                background:"var(--ink-5)", color:"var(--ink)", border:"1px solid var(--ink-10)",
                fontWeight:600, fontSize:13, cursor:"pointer",
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPage;
