import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDeliveryAgents } from "../services/DeliveryService";
import { PageHeader, DataTable, TR, TD, SearchInput, Btn, StatusBadge } from "../components/ui";

interface DeliveryBoy { id: number; name: string; contact: string; }

const DeliveryAgents: React.FC = () => {
  const [data, setData]         = useState<DeliveryBoy[]>([]);
  const [filtered, setFiltered] = useState<DeliveryBoy[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch]     = useState("");
  const [loading, setLoading]   = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDeliveryAgents()
      .then(res => { setData(res); setFiltered(res); localStorage.setItem("DELIVERY_AGENTS", JSON.stringify(res)); })
      .catch(() => alert("Failed to load agents"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(data.filter(d =>
      d.name.toLowerCase().includes(q) || d.contact?.includes(q)
    ));
  }, [search, data]);

  const toggle = (id: number) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleDelete = () => {
    if (!selected.length) { alert("Select at least one agent"); return; }
    setData(p => p.filter(d => !selected.includes(d.id)));
    setSelected([]);
  };

  // Fake status for demo
  const statuses = ["Online", "Busy", "Offline"];
  const getStatus = (id: number) => statuses[id % 3];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Delivery Agents"
        subtitle={`${data.length} registered agents`}
        action={
          selected.length > 0 ? (
            <Btn variant="danger" onClick={handleDelete}>
              Delete {selected.length} selected
            </Btn>
          ) : undefined
        }
      />

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or phone…" width="300px" />
      </div>

      <DataTable
        headers={["", "ID", "Agent Name", "Phone", "Status", "Deliveries", "Action"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No agents found"
      >
        {filtered.map(boy => {
          const st = getStatus(boy.id);
          return (
            <TR key={boy.id} onClick={() => navigate(`/agents/${boy.id}`)}>
              <TD style={{ width: 48 }}>
                <input
                  type="checkbox"
                  checked={selected.includes(boy.id)}
                  onChange={() => toggle(boy.id)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: 15, height: 15, cursor: "pointer", accentColor: "var(--brand)" }}
                />
              </TD>
              <TD style={{ color: "var(--ink-40)", fontSize: 12 }}>#{boy.id}</TD>
              <TD>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: "var(--brand-light)", color: "var(--brand)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}>{boy.name.slice(0, 2).toUpperCase()}</div>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{boy.name}</span>
                </div>
              </TD>
              <TD style={{ color: "var(--ink-60)", fontFamily: "monospace" }}>{boy.contact}</TD>
              <TD>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11.5, fontWeight: 700, padding: "3px 10px", borderRadius: 50,
                  color: st === "Online" ? "#065f46" : st === "Busy" ? "#92400e" : "var(--ink-60)",
                  background: st === "Online" ? "#d1fae5" : st === "Busy" ? "#fef3c7" : "var(--ink-5)",
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: st === "Online" ? "#10b981" : st === "Busy" ? "#f59e0b" : "var(--ink-40)",
                  }} />
                  {st}
                </span>
              </TD>
              <TD style={{ color: "var(--ink-60)" }}>—</TD>
              <TD>
                <Btn size="sm" variant="ghost" onClick={(e) => { (e as any).stopPropagation?.(); navigate(`/agents/${boy.id}`); }}>
                  View Details →
                </Btn>
              </TD>
            </TR>
          );
        })}
      </DataTable>
    </div>
  );
};

export default DeliveryAgents;
