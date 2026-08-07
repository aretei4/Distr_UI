import { ApiEndpoints } from "../constants/config";
import { api } from "./apiClient";
import {
  MobileAgent, MobileInvoice, PaymentSummary, ApprovePayload, ApprovalStatus,
  InvoicePaymentDetail,
} from "../models/MobileDanModel";

/** Step 1 — agents with an open DAN. */
export const fetchOpenDans = async (): Promise<MobileAgent[]> => {
  return api.get<MobileAgent[]>(ApiEndpoints.MOBILE_DAN_OPEN_LIST);
};

/** Step 2 — store cards with pre-loaded return rows. */
export const fetchDanInvoices = async (danId: number): Promise<MobileInvoice[]> => {
  return api.get<MobileInvoice[]>(ApiEndpoints.MOBILE_DAN_INVOICES(danId));
};

/** Step 3 — pre-filled payment amounts and static totals. */
export const fetchPaymentSummary = async (danId: number): Promise<PaymentSummary> => {
  return api.get<PaymentSummary>(ApiEndpoints.MOBILE_DAN_PAYMENT_SUMMARY(danId));
};

/** Step 3 — per-invoice payment breakdown (invoice, customer, mode details). */
export const fetchPaymentDetail = async (danId: number): Promise<InvoicePaymentDetail[]> => {
  return api.get<InvoicePaymentDetail[]>(ApiEndpoints.MOBILE_DAN_PAYMENT_DETAIL(danId));
};

/** Step 2 — save settled returns and record the storekeeper sign-off. */
export const storekeeperApprove = async (
  danId: number, payload: ApprovePayload
): Promise<ApprovalStatus> => {
  return api.post<ApprovalStatus>(ApiEndpoints.MOBILE_DAN_STOREKEEPER_APPROVE(danId), payload);
};

/** Step 3 — save payments, close the DAN and record the accounts sign-off. */
export const accountsApprove = async (
  danId: number, payload: ApprovePayload
): Promise<ApprovalStatus> => {
  return api.post<ApprovalStatus>(ApiEndpoints.MOBILE_DAN_ACCOUNTS_APPROVE(danId), payload);
};
