import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DataTable, TR, TD, SearchInput, PageHeader } from "../components/ui";
import { api } from "../services/apiClient";

interface SalesEntry {
  picklistNo: string; salesOrderNo: string; customerNo: string;
  custDesc: string; salesRepName: string; routeName: string;
  billingDate: number; warehouse: string; netValue: number;
}

const Home: React.FC = () => {
  const [sales, setSales]     = useState<SalesEntry[]>([]);
  const [filtered, setFiltered] = useState<SalesEntry[]>([]);
  const [search, setSearch]   = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    api.get<SalesEntry[]>("https://device4autism.in/api/sales?Picklist_No=E587P22657")
      .then(data => { setSales(data); setFiltered(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(sales.filter(s =>
      s.custDesc.toLowerCase().includes(q) ||
      s.salesRepName.toLowerCase().includes(q) ||
      s.routeName.toLowerCase().includes(q) ||
      s.picklistNo.toLowerCase().includes(q)
    ));
  }, [search, sales]);

  return (
    <div className="animate-fade-up">
      <PageHeader title="Sales Entry" subtitle={`${filtered.length} records`}
        action={<SearchInput value={search} onChange={setSearch} placeholder="Search…" />}
      />
      <DataTable headers={["Picklist No", "Sales Order", "Customer", "Sales Rep", "Route", "Billing Date", "Warehouse", "Net Value"]}
        empty={filtered.length === 0}>
        {filtered.map(item => (
          <TR key={item.picklistNo} onClick={() => navigate(`/sales/${item.picklistNo}`)}>
            <TD>{item.picklistNo}</TD>
            <TD>{item.salesOrderNo}</TD>
            <TD style={{ fontWeight: 500 }}>{item.custDesc}</TD>
            <TD>{item.salesRepName}</TD>
            <TD>{item.routeName}</TD>
            <TD>{new Date(item.billingDate).toLocaleDateString("en-IN")}</TD>
            <TD>{item.warehouse}</TD>
            <TD style={{ textAlign: "right", fontWeight: 700 }}>₹{item.netValue.toLocaleString("en-IN")}</TD>
          </TR>
        ))}
      </DataTable>
    </div>
  );
};

export default Home;
