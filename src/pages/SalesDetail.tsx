import React, { useState, useMemo, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  deliveryBoy: string;
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
    deliveryBoy: "",
  });
  const [deliveryList, setDeliveryList] = useState<DeliveryBoy[]>([]);
  const [filteredDelivery, setFilteredDelivery] = useState<DeliveryBoy[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load delivery boy list (from API or mock data)
  useEffect(() => {
    fetch("/api/delivery-boys")
      .then((res) => res.json())
      .then((data) => setDeliveryList(data))
      .catch(() => {
        // fallback data
        setDeliveryList([
          { id: 1, name: "SANTOSH MUDULI", phone: "9876543210" },
          { id: 2, name: "RAJESH KUMAR", phone: "9876500000" },
          { id: 3, name: "PRASANT ROUT", phone: "9811111111" },
          { id: 4, name: "RANJAN SAHOO", phone: "9822222222" },
        ]);
      });
  }, []);

  // Filter delivery boys as user types
  useEffect(() => {
    const q = car.deliveryBoy.toLowerCase();
    if (q.length === 0) {
      setFilteredDelivery([]);
      return;
    }
    setFilteredDelivery(
      deliveryList.filter((d) => d.name.toLowerCase().includes(q))
    );
  }, [car.deliveryBoy, deliveryList]);

  const handleCarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCar({ ...car, [name]: value });
  };

  const handleSelectDelivery = (name: string) => {
    setCar({ ...car, deliveryBoy: name });
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    if (!car.carNo || !car.driverName || !car.mobile || !car.deliveryBoy) {
      alert("Please fill in all car and delivery details before submitting.");
      return;
    }

    const payload = {
      carDetails: car,
      selectedRecords: selected,
    };

    console.log("Submitting data:", payload);
    alert("✅ Data ready to send:\n" + JSON.stringify(payload, null, 2));

    // Example for API call:
    // fetch("http://localhost:8080/api/dispatch", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(payload),
    // });
  };

  // Search in selected records
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
        <h1 className="text-2xl font-semibold text-gray-800">
          Selected Records
        </h1>
      </div>

      {/* Car + Delivery Details Form */}
      <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">
          🚚 Car & Delivery Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Car No</label>
            <input
              type="text"
              name="carNo"
              placeholder="Enter car number"
              value={car.carNo}
              onChange={handleCarChange}
              className="border p-2 w-full rounded focus:ring focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Driver Name
            </label>
            <input
              type="text"
              name="driverName"
              placeholder="Enter driver name"
              value={car.driverName}
              onChange={handleCarChange}
              className="border p-2 w-full rounded focus:ring focus:ring-blue-200"
            />
          </div>
          <div className="relative">
            <label className="block text-sm text-gray-600 mb-1">
              Delivery Boy
            </label>
            <input
              type="text"
              name="deliveryBoy"
              placeholder="Type delivery boy name..."
              value={car.deliveryBoy}
              onChange={(e) => {
                handleCarChange(e);
                setShowSuggestions(true);
              }}
              className="border p-2 w-full rounded focus:ring focus:ring-blue-200"
            />
            {showSuggestions && filteredDelivery.length > 0 && (
              <ul className="absolute z-10 bg-white border rounded-md w-full mt-1 shadow-lg max-h-40 overflow-y-auto">
                {filteredDelivery.map((d) => (
                  <li
                    key={d.id}
                    onClick={() => handleSelectDelivery(d.name)}
                    className="p-2 hover:bg-blue-100 cursor-pointer"
                  >
                    {d.name} — <span className="text-gray-500">{d.phone}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Mobile</label>
            <input
              type="text"
              name="mobile"
              placeholder="Enter mobile number"
              value={car.mobile}
              onChange={handleCarChange}
              className="border p-2 w-full rounded focus:ring focus:ring-blue-200"
            />
          </div>
        </div>
      </div>

      {/* Search + Table */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="🔍 Search selected by Customer, Picklist, or Sales Rep"
            className="border p-2 rounded-md w-full md:w-1/2 shadow-sm focus:ring focus:ring-blue-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={handleSubmit}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow ml-4"
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
                  <td colSpan={4} className="text-center p-4 text-gray-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr
                    key={item.picklistNo}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-2 border">{item.picklistNo}</td>
                    <td className="p-2 border">{item.custDesc}</td>
                    <td className="p-2 border">{item.salesRepName}</td>
                    <td className="p-2 border text-right">
                      ₹{item.netValue.toLocaleString("en-IN")}
                    </td>
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
