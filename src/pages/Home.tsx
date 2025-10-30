import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface SalesEntry {
  picklistNo: string;
  salesOrderNo: string;
  customerNo: string;
  custDesc: string;
  salesRepNo: string;
  salesRepName: string;
  route: string;
  routeName: string;
  billingDate: number;
  warehouse: string;
  netValue: number;
  updateDate: number;
  buId: number;
}

const SalesTable: React.FC = () => {
  const [sales, setSales] = useState<SalesEntry[]>([]);
  const [filtered, setFiltered] = useState<SalesEntry[]>([]);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:8080/api/sales?Picklist_No=E587P22657") // Change to your backend endpoint
      .then((res) => res.json())
      .then((data) => {
        setSales(data);
        setFiltered(data);
      })
      .catch((err) => console.error("Error fetching sales:", err));
  }, []);

  useEffect(() => {
    const query = search.toLowerCase();
    setFiltered(
      sales.filter(
        (item) =>
          item.custDesc.toLowerCase().includes(query) ||
          item.salesRepName.toLowerCase().includes(query) ||
          item.routeName.toLowerCase().includes(query) ||
          item.picklistNo.toLowerCase().includes(query)
      )
    );
  }, [search, sales]);

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-IN");

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4 text-gray-800">
        Sales Entry Table
      </h1>

      <input
        type="text"
        placeholder="Search by Customer, Sales Rep, Route..."
        className="border p-2 rounded-md mb-4 w-full md:w-1/2 shadow-sm focus:ring focus:ring-blue-200"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <table className="min-w-full text-sm text-left border border-gray-200">
          <thead className="bg-gray-100 text-gray-700 uppercase">
            <tr>
              <th className="p-2 border">Picklist No</th>
              <th className="p-2 border">Sales Order</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border">Sales Rep</th>
              <th className="p-2 border">Route</th>
              <th className="p-2 border">Billing Date</th>
              <th className="p-2 border">Warehouse</th>
              <th className="p-2 border text-right">Net Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-4 text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr
                  key={item.picklistNo}
                  onClick={() => navigate(`/sales/${item.picklistNo}`)}
                  className="border-t hover:bg-blue-50 cursor-pointer transition"
                >
                  <td className="p-2 border">{item.picklistNo}</td>
                  <td className="p-2 border">{item.salesOrderNo}</td>
                  <td className="p-2 border">{item.custDesc}</td>
                  <td className="p-2 border">{item.salesRepName}</td>
                  <td className="p-2 border">{item.routeName}</td>
                  <td className="p-2 border">{formatDate(item.billingDate)}</td>
                  <td className="p-2 border">{item.warehouse}</td>
                  <td className="p-2 border text-right font-medium text-gray-700">
                    ₹{item.netValue.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesTable;
