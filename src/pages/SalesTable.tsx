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
  const [filteredSales, setFilteredSales] = useState<SalesEntry[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // Fetch data from backend
  useEffect(() => {
 fetch("http://localhost:8080/api/sales?Picklist_No=E587P22657")
      .then((res) => res.json())
      .then((data) => {
        setSales(data);
        setFilteredSales(data);
      })
      .catch((err) => console.error("Error fetching sales:", err));
  }, []);

  // Search filter
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredSales(sales);
    } else {
      const q = searchTerm.toLowerCase();
      setFilteredSales(
        sales.filter(
          (s) =>
            s.picklistNo.toLowerCase().includes(q) ||
            s.salesOrderNo.toLowerCase().includes(q) ||
            s.customerNo.toLowerCase().includes(q) ||
            s.custDesc.toLowerCase().includes(q) ||
            s.salesRepNo.toLowerCase().includes(q) ||
            s.salesRepName?.toLowerCase().includes(q) ||
            s.route.toLowerCase().includes(q) ||
            s.routeName.toLowerCase().includes(q) ||
            s.warehouse.toLowerCase().includes(q)
        )
      );
    }
  }, [searchTerm, sales]);

  // Row selection
  const handleRowSelect = (picklistNo: string) => {
    setSelectedRows((prev) =>
      prev.includes(picklistNo)
        ? prev.filter((p) => p !== picklistNo)
        : [...prev, picklistNo]
    );
  };

  // Select all
  const handleSelectAll = () => {
    if (selectedRows.length === filteredSales.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredSales.map((s) => s.picklistNo));
    }
  };

  // Delete selected rows
  const handleDeleteSelected = () => {
    if (selectedRows.length === 0) {
      alert("Please select at least one row to delete.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete selected rows?")) return;

    fetch("http://localhost:8080/api/sales/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selectedRows),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Delete failed");
        setSales((prev) => prev.filter((s) => !selectedRows.includes(s.picklistNo)));
        setSelectedRows([]);
      })
      .catch((err) => console.error("Delete error:", err));
  };

  // Next button navigation
  const handleNext = () => {
    const selectedSales = sales.filter((s) =>
      selectedRows.includes(s.picklistNo)
    );
    if (selectedSales.length === 0) {
      alert("Please select at least one record before proceeding.");
      return;
    }
    navigate("/sales/sales-detail", { state: { selectedSales } });
  };

  return (
    <div className="p-6 max-w-[95rem] mx-auto">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Sales Picklist Overview
      </h1>

      {/* Top bar */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-3">
        <div className="flex gap-2">
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Assign Delivery Agent →
          </button>
          <button
            onClick={handleDeleteSelected}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🗑️ Delete Selected
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="🔍 Search picklist, customer, route, sales rep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-2 rounded w-80"
          />
          <div className="text-gray-500 text-sm">
            {selectedRows.length} selected
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="min-w-full border border-gray-200 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border text-center">
                <input
                  type="checkbox"
                  checked={
                    filteredSales.length > 0 &&
                    selectedRows.length === filteredSales.length
                  }
                  onChange={handleSelectAll}
                />
              </th>
              <th className="p-2 border">Picklist No</th>
              <th className="p-2 border">Sales Order</th>
              <th className="p-2 border">Customer No</th>
              <th className="p-2 border">Customer Name</th>
              <th className="p-2 border">Sales Rep</th>
              <th className="p-2 border">Route</th>
              <th className="p-2 border">Warehouse</th>
              <th className="p-2 border text-right">Net Value</th>
              <th className="p-2 border">Billing Date</th>
              
            </tr>
          </thead>
          <tbody>
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center p-4 text-gray-500">
                  No matching records found.
                </td>
              </tr>
            ) : (
              filteredSales.map((row) => (
                <tr
                  key={row.picklistNo}
                  onClick={() => handleRowSelect(row.picklistNo)}
                  className={`cursor-pointer hover:bg-gray-50 ${
                    selectedRows.includes(row.picklistNo)
                      ? "bg-blue-50"
                      : "bg-white"
                  }`}
                >
                  <td className="p-2 border text-center">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.picklistNo)}
                      onChange={() => handleRowSelect(row.picklistNo)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  <td className="p-2 border">{row.picklistNo}</td>
                  <td className="p-2 border">{row.salesOrderNo}</td>
                  <td className="p-2 border">{row.customerNo}</td>
                  <td className="p-2 border">{row.custDesc}</td>
                  <td className="p-2 border">
                    {row.salesRepName} ({row.salesRepNo})
                  </td>
                  <td className="p-2 border">
                    {row.routeName} ({row.route})
                  </td>
                  <td className="p-2 border">{row.warehouse}</td>
                  <td className="p-2 border text-right">
                    ₹{row.netValue.toLocaleString("en-IN")}
                  </td>
                  <td className="p-2 border">
                    {new Date(row.billingDate).toLocaleDateString("en-IN")}
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
