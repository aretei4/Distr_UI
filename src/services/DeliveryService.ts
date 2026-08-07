import { Delivery } from "../models/DeliveryModel";
import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

export const fetchDeliveryData = async (
  apiFrom: string,
  apiTo: string
): Promise<Delivery[]> => {
  return api.get<Delivery[]>(`${ApiEndpoints.DELIVERY_STATUS_LIST}?fromDate=${apiFrom}&toDate=${apiTo}`);
};

export const fetchInvoiceReport = async (
  apiFrom: string,
  apiTo: string,
  paymentMode?: string
): Promise<Delivery[]> => {
  let url = `${ApiEndpoints.INVOICE_REPORT}?fromDate=${apiFrom}&toDate=${apiTo}`;
  if (paymentMode && paymentMode !== "ALL") url += `&paymentMode=${paymentMode}`;
  return api.get<Delivery[]>(url);
};

export const fetchDeliveryAgents = async () => {
  return api.get<any[]>(ApiEndpoints.DELIVERY_AGENTS);
};

/** Deviation tracker rows (violation page). */
export const fetchViolationRows = async (fromDate: string, toDate: string): Promise<any[]> => {
  return api.get<any[]>(`${ApiEndpoints.VIOLATION_ROWS}?fromDate=${fromDate}&toDate=${toDate}`);
};
