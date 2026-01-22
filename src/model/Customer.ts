export interface Customer {
  custNo: string;
  custDesc: string;
  custMobile: string | null;
  address: string | null;
  pin: string | null;
  lat: number;
  lon: number;
}