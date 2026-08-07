import { Customer } from "../models/Customer";
import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

export const CustomerService = {
  async getCustomerList(): Promise<Customer[]> {
    return api.get<Customer[]>(ApiEndpoints.CUSTOMER_LIST);
  },

  async updateLocation(
    custNo: string,
    lat: number,
    lon: number
  ): Promise<{ success: boolean; message: string }> {
    return api.patch(ApiEndpoints.CUSTOMER_LOCATION(custNo), { lat, lon });
  },
};
