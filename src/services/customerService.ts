import { Customer } from "../models/Customer";
import { ApiEndpoints } from "../constants/config";

export const CustomerService = {
  async getCustomerList(): Promise<Customer[]> {
    const response = await fetch(ApiEndpoints.CUSTOMER_LIST, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("Failed to fetch customer list");
    return response.json();
  },
};
