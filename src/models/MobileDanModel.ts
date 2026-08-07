/** Mobile DAN-close flow — three-step wizard models. */

export interface MobileAgent {
  agentId:   string;
  agentName: string;
  danId:     number;
  danCode:   string;
  date:      string;   // dd-MM-yyyy
}

export interface ReturnRow {
  rowId:    string;    // e.g. "1_1"
  sl:       number;
  billQty:  number | null;
  billAmt:  number | null;
  retQty:   number | null;
  retAmt:   number | null;
}

export interface MobileInvoice {
  no:        number;
  storeName: string;
  invoiceNo: string;
  rows:      ReturnRow[];
}

export interface PaymentSummary {
  cash:      number;
  upi:       number;
  cheque:    number;
  neft:      number;
  netValue:  number;
  returnAmt: number;
}

export type PaymentMode = "cash" | "upi" | "cheque" | "neft";

/** A single payment mode with its optional cheque/reference detail. */
export interface PaymentEntry {
  mode:         string;
  amount:       number;
  chequeNo?:    string | null;
  bankName?:    string | null;
  referenceNo?: string | null;
}

/** Per-invoice payment breakdown shown on step 3. */
export interface InvoicePaymentDetail {
  direId:     number;
  invoiceNo:  string;
  custName:   string;
  amount:     number;    // net value
  returnAmt:  number;
  paidAmount: number;
  payments:   PaymentEntry[];
}

/** Locally-edited return values, keyed by rowId. */
export type SavedReturns = Record<string, {
  billQty: string; billAmt: string; retQty: string; retAmt: string;
}>;

export interface ApprovePayload {
  agentId:     string;
  payments?:   Record<PaymentMode, number>;
  returns?:    Record<string, Record<string, number>>;
  approvedBy?: string;
  remarks?:    string;
}

/** One recorded sign-off in the DAN approval trail. */
export interface ApprovalEvent {
  id:             number;
  danId:          number;
  stage:          "STOREKEEPER" | "ACCOUNTS";
  action:         "APPROVED" | "REJECTED";
  approvedBy:     string | null;
  approvedByRole: string | null;
  remarks:        string | null;
  createdAt:      string;
}

/** Approval state returned by both stage endpoints. */
export interface ApprovalStatus {
  danId:               number;
  danStatus:           string;
  storekeeperApproved: boolean;
  storekeeperBy:       string | null;
  storekeeperAt:       string | null;
  accountsApproved:    boolean;
  accountsBy:          string | null;
  accountsAt:          string | null;
  fullyApproved:       boolean;
  pendingStage:        "STOREKEEPER" | "ACCOUNTS" | null;
  trail:               ApprovalEvent[];
}
