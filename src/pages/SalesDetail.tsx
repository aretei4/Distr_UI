import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiEndpoints } from "../constants/config";

interface SalesEntry {
  picklistNo: string;
  custDesc: string;
  netValue: number;
}

interface CarDetails {
  carNo?: string;
  driverName?: string;
  mobile?: string;
}

interface DeliveryBoy {
  id: number;
  name: string;
  contact: string; // ✅ matches backend
}

const SelectedSales: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selected: SalesEntry[] = location.state?.selectedSales || [];

  const [search, setSearch] = useState("");
  const [car, setCar] = useState<CarDetails>({});
  const [deliveryList, setDeliveryList] = useState<DeliveryBoy[]>([]);
  const [filteredDelivery, setFilteredDelivery] = useState<DeliveryBoy[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deliveryQuery, setDeliveryQuery] = useState("");
  const [deliveryBoyId, setDeliveryBoyId] = useState<number | null>(null);

  // Load delivery agents
  useEffect(() => {
    fetch(ApiEndpoints.DELIVERY_AGENTS)
      .then((res) => res.json())
      .then(setDeliveryList)
      .catch(() => {
        // fallback mock
        setDeliveryList([
          { id: 30, name: "Anil Patra", contact: "9988776655" },
          { id: 31, name: "Ranjan Sahoo", contact: "9876543210" },
        ]);
      });
  }, []);

  // Filter suggestions
  useEffect(() => {
    const q = deliveryQuery.trim().toLowerCase();
    if (!q) {
      setFilteredDelivery([]);
      return;
    }
    setFilteredDelivery(
      deliveryList.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.contact.includes(q)
      )
    );
  }, [deliveryQuery, deliveryList]);

  const handleCarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCar((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Correct selection (id + contact)
  const handleSelectDelivery = (id: number, name: string) => {
    const selectedBoy = deliveryList.find((d) => d.id === id);
    setDeliveryBoyId(id);
    setDeliveryQuery(name);
    setCar((prev) => ({
      ...prev,
      mobile: selectedBoy?.contact || prev.mobile,
    }));
    setShowSuggestions(false);
  };

  const picklistNos = useMemo(
    () => selected.map((s) => s.picklistNo),
    [selected]
  );

  const handleSubmit = async () => {
    if (!deliveryBoyId) {
      alert("Please select a delivery boy.");
      return;
    }

    if (picklistNos.length === 0) {
      alert("No picklists selected.");
      return;
    }

    const carPayload =
      car.carNo || car.driverName || car.mobile
        ? {
            carNo: car.carNo?.trim(),
            driverName: car.driverName?.trim(),
            mobile: car.mobile?.trim(),
          }
        : undefined;

    const payload = {
      deliveryBoyId,
      picklistNos,
      ...(carPayload && { car: carPayload }),
    };

    try {
      const res = await fetch(ApiEndpoints.DELIVERY_ASIGN, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Assignment failed");

      alert("✅ Delivery assigned successfully");
      navigate("/agents");
    } catch (err) {
      console.error(err);
      alert("❌ Assignment failed");
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return selected.filter(
      (s) =>
        s.picklistNo.toLowerCase().includes(q) ||
        s.custDesc.toLowerCase().includes(q)
    );
  }, [search, selected]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold">Selected Records</h1>
      </div>

      {/* Delivery Assignment */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold">🚚 Delivery Assignment</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            name="carNo"
            value={car.carNo || ""}
            onChange={handleCarChange}
            className="border p-2 rounded"
            placeholder="Car No (optional)"
          />

          <input
            name="driverName"
            value={car.driverName || ""}
            onChange={handleCarChange}
            className="border p-2 rounded"
            placeholder="Driver Name (optional)"
          />

          <div className="relative">
            <input
              value={deliveryQuery}
              onChange={(e) => {
                setDeliveryQuery(e.target.value);
                setShowSuggestions(true);
                setDeliveryBoyId(null);
              }}
              className="border p-2 rounded w-full"
              placeholder="Select delivery boy"
              autoComplete="off"
            />

            {showSuggestions && filteredDelivery.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded w-full mt-1 shadow max-h-40 overflow-auto">
                {filteredDelivery.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => handleSelectDelivery(d.id, d.name)}
                    className="p-2 hover:bg-blue-100 cursor-pointer"
                  >
                    {d.name}
                    <span className="text-gray-500"> ({d.contact})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <input
            name="mobile"
            value={car.mobile || ""}
            onChange={handleCarChange}
            className="border p-2 rounded"
            placeholder="Mobile (optional)"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search Customer or Picklist"
            className="border p-2 rounded w-full md:w-1/2"
          />
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded ml-4"
          >
            Submit Dispatch
          </button>
        </div>

        <table className="min-w-full text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">Picklist No</th>
              <th className="p-2 border">Customer</th>
              <th className="p-2 border text-right">Net Value</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-gray-500">
                  No records found
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.picklistNo} className="hover:bg-gray-50">
                  <td className="p-2 border">{s.picklistNo}</td>
                  <td className="p-2 border">{s.custDesc}</td>
                  <td className="p-2 border text-right">
                    ₹{s.netValue.toLocaleString("en-IN")}
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

export default SelectedSales;
