import React, { useEffect, useState } from "react";
import { fetchDeliveryData } from "../services/DeliveryService";
import CalendarInput from "../components/CalendarInput";
import { Delivery } from "../models/DeliveryModel";

const DeliveryPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filtered, setFiltered] = useState<Delivery[]>([]);

  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const [deliveryIdFilter, setDeliveryIdFilter] = useState<string>("");
  const [deliveredFilter, setDeliveredFilter] = useState<string>("ALL");

  // 🔹 Load after selecting both dates
  useEffect(() => {
    if (fromDate !== "" && toDate !== "") {
      loadData();
    }
  }, [fromDate, toDate]);

  const loadData = async () => {
    try {
      const data = await fetchDeliveryData(fromDate, toDate);
      setDeliveries(data);
      setFiltered(data); // Reset table
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  // 🔹 UI Filtering only (no backend call)
  useEffect(() => {
    let temp = [...deliveries];

    if (deliveryIdFilter.trim() !== "") {
      temp = temp.filter((d) =>
        d.delivery_id.toString().includes(deliveryIdFilter)
      );
    }

    if (deliveredFilter !== "ALL") {
      const isDelivered = deliveredFilter === "YES";
      temp = temp.filter((d) => d.delivered === isDelivered);
    }

    setFiltered(temp);
  }, [deliveryIdFilter, deliveredFilter, deliveries]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Delivery Status</h2>

      {/* 🔹 DATE FILTERS */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <CalendarInput
          label="From Date"
          value={fromDate}
          onChange={setFromDate}
        />
        <CalendarInput
          label="To Date"
          value={toDate}
          onChange={setToDate}
        />
      </div>

      {/* 🔹 UI Filters */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Filter by Delivery ID"
          value={deliveryIdFilter}
          onChange={(e) => setDeliveryIdFilter(e.target.value)}
        />

        <select
          value={deliveredFilter}
          onChange={(e) => setDeliveredFilter(e.target.value)}
        >
          <option value="ALL">Delivered: All</option>
          <option value="YES">Delivered: Yes</option>
          <option value="NO">Delivered: No</option>
        </select>
      </div>

      {/* 🔹 TABLE */}
      <table border={1} cellPadding={8} width="100%">
        <thead>
          <tr>
            <th>Delivery ID</th>
            <th>Picklist No</th>
            <th>Delivered</th>
            <th>OTP</th>
            <th>Payment</th>
            <th>Reason</th>
            <th>Delivery Date</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ textAlign: "center" }}>
                No Records Found
              </td>
            </tr>
          ) : (
            filtered.map((d, idx) => (
              <tr key={idx}>
                <td>{d.delivery_id}</td>
                <td>{d.picklist_no}</td>
                <td>{d.delivered ? "Yes" : "No"}</td>
                <td>{d.otp ? "Yes" : "No"}</td>
                <td>{d.payment_amount}</td>
                <td>{d.reason}</td>
                <td>{d.delivery_date}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DeliveryPage;
