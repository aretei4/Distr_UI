import React, { useEffect, useMemo, useState } from "react";
import { Customer } from "../models/Customer";
import { CustomerService } from "../services/customerService";

const PAGE_SIZE = 20;

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    CustomerService.getCustomerList()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, []);

  const totalPages = Math.ceil(customers.length / PAGE_SIZE);

  const pagedCustomers = useMemo(() => {
    const start = page * PAGE_SIZE;
    return customers.slice(start, start + PAGE_SIZE);
  }, [customers, page]);

  const openDirection = (lat: number, lon: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lon}`, "_blank");
  };

  if (loading) return <p>Loading customers...</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Customer List</h2>

      <table width="100%" border={1} cellPadding={6}>
        <thead>
          <tr>
            <th>Customer No</th>
            <th>Customer Name</th>
            <th>Mobile</th>
            <th>Direction</th>
          </tr>
        </thead>
        <tbody>
          {pagedCustomers.map((c, index) => (
            <tr key={index}>
              <td>{c.custNo}</td>
              <td>{c.custDesc}</td>
              <td>{c.custMobile ?? "N/A"}</td>
              <td>
                <button onClick={() => openDirection(c.lat, c.lon)}>
                  📍 Map
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div style={{ marginTop: "12px" }}>
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>
          ⬅ Prev
        </button>

        <span style={{ margin: "0 10px" }}>
          Page {page + 1} of {totalPages}
        </span>

        <button
          disabled={page + 1 >= totalPages}
          onClick={() => setPage(page + 1)}
        >
          Next ➡
        </button>
      </div>
    </div>
  );
};

export default CustomerList;
