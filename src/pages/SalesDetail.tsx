import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiEndpoints } from "../constants/config";

interface SalesEntry {
  picklistNo: string;
  custDesc: string;
  salesRepName: string;
  netValue: number;
}

interface CarDetails {
  carNo: string;
  driverName: string;
  mobile: string;
}

interface DeliveryBoy {
  id: number;
  name: string;
  phone: string;
}

const SelectedSales: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const selected: SalesEntry[] = location.state?.selectedSales || [];

  const [search, setSearch] = useState("");
  const [car, setCar] = useState<CarDetails>({
    carNo: "",
    driverName: "",
    mobile: "",
  });
  const [deliveryList, setDeliveryList] = useState<DeliveryBoy[]>([]);
  const [filteredDelivery, setFilteredDelivery] = useState<DeliveryBoy[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [deliveryQuery, setDeliveryQuery] = useState(""); // text user types
  const [deliveryBoyId, setDeliveryBoyId] = useState<number | null>(null);

  // load delivery boys (API fallback to mock)
  useEffect(() => {
    fetch(ApiEndpoints.AGENTS)
      .then((res) => {
        if (!res.ok) throw new Error("Network response not ok");
        return res.json();
      })
      .then((data) => setDeliveryList(data))
      .catch(() => {
        setDeliveryList([
          { id: 1, name: "SANTOSH MUDULI", phone: "9876543210" },
          { id: 2, name: "RAJESH KUMAR", phone: "9876500000" },
          { id: 3, name: "PRASANT ROUT", phone: "9811111111" },
          { id: 4, name: "RANJAN SAHOO", phone: "9822222222" },
        ]);
      });
  }, []);

  // filter delivery suggestions as user types
  useEffect(() => {
    const q = deliveryQuery.trim().toLowerCase();
    if (q.length === 0) {
      setFilteredDelivery([]);
      return;
    }
    setFilteredDelivery(
      deliveryList.filter((d) => d.name.toLowerCase().includes(q))
    );
  }, [deliveryQuery, deliveryList]);

  const handleCarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCar((prev) => ({ ...prev, [name]: value }));
  };

  // when a suggestion is clicked, set both id and display text
  const handleSelectDelivery = (id: number, name: string) => {
    setDeliveryBoyId(id);
    setDeliveryQuery(name);
    setShowSuggestions(false);
  };

  // prepare picklist array
  const picklistNos = useMemo(() => selected.map((s) => s.picklistNo), [selected]);

  // submit payload: deliveryBoyId + picklistNos + car details
  const handleSubmit = async () => {
    if (!deliveryBoyId) {
      alert("Please select a delivery boy from suggestions.");
      return;
    }
    if (picklistNos.length === 0) {
      alert("No picklists selected.");
      return;
    }
    if (!car.carNo.trim() || !car.driverName.trim() || !car.mobile.trim()) {
      alert("Please fill car number, driver name and mobile.");
      return;
    }

    const payload = {
      deliveryBoyId,
      picklistNos,
      car: {
        carNo: car.carNo.trim(),
        driverName: car.driverName.trim(),
        mobile: car.mobile.trim(),
      },
    };
console.log(JSON.stringify(payload));
    try {
      const res = await fetch(`${ApiEndpoints.SALES}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "Server returned error");
      }

      alert("✅ Delivery assignment successful.");
      navigate("/agents"); // or wherever appropriate
    } catch (err) {
      console.error("Assign error:", err);
      alert("❌ Failed to assign delivery. See console for details.");
    }
  };

  // client-side search on selected records
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return selected.filter(
      (item) =>
        item.custDesc.toLowerCase().includes(q) ||
        item.picklistNo.toLowerCase().includes(q) ||
        item.salesRepName.toLowerCase().includes(q)
    );
  }, [search, selected]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-semibold text-gray-800">Selected Records</h1>
      </div>

      {/* Car + Delivery Details */}
      <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">🚚 Delivery Assignment</h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Car No</label>
            <input
              name="carNo"
              value={car.carNo}
              onChange={handleCarChange}
              className="border p-2 w-full rounded"
              placeholder="e.g. OD02AB1234"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Driver Name</label>
            <input
              name="driverName"
              value={car.driverName}
              onChange={handleCarChange}
              className="border p-2 w-full rounded"
              placeholder="Driver name"
            />
          </div>

          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">Delivery Boy</label>
            <input
              type="text"
              name="deliveryBoy"
              value={deliveryQuery}
              onChange={(e) => {
                setDeliveryQuery(e.target.value);
                setShowSuggestions(true);
                setDeliveryBoyId(null); // clear id until user picks suggestion
              }}
              className="border p-2 w-full rounded"
              placeholder="Type and select delivery boy"
              autoComplete="off"
            />

            {showSuggestions && filteredDelivery.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded-md w-full mt-1 shadow-lg max-h-44 overflow-y-auto">
                {filteredDelivery.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => handleSelectDelivery(d.id, d.name)}
                    className="p-2 hover:bg-blue-100 cursor-pointer"
                  >
                    {d.name} <span className="text-gray-500">({d.phone})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile</label>
            <input
              name="mobile"
              value={car.mobile}
              onChange={handleCarChange}
              className="border p-2 w-full rounded"
              placeholder="Driver / delivery mobile (optional)"
            />
          </div>
        </div>
      </div>

      {/* Search + table */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search Customer, Picklist, or Sales Rep"
            className="border p-2 rounded-md w-full md:w-1/2"
          />
          <button
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-4 py-2 rounded ml-4"
          >
            Submit Dispatch
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border border-gray-200">
            <thead className="bg-gray-100 text-gray-700 uppercase">
              <tr>
                <th className="p-2 border">Picklist No</th>
                <th className="p-2 border">Customer</th>
                <th className="p-2 border">Sales Rep</th>
                <th className="p-2 border text-right">Net Value</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-gray-500">No records found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.picklistNo} className="border-t hover:bg-gray-50 transition">
                    <td className="p-2 border">{item.picklistNo}</td>
                    <td className="p-2 border">{item.custDesc}</td>
                    <td className="p-2 border">{item.salesRepName}</td>
                    <td className="p-2 border text-right">₹{item.netValue.toLocaleString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SelectedSales;
