import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

/** Sales picklist rows (unassigned stage_sales_entery records). */
export const fetchSales = async (): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.SALES);
};

/** Delete sales rows by dire_id list. */
export const deleteSalesByDire = async (direIds: number[]): Promise<void> => {
  await api.post(ApiEndpoints.SALES_DELETE_BY_DIRE, direIds);
};

/** Assign selected deliveries to an agent (status 9 ASSIGNED). */
export const assignDelivery = async (payload: unknown): Promise<string> => {
  return api.post<string>(ApiEndpoints.DELIVERY_ASIGN, payload);
};

/** True when any DAN is still open (blocks new assignment). */
export const pendingDanCheck = async (): Promise<any> => {
  return api.get<any>(ApiEndpoints.PENDING_DAN_CHECK);
};

/** Deliveries assigned to one agent (agents/:id page). */
export const fetchAgentDeliveries = async (agentId: string | number): Promise<any[]> => {
  return api.get<any[]>(`${ApiEndpoints.DELIVERY_ASIGN_LIST}${agentId}`);
};

/** All assignments, optionally filtered by status code. */
export const fetchAssignments = async (status?: string): Promise<any[]> => {
  const qs = status && status !== "all" ? `?status=${status}` : "";
  return api.get<any[]>(`${ApiEndpoints.ASSIGNMENTS}${qs}`);
};

/** Delete a delivery assignment by dire_id. */
export const deleteDeliveryByDire = async (direId: number): Promise<void> => {
  await api.del(ApiEndpoints.DELETE_DELIVERY_BY_DIRE(direId));
};

/** Delete a delivery assignment by picklist number (legacy rows without dire_id). */
export const deleteDeliveryByPicklist = async (picklistNo: string): Promise<void> => {
  await api.del(`${ApiEndpoints.DELETE_DELIVERY}/${picklistNo}`);
};
