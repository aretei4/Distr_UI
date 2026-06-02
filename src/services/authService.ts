import { getApiBaseUrl, setCompanyBaseUrl, setCompanyInfo } from "../constants/config";

const AUTH_KEY = "d4a_auth";

export interface AuthUser {
  token: string;
  userId: number;
  username: string;
  fullName: string | null;
  role: "ADMIN" | "MANAGER" | "STAFF";
}

export const authService = {
  async login(username: string, password: string, companyCode?: string): Promise<AuthUser> {
    const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, ...(companyCode ? { companyCode } : {}) }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.detail ?? "Invalid username or password");
    }

    const data = await res.json();
    const user: AuthUser = {
      token:    data.token,
      userId:   data.userId,
      username: data.username,
      fullName: data.fullName ?? null,
      role:     data.role as AuthUser["role"],
    };
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem(AUTH_KEY);
    setCompanyBaseUrl(null);
    setCompanyInfo(null);
  },

  getUser(): AuthUser | null {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; }
    catch { return null; }
  },

  getToken(): string | null {
    return this.getUser()?.token ?? null;
  },

  isLoggedIn(): boolean {
    return this.getUser() !== null;
  },

  hasRole(...roles: AuthUser["role"][]): boolean {
    const user = this.getUser();
    return user !== null && roles.includes(user.role);
  },
};

/** Attach Authorization header to all backend fetch calls */
export function authHeaders(): HeadersInit {
  const token = authService.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
