import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";

/** Today's active DANs (DAN Close page step 1). */
export const fetchDanList = async (): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.DAN_LIST);
};

/** Return items previously saved for a dire_id. */
export const fetchReturnsByDire = async (direId: number): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.DAN_RETURNS(direId));
};

/** Save return rows for a dire_id. */
export const saveReturnsByDire = async (direId: number, items: unknown[]): Promise<any> => {
  return api.post<any>(ApiEndpoints.DAN_RETURNS(direId), items);
};

/** Picklists with payment detail for a day-end record. */
export const fetchPicklistsByDayend = async (dayendId: number): Promise<any[]> => {
  return api.get<any[]>(ApiEndpoints.PICKLISTS_BY_AGENT(dayendId));
};

/** Save payment for one picklist inside a DAN. */
export const saveDanPayment = async (danId: number, direId: number, payload: unknown): Promise<any> => {
  return api.post<any>(ApiEndpoints.DAN_PAYMENT(danId, direId), payload);
};

/** Submit (close) a DAN. */
export const submitDan = async (danId: number): Promise<any> => {
  return api.post<any>(ApiEndpoints.DAN_SUBMIT(danId));
};

/** Update payment amount/mode/status for a single dire_id (Day-End screen). */
export const updatePicklist = async (direId: number, payload: unknown): Promise<void> => {
  await api.put(ApiEndpoints.UPDATE_PICKLIST(direId), payload);
};

/** Remove a delivery assignment by dire_id (Day-End screen). */
export const deletePicklist = async (direId: number): Promise<void> => {
  await api.del(ApiEndpoints.DELETE_PICKLIST(direId));
};

/** DAN Close Report rows. */
export const fetchDanReport = async (params: { fromDate?: string; toDate?: string; agentId?: string }): Promise<any[]> => {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set("fromDate", params.fromDate);
  if (params.toDate)   qs.set("toDate",   params.toDate);
  if (params.agentId)  qs.set("agentId",  params.agentId);
  const q = qs.toString();
  return api.get<any[]>(`${ApiEndpoints.DAN_REPORT}${q ? `?${q}` : ""}`);
};

/** Storekeeper / accounts approval state for a DAN, from dan_approval_log. */
export interface DanApprovalStatus {
  danId:               number;
  danStatus:           string;
  storekeeperApproved: boolean;
  storekeeperBy:       string | null;
  storekeeperAt:       string | null;
  accountsApproved:    boolean;
  accountsBy:          string | null;
  accountsAt:          string | null;
  fullyApproved:       boolean;
  pendingStage:        string | null;
  trail: Array<{
    stage: string; action: string; actionBy?: string | null;
    actionByRole?: string | null; remarks?: string | null; createdAt?: string | null;
  }>;
}

export const fetchDanApproval = async (danId: number): Promise<DanApprovalStatus> => {
  return api.get<DanApprovalStatus>(ApiEndpoints.DAN_APPROVAL(danId));
};

/** DAN Close Report detail (invoice + payment breakdown). */
export const fetchDanReportDetail = async (danId: number): Promise<any> => {
  return api.get<any>(ApiEndpoints.DAN_REPORT_DETAIL(danId));
};
