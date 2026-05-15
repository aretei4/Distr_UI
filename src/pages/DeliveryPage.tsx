import React, { useEffect, useState } from "react";
import { fetchDeliveryData } from "../services/DeliveryService";
import CalendarInput from "../components/CalendarInput";
import { Delivery } from "../models/DeliveryModel";
import { PageHeader, DataTable, TR, TD, Select, StatusBadge } from "../components/ui";

const DeliveryPage: React.FC = () => {
  const [deliveries, setDeliveries]       = useState<Delivery[]>([]);
  const [filtered, setFiltered]           = useState<Delivery[]>([]);
  const [fromDate, setFromDate]           = useState("");
  const [toDate, setToDate]               = useState("");
  const [deliveryIdFilter, setIdFilter]   = useState("");
  const [deliveredFilter, setDelFilter]   = useState("ALL");

  useEffect(() => {
    if (fromDate && toDate) {
      fetchDeliveryData(fromDate, toDate)
        .then(data => { setDeliveries(data); setFiltered(data); })
        .catch(console.error);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    let temp = [...deliveries];
    if (deliveryIdFilter.trim()) temp = temp.filter(d => d.delivery_id.toString().includes(deliveryIdFilter));
    if (deliveredFilter !== "ALL") temp = temp.filter(d => d.delivered === (deliveredFilter === "YES"));
    setFiltered(temp);
  }, [deliveryIdFilter, deliveredFilter, deliveries]);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Delivery Report" subtitle="Filter by date range to load records" />

      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <CalendarInput label="From Date" value={fromDate} onChange={setFromDate} />
        <CalendarInput label="To Date"   value={toDate}   onChange={setToDate} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Delivery ID
          </label>
          <input
            value={deliveryIdFilter} onChange={e => setIdFilter(e.target.value)}
            placeholder="Filter by ID"
            style={{ padding: "9px 12px", border: "1.5px solid var(--ink-10)", borderRadius: "var(--radius-md)", fontSize: 13, fontFamily: "'Inter', sans-serif", outline: "none" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-60)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Delivered
          </label>
          <Select value={deliveredFilter} onChange={setDelFilter}>
            <option value="ALL">All</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </Select>
        </div>
      </div>

      <DataTable
        headers={["Delivery ID", "Picklist No", "Delivered", "OTP", "Payment", "Reason", "Date"]}
        empty={filtered.length === 0}
        emptyText={fromDate && toDate ? "No records found" : "Select a date range to load data"}
      >
        {filtered.map((d, i) => (
          <TR key={i}>
            <TD style={{ fontWeight: 700 }}>{d.delivery_id}</TD>
            <TD>{d.picklist_no}</TD>
            <TD><StatusBadge status={d.delivered ? "YES" : "NO"} /></TD>
            <TD><StatusBadge status={d.otp ? "YES" : "NO"} /></TD>
            <TD style={{ fontWeight: 600 }}>₹{d.payment_amount}</TD>
            <TD style={{ color: "var(--ink-60)" }}>{d.reason || "—"}</TD>
            <TD style={{ color: "var(--ink-60)" }}>{d.delivery_date}</TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default DeliveryPage;
