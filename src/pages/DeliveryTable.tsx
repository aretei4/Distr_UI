import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { ApiEndpoints } from "../constants/config";

interface DeliveryEntry {
  picklistNo: string;
  customerNo: string;
  custDesc: string;
  netValue: number; // ✅ normalized to number
  updateDate: string;
}

interface DeliveryAgent {
  id: number;
  name: string;
  phone: string;
}

const DeliveryTable: React.FC = () => {
  const { agentId } = useParams();
  const [agent, setAgent] = useState<DeliveryAgent | null>(null);
  const [data, setData] = useState<DeliveryEntry[]>([]);
  const [filtered, setFiltered] = useState<DeliveryEntry[]>([]);
  const [search, setSearch] = useState("");

  // Load Agent
  useEffect(() => {
    if (!agentId) return;

    const stored = localStorage.getItem("DELIVERY_AGENTS");
    if (stored) {
      const list = JSON.parse(stored);
      const found = list.find(
        (a: DeliveryAgent) => a.id.toString() === agentId
      );
      setAgent(found);
    }
  }, [agentId]);

  // Load Delivery Data
  useEffect(() => {
    if (!agentId) return;

    fetch(`${ApiEndpoints.DELIVERY_ASIGN_LIST}${agentId}`)
      .then((res) => res.json())
      .then((resp) => {
        // ✅ Normalize netValue to number
        const normalized: DeliveryEntry[] = resp.map((d: any) => ({
          ...d,
          netValue: Number(d.netValue || 0),
        }));

        setData(normalized);
        setFiltered(normalized);
      })
      .catch((err) => console.error("Fetch error:", err));
  }, [agentId]);

  // Search Filter
  useEffect(() => {
    const q = search.toLowerCase();

    if (!q.trim()) {
      setFiltered(data);
    } else {
      setFiltered(
        data.filter(
          (d) =>
            d.custDesc.toLowerCase().includes(q) ||
            d.picklistNo.toLowerCase().includes(q)
        )
      );
    }
  }, [search, data]);

  // Delete Row
  const deleteRow = async (picklistNo: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;

    try {
      await fetch(`${ApiEndpoints.DELETE_DELIVERY}/${picklistNo}`, {
        method: "DELETE",
      });

      const updated = data.filter((d) => d.picklistNo !== picklistNo);
      setData(updated);
      setFiltered(updated);

      alert("Record deleted successfully");
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  return (
    <div className="p-6">
      {/* Agent Header */}
      {agent && (
        <div className="mb-4 pb-2 border-b">
          <h2 className="text-2xl font-semibold text-blue-700">
            Delivery Agent: {agent.name}
          </h2>
          <p className="text-gray-600">📞 {agent.phone}</p>
        </div>
      )}

      {/* Search */}
      <input
        type="text"
        placeholder="Search by Customer Name / Picklist No..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border rounded p-2 mb-4 w-1/2"
      />

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow rounded">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-200 text-gray-700">
            <tr>
              <th className="border px-4 py-2">Picklist No</th>
              <th className="border px-4 py-2">Customer No</th>
              <th className="border px-4 py-2">Customer Name</th>
              <th className="border px-4 py-2">Net Value</th>
              <th className="border px-4 py-2">Updated Date</th>
              <th className="border px-4 py-2">Delete</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length > 0 ? (
              filtered.map((row, index) => (
                <tr key={index} className="hover:bg-gray-100 text-sm">
                  <td className="border px-4 py-2">{row.picklistNo}</td>
                  <td className="border px-4 py-2">{row.customerNo}</td>
                  <td className="border px-4 py-2">{row.custDesc}</td>

                  {/* ✅ FIXED */}
                  <td className="border px-4 py-2 text-right">
                    {row.netValue.toFixed(2)}
                  </td>

                  <td className="border px-4 py-2">{row.updateDate}</td>

                  <td className="border px-4 py-2 text-center">
                    <button
                      onClick={() => deleteRow(row.picklistNo)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-4 text-gray-500">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DeliveryTable;
