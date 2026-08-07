import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

export interface DeliverySummary {
  totalDeliveries:  number;
  delivered:        number;
  pending:          number;
  cancelled:        number;
  todayTotal:       number;
  todayDelivered:   number;
  todayPending:     number;
  todayCancelled:   number;
  // amounts
  todayNetValue:    number;
  totalNetValue:    number;
  todayCollected:   number;
  totalCollected:   number;
  // assigned (status 9)
  assigned:         number;
  assignedValue:    number;
  // rejected (status 8)
  rejected:         number;
  rejectedValue:    number;
}

export interface OverallSummary {
  closed:          number;
  closedValue:     number;
  closedCollected: number;
}

export interface CreditStore { name: string; amount: number; }

export interface OverallReport {
  totalOrders:       number;
  totalNetValue:     number;
  totalCollected:    number;
  outstandingCredit: number;
  pendingStores:     number;
  cashAmount:        number;
  upiAmount:         number;
  chequeAmount:      number;
  neftAmount:        number;
  creditAmount:      number;
  topCreditStores:   CreditStore[];
}

export interface DeliveryDetails {
  id: number;
  customerName: string;
  address: string;
  status: string;
}

export interface DeliveryBoy {
  id: number;
  name: string;
  phone: string;
}

export async function getDeliverySummary(boyId: number | null): Promise<DeliverySummary> {
  let url = ApiEndpoints.DELIVERY_DASHBOARD;
  if (boyId !== null) url += `?boyId=${boyId}`;
  return api.get<DeliverySummary>(url);
}

export async function getOverallSummary(boyId: number | null): Promise<OverallSummary> {
  let url = ApiEndpoints.OVERALL_SUMMARY;
  if (boyId !== null) url += `?boyId=${boyId}`;
  return api.get<OverallSummary>(url);
}

export async function getOverallReport(month: number, year: number): Promise<OverallReport> {
  return api.get<OverallReport>(`${ApiEndpoints.OVERALL_REPORT}?month=${month}&year=${year}`);
}

export const fetchDeliveryAgents = async (): Promise<DeliveryBoy[]> => {
  return api.get<DeliveryBoy[]>(ApiEndpoints.DELIVERY_AGENTS);
};

export async function getDeliveryDetails(status: string): Promise<DeliveryDetails[]> {
  return api.get<DeliveryDetails[]>(ApiEndpoints.DELIVERY_STATUS);
}
