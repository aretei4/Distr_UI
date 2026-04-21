// src/constants/config.ts

// Read from environment (.env files)
//const API_BASE_URL: string ="https://device4autism.in/api";
const API_BASE_URL: string ="http://localhost:8080/api";

// ✅ Global App Config Constants
export const AppConfig = {
  APP_NAME: "Distributor Delivery System",
  API_BASE_URL,
  VERSION: "1.0.0",
  DATE_FORMAT: "DD/MM/YYYY",
  COMPANY_NAME: "Devine Distributors Pvt. Ltd.",
};

// ✅ Common REST API Endpoints
export const ApiEndpoints = {
  SALES: `${API_BASE_URL}/sales?Picklist_No=E587P22657`,
  SALES_DELETE:	`${API_BASE_URL}/sales/delete`,
  DELIVERY_AGENTS: `${API_BASE_URL}/delivery/allAgents`,
  CUSTOMER_LIST: `${API_BASE_URL}/excel/customerList`,  
   DELIVERY_ASIGN: `${API_BASE_URL}/delivery/assign`,
   DELIVERY_STATUS_LIST: `${API_BASE_URL}/delivery/statusList`,
   DELETE_DELIVERY: `${API_BASE_URL}/delivery/delete`,
   DELIVERY_ASIGN_LIST: `${API_BASE_URL}/delivery/deliveryList?deliveri_id=`,
   UPLOAD: `${API_BASE_URL}/excel/upload`,
   ALL_TEMPLATE: `${API_BASE_URL}/template/names`,
   SAVE_TEMPLATE: `${API_BASE_URL}/template/save`,
   DELIVERY_DASHBOARD: `${API_BASE_URL}/dashboard/delivery-summary`,
   DELIVERY_STATUS: `${API_BASE_URL}/dashboard/delivery-summary`,
   DAY_END_SUMMARY: `${API_BASE_URL}/dayend/dayEndSummery`,
   DAY_END_APPROVE: `${API_BASE_URL}/dayend/approve`,
   DAY_END_REJECT: `${API_BASE_URL}/dayend/reject`,
	
};
