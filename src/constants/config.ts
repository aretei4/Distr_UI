// src/constants/config.ts
// VITE_API_BASE_URL is injected at build time:
//   dev:    http://localhost:8080/api   (vite dev server proxies)
//   docker: /api                        (nginx proxies to backend container)
//   prod:   https://device4autism.in/api

const DEFAULT_API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) ?? "https://device4autism.in/api";

const STORAGE_KEY = "d4a_company_url";

/**
 * Returns the active API base URL.
 * After a company is selected on the login screen its baseUrl is stored in
 * localStorage and takes precedence over the build-time env variable.
 */
export function getApiBaseUrl(): string {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_API_BASE_URL;
}

/** Called when a company is selected; persists its baseUrl for the session. */
export function setCompanyBaseUrl(url: string | null): void {
  if (url) localStorage.setItem(STORAGE_KEY, url.replace(/\/$/, ""));
  else     localStorage.removeItem(STORAGE_KEY);
}

/* ── Company info (name + code) ─────────────────────────────────────────── */
const COMPANY_INFO_KEY = "d4a_company_info";

export interface CompanyInfo { id: number; name: string; code: string; }

export function setCompanyInfo(info: CompanyInfo | null): void {
  if (info) localStorage.setItem(COMPANY_INFO_KEY, JSON.stringify(info));
  else      localStorage.removeItem(COMPANY_INFO_KEY);
}

export function getCompanyInfo(): CompanyInfo | null {
  try { return JSON.parse(localStorage.getItem(COMPANY_INFO_KEY) ?? "null"); }
  catch { return null; }
}

export const AppConfig = {
  APP_NAME:     "Direco — Distributor to Retail Connect",
  VERSION:      "1.0.0",
  DATE_FORMAT:  "DD/MM/YYYY",
  COMPANY_NAME: "Devine Distributors Pvt. Ltd.",
};

export const AuthEndpoints = {
  get LOGIN()      { return `${getApiBaseUrl()}/auth/login`; },
  get USERS()      { return `${getApiBaseUrl()}/users`; },
  USER_BY_ID: (id: number) => `${getApiBaseUrl()}/users/${id}`,
};

// ApiEndpoints uses object getters so the URL is resolved on every access,
// picking up any company baseUrl change made at login time.
export const ApiEndpoints = {
  get SALES()                { return `${getApiBaseUrl()}/sales`; },
  get SALES_DELETE()         { return `${getApiBaseUrl()}/sales/delete`; },
  get SALES_DELETE_BY_DIRE() { return `${getApiBaseUrl()}/sales/delete-by-dire`; },
  get DELIVERY_AGENTS()      { return `${getApiBaseUrl()}/delivery/allAgents`; },
  get CUSTOMER_LIST()        { return `${getApiBaseUrl()}/excel/customerList`; },
  get DELIVERY_ASIGN()       { return `${getApiBaseUrl()}/delivery/assign`; },
  get PENDING_DAN_CHECK()    { return `${getApiBaseUrl()}/delivery/pending-dan-check`; },
  get SMART_ROUTE_ASSIGN()   { return `${getApiBaseUrl()}/delivery/smart-assign`; },
  get DELIVERY_STATUS_LIST() { return `${getApiBaseUrl()}/delivery/statusList`; },
  get INVOICE_REPORT()       { return `${getApiBaseUrl()}/delivery/invoiceReport`; },
  get DELETE_DELIVERY()                      { return `${getApiBaseUrl()}/delivery/delete`; },
  DELETE_DELIVERY_BY_DIRE: (direId: number) => `${getApiBaseUrl()}/delivery/delete/dire/${direId}`,
  get DELIVERY_ASIGN_LIST()  { return `${getApiBaseUrl()}/delivery/deliveryList?deliveri_id=`; },
  get UPLOAD()               { return `${getApiBaseUrl()}/excel/upload`; },
  get ALL_TEMPLATE()         { return `${getApiBaseUrl()}/template/names`; },
  get SAVE_TEMPLATE()        { return `${getApiBaseUrl()}/template/save`; },
  get SALES_COMPANIES()      { return `${getApiBaseUrl()}/template/sales-companies`; },
  get TEMPLATE_COMPANIES()   { return `${getApiBaseUrl()}/template/companies`; },
  TEMPLATES_BY_COMPANY: (company: string) => `${getApiBaseUrl()}/template/by-company/${encodeURIComponent(company)}`,
  get DELIVERY_DASHBOARD()   { return `${getApiBaseUrl()}/dashboard/delivery-summary`; },
  get OVERALL_SUMMARY()      { return `${getApiBaseUrl()}/dashboard/overall-summary`; },
  get OVERALL_REPORT()       { return `${getApiBaseUrl()}/dashboard/overall-report`; },
  get DELIVERY_STATUS()      { return `${getApiBaseUrl()}/dashboard/delivery-summary`; },
  get DAY_END_SUMMARY()      { return `${getApiBaseUrl()}/dayend/dayEndSummery`; },
  get DAY_END_APPROVE()      { return `${getApiBaseUrl()}/dayend/approve`; },
  get DAY_END_REJECT()       { return `${getApiBaseUrl()}/dayend/reject`; },
  get DELIVERY_MAP()         { return `${getApiBaseUrl()}/delivery/map`; },
  get DELIVERY_VIOLATIONS()  { return `${getApiBaseUrl()}/delivery/violations`; },
  get VIOLATION_ROWS()       { return `${getApiBaseUrl()}/violation/rows`; },
  get ASSIGNMENTS()          { return `${getApiBaseUrl()}/delivery/assignments`; },
  CUSTOMER_LOCATION: (custNo: string) => `${getApiBaseUrl()}/customer/${encodeURIComponent(custNo)}/location`,
  get WAREHOUSES()           { return `${getApiBaseUrl()}/warehouse`; },
  PICKLISTS_BY_AGENT:  (id: string | number) => `${getApiBaseUrl()}/dayend/picklists/${id}`,
  UPDATE_PICKLIST:     (direId: number) => `${getApiBaseUrl()}/dayend/picklist/dire/${direId}`,
  DELETE_PICKLIST:     (direId: number) => `${getApiBaseUrl()}/dayend/picklist/dire/${direId}`,
  get ONLINE_AGENTS()        { return `${getApiBaseUrl()}/dayend/online-agents`; },
  get FEATURE_FLAGS()        { return `${getApiBaseUrl()}/config/features`; },
  FEATURE_TOGGLE:      (key: string) => `${getApiBaseUrl()}/config/features/${encodeURIComponent(key)}/toggle`,
  get FEATURE_SAVE_ALL()     { return `${getApiBaseUrl()}/config/features/save-all`; },
  // Company search always uses the default URL (called before a company is selected)
  COMPANY_SEARCH:      (q: string) => `${DEFAULT_API_BASE_URL}/company/search?q=${encodeURIComponent(q)}`,

  // Mobile DAN close (3-step wizard)
  get MOBILE_DAN_OPEN_LIST()        { return `${getApiBaseUrl()}/mobile/dan/open-list`; },
  MOBILE_DAN_INVOICES: (danId: number) => `${getApiBaseUrl()}/mobile/dan/${danId}/invoices`,
  MOBILE_DAN_PAYMENT_SUMMARY: (danId: number) => `${getApiBaseUrl()}/mobile/dan/${danId}/payment-summary`,
  MOBILE_DAN_PAYMENT_DETAIL:  (danId: number) => `${getApiBaseUrl()}/mobile/dan/${danId}/payment-detail`,
  MOBILE_DAN_STOREKEEPER_APPROVE: (danId: number) => `${getApiBaseUrl()}/mobile/dan/${danId}/storekeeper-approve`,
  MOBILE_DAN_ACCOUNTS_APPROVE:    (danId: number) => `${getApiBaseUrl()}/mobile/dan/${danId}/accounts-approve`,

  // DAN Close
  get DAN_LIST()                    { return `${getApiBaseUrl()}/dan/list`; },
  get DAN_REPORT()                  { return `${getApiBaseUrl()}/dan/report`; },
  DAN_REPORT_DETAIL: (danId: number) => `${getApiBaseUrl()}/dan/report/${danId}`,
  DAN_RETURNS:      (direId: number) => `${getApiBaseUrl()}/dan/returns/dire/${direId}`,
  DAN_PAYMENT:      (id: number, direId: number) => `${getApiBaseUrl()}/dan/${id}/payment/dire/${direId}`,
  DAN_SUBMIT:       (id: number)    => `${getApiBaseUrl()}/dan/${id}/submit`,
  DAN_APPROVAL:     (id: number)    => `${getApiBaseUrl()}/dan/${id}/approval`,

  // Public landing-page enquiry form
  get LEADS()        { return `${getApiBaseUrl()}/leads`; },
  get LEADS_RECENT() { return `${getApiBaseUrl()}/leads/recent`; },
};
