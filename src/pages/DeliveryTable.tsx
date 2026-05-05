import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ApiEndpoints } from "../constants/config";
import { PageHeader, DataTable, TR, TD, SearchInput, Btn, Card } from "../components/ui";

interface DeliveryEntry {
  picklistNo: string; customerNo: string; custDesc: string;
  netValue: number; updateDate: string;
}

interface Agent { id: number; name: string; phone: string; contact: string; }

const DeliveryTable: React.FC = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent]   = useState<Agent | null>(null);
  const [data, setData]     = useState<DeliveryEntry[]>([]);
  const [filtered, setFiltered] = useState<DeliveryEntry[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) return;
    const stored = localStorage.getItem("DELIVERY_AGENTS");
    if (stored) {
      const list = JSON.parse(stored);
      setAgent(list.find((a: Agent) => a.id.toString() === agentId) ?? null);
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) return;
    fetch(`${ApiEndpoints.DELIVERY_ASIGN_LIST}${agentId}`)
      .then(r => r.json())
      .then(res => {
        const norm = res.map((d: any) => ({ ...d, netValue: Number(d.netValue || 0) }));
        setData(norm); setFiltered(norm);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? data.filter(d =>
      d.custDesc.toLowerCase().includes(q) || d.picklistNo.toLowerCase().includes(q)
    ) : data);
  }, [search, data]);

  const deleteRow = async (picklistNo: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      await fetch(`${ApiEndpoints.DELETE_DELIVERY}/${picklistNo}`, { method: "DELETE" });
      const updated = data.filter(d => d.picklistNo !== picklistNo);
      setData(updated); setFiltered(updated);
    } catch { alert("Delete failed"); }
  };

  const totalValue = filtered.reduce((a, d) => a + d.netValue, 0);

  return (
    <div className="animate-fade-up">
      <div style={{ marginBottom: 20 }}>
        <Btn variant="ghost" onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>
          ← Back to Agents
        </Btn>
        <PageHeader
          title={agent ? agent.name : "Delivery Details"}
          subtitle={agent ? `${agent.contact || agent.phone} · ${data.length} picklists assigned` : ""}
        />
      </div>

      {/* Agent card */}
      {agent && (
        <Card style={{ marginBottom: 20 }} padding="16px 20px">
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "var(--brand)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
            }}>{agent.name.slice(0, 2).toUpperCase()}</div>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{agent.name}</p>
              <p style={{ fontSize: 13, color: "var(--ink-60)", marginTop: 2 }}>📞 {agent.contact || agent.phone}</p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <p style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 22, color: "var(--brand)" }}>
                ₹{totalValue.toLocaleString("en-IN")}
              </p>
              <p style={{ fontSize: 12, color: "var(--ink-40)", marginTop: 2 }}>Total picklist value</p>
            </div>
          </div>
        </Card>
      )}

      <div style={{ marginBottom: 16 }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search customer or picklist…" width="300px" />
      </div>

      <DataTable
        headers={["Picklist No", "Customer No", "Customer Name", "Net Value", "Updated", "Action"]}
        loading={loading}
        empty={filtered.length === 0}
        emptyText="No records found"
      >
        {filtered.map((row, i) => (
          <TR key={i}>
            <TD style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--brand)" }}>
              {row.picklistNo}
            </TD>
            <TD style={{ color: "var(--ink-60)" }}>{row.customerNo}</TD>
            <TD style={{ fontWeight: 500 }}>{row.custDesc}</TD>
            <TD style={{ fontWeight: 700, textAlign: "right" }}>
              ₹{row.netValue.toFixed(2)}
            </TD>
            <TD style={{ color: "var(--ink-60)" }}>{row.updateDate}</TD>
            <TD>
              <Btn size="sm" variant="danger" onClick={() => deleteRow(row.picklistNo)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                Delete
              </Btn>
            </TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default DeliveryTable;
