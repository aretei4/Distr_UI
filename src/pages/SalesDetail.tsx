import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchDeliveryAgents } from "../services/DeliveryService";
import { assignDelivery, pendingDanCheck } from "../services/salesService";
import { PageHeader, DataTable, TR, TD, Btn, Card, Field, TextInput } from "../components/ui";

interface SalesEntry { direId?: number; invoiceNo?: string; salesOrderNo?: string; picklistNo: string; custDesc: string; netValue: number; }
interface DeliveryBoy { id: number; name: string; contact: string; }

const SalesDetail: React.FC = () => {
  const location = useLocation();
  const navigate  = useNavigate();
  const selected: SalesEntry[] = location.state?.selectedSales || [];

  const [search, setSearch]             = useState("");
  const [carNo, setCarNo]               = useState("");
  const [driverName, setDriverName]     = useState("");
  const [mobile, setMobile]             = useState("");
  const [deliveryList, setDeliveryList] = useState<DeliveryBoy[]>([]);
  const [filtered, setFiltered]         = useState<DeliveryBoy[]>([]);
  const [showSug, setShowSug]           = useState(false);
  const [query, setQuery]               = useState("");
  const [boyId, setBoyId]               = useState<number | null>(null);

  useEffect(() => {
    fetchDeliveryAgents()
      .then(setDeliveryList)
      .catch(() => setDeliveryList([
        { id: 30, name: "Anil Patra", contact: "9988776655" },
        { id: 31, name: "Ranjan Sahoo", contact: "9876543210" },
      ]));
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(q ? deliveryList.filter(d => d.name.toLowerCase().includes(q) || d.contact.includes(q)) : []);
  }, [query, deliveryList]);

  const handleSubmit = async () => {
    if (!boyId) { alert("Please select a delivery boy."); return; }

    // Check for pending DANs before dispatching
    try {
      const checkJson = await pendingDanCheck();
      if (!checkJson.success) {
        alert("⚠️ Cannot dispatch: " + checkJson.message);
        return;
      }
    } catch { alert("❌ Could not verify DAN status. Please try again."); return; }

    const picklistNos = selected.map(s => s.picklistNo);
    const direIds = selected.map(s => s.direId).filter(Boolean);
    const payload: any = { deliveryBoyId: boyId, picklistNos, direIds };
    if (carNo || driverName || mobile) payload.car = { carNo, driverName, mobile };
    try {
      await assignDelivery(payload);
      alert("✅ Delivery assigned successfully");
      navigate("/agents");
    } catch { alert("❌ Assignment failed"); }
  };

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return selected.filter(s => s.picklistNo.toLowerCase().includes(q) || s.custDesc.toLowerCase().includes(q));
  }, [search, selected]);

  const total = selected.reduce((a, s) => a + s.netValue, 0);

  return (
    <div className="animate-fade-up">
      <Btn variant="ghost" onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>← Back</Btn>
      <PageHeader title="Assign Delivery" subtitle={`${selected.length} picklists · ₹${total.toLocaleString("en-IN")} total`}
        action={<Btn variant="primary" onClick={handleSubmit}>Submit Dispatch →</Btn>}
      />

      <Card style={{ marginBottom: 20 }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--ink)" }}>
          Assignment Details
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>
          <Field label="Car No"><TextInput value={carNo} onChange={setCarNo} placeholder="Optional" /></Field>
          <Field label="Driver Name"><TextInput value={driverName} onChange={setDriverName} placeholder="Optional" /></Field>
          <Field label="Delivery Boy">
            <div style={{ position: "relative" }}>
              <input
                value={query}
                onChange={e => { setQuery(e.target.value); setShowSug(true); setBoyId(null); }}
                placeholder="Search delivery boy…"
                autoComplete="off"
                style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)", fontSize: 13.5, fontFamily: "'Inter', sans-serif", outline: "none" }}
              />
              {showSug && filtered.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--white)", border: "1px solid var(--ink-10)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-md)", zIndex: 50, maxHeight: 180, overflowY: "auto" }}>
                  {filtered.map(d => (
                    <div key={d.id} onClick={() => { setBoyId(d.id); setQuery(d.name); setMobile(d.contact); setShowSug(false); }}
                      style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid var(--ink-5)" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--ink-5)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                      <span style={{ color: "var(--ink-40)", marginLeft: 6 }}>{d.contact}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>
          <Field label="Mobile"><TextInput value={mobile} onChange={setMobile} placeholder="Auto-filled" /></Field>
        </div>
      </Card>

      <div style={{ marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search picklist or customer…"
          style={{ padding: "9px 14px", border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)", fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none", width: 300 }} />
      </div>

      <DataTable headers={["#", "Invoice No", "Customer", "Net Value"]} empty={rows.length === 0}>
        {rows.map((s, i) => (
          <TR key={s.direId ?? s.picklistNo}>
            <TD style={{ width: 40, color: "var(--ink-40)", fontSize: 12 }}>{i + 1}</TD>
            <TD style={{ fontWeight: 700, fontFamily: "monospace", color: "#b45309" }}>
              {s.salesOrderNo || s.invoiceNo || s.picklistNo || "—"}
            </TD>
            <TD style={{ fontWeight: 500 }}>{s.custDesc}</TD>
            <TD style={{ textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>
              ₹{s.netValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </TD>
          </TR>
        ))}
        {rows.length > 1 && (
          <TR key="__total__">
            <TD style={{ borderTop: "1px solid var(--ink-10)" }} />
            <TD style={{ borderTop: "1px solid var(--ink-10)" }} />
            <TD style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: "var(--ink-60)", borderTop: "1px solid var(--ink-10)" }}>
              Total ({rows.length} items)
            </TD>
            <TD style={{ textAlign: "right", fontWeight: 800, fontSize: 15, color: "var(--brand)", borderTop: "1px solid var(--ink-10)", whiteSpace: "nowrap" }}>
              ₹{rows.reduce((a, s) => a + s.netValue, 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </TD>
          </TR>
        )}
      </DataTable>
    </div>
  );
};

export default SalesDetail;
