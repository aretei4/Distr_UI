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
  get SALES()                { return `${getApiBaseUrl()}/sales?Picklist_No=E587P22657`; },
  get SALES_DELETE()         { return `${getApiBaseUrl()}/sales/delete`; },
  get DELIVERY_AGENTS()      { return `${getApiBaseUrl()}/delivery/allAgents`; },
  get CUSTOMER_LIST()        { return `${getApiBaseUrl()}/excel/customerList`; },
  get DELIVERY_ASIGN()       { return `${getApiBaseUrl()}/delivery/assign`; },
  get SMART_ROUTE_ASSIGN()   { return `${getApiBaseUrl()}/delivery/smart-assign`; },
  get DELIVERY_STATUS_LIST() { return `${getApiBaseUrl()}/delivery/statusList`; },
  get DELETE_DELIVERY()      { return `${getApiBaseUrl()}/delivery/delete`; },
  get DELIVERY_ASIGN_LIST()  { return `${getApiBaseUrl()}/delivery/deliveryList?deliveri_id=`; },
  get UPLOAD()               { return `${getApiBaseUrl()}/excel/upload`; },
  get ALL_TEMPLATE()         { return `${getApiBaseUrl()}/template/names`; },
  get SAVE_TEMPLATE()        { return `${getApiBaseUrl()}/template/save`; },
  get SALES_COMPANIES()      { return `${getApiBaseUrl()}/template/sales-companies`; },
  get TEMPLATE_COMPANIES()   { return `${getApiBaseUrl()}/template/companies`; },
  TEMPLATES_BY_COMPANY: (company: string) => `${getApiBaseUrl()}/template/by-company/${encodeURIComponent(company)}`,
  get DELIVERY_DASHBOARD()   { return `${getApiBaseUrl()}/dashboard/delivery-summary`; },
  get DELIVERY_STATUS()      { return `${getApiBaseUrl()}/dashboard/delivery-summary`; },
  get DAY_END_SUMMARY()      { return `${getApiBaseUrl()}/dayend/dayEndSummery`; },
  get DAY_END_APPROVE()      { return `${getApiBaseUrl()}/dayend/approve`; },
  get DAY_END_REJECT()       { return `${getApiBaseUrl()}/dayend/reject`; },
  get DELIVERY_MAP()         { return `${getApiBaseUrl()}/delivery/map`; },
  get WAREHOUSES()           { return `${getApiBaseUrl()}/warehouse`; },
  SMART_ROUTE_POINTS:  (from: string, to: string) => `${getApiBaseUrl()}/delivery/map?fromDate=${from}&toDate=${to}`,
  PICKLISTS_BY_AGENT:  (id: string | number) => `${getApiBaseUrl()}/dayend/picklists/${id}`,
  UPDATE_PICKLIST:     (picklistNo: string)   => `${getApiBaseUrl()}/dayend/picklist/${encodeURIComponent(picklistNo)}`,
  DELETE_PICKLIST:     (picklistNo: string)   => `${getApiBaseUrl()}/dayend/picklist/${encodeURIComponent(picklistNo)}`,
  get ONLINE_AGENTS()        { return `${getApiBaseUrl()}/dayend/online-agents`; },
  get FEATURE_FLAGS()        { return `${getApiBaseUrl()}/config/features`; },
  FEATURE_TOGGLE:      (key: string) => `${getApiBaseUrl()}/config/features/${encodeURIComponent(key)}/toggle`,
  get FEATURE_SAVE_ALL()     { return `${getApiBaseUrl()}/config/features/save-all`; },
  // Company search always uses the default URL (called before a company is selected)
  COMPANY_SEARCH:      (q: string) => `${DEFAULT_API_BASE_URL}/company/search?q=${encodeURIComponent(q)}`,
};
