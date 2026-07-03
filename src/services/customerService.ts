import { Customer } from "../models/Customer";
import { ApiEndpoints } from "../constants/config";
import { authHeaders } from "./authService";

export const CustomerService = {
  async getCustomerList(): Promise<Customer[]> {
    const response = await fetch(ApiEndpoints.CUSTOMER_LIST, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch customer list");
    return response.json();
  },

  async updateLocation(
    custNo: string,
    lat: number,
    lon: number
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(ApiEndpoints.CUSTOMER_LOCATION(custNo), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ lat, lon }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? `HTTP ${res.status}`);
    return data;
  },
};
