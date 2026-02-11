const BASE = import.meta.env.VITE_API_URL || "";

function getToken() { return localStorage.getItem("gastos_token"); }
export function setToken(t) { t ? localStorage.setItem("gastos_token", t) : localStorage.removeItem("gastos_token"); }
export function getStoredUser() { try { return JSON.parse(localStorage.getItem("gastos_user")); } catch { return null; } }
export function setStoredUser(u) { u ? localStorage.setItem("gastos_user", JSON.stringify(u)) : localStorage.removeItem("gastos_user"); }

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (res.status === 401) { setToken(null); setStoredUser(null); window.location.reload(); throw new Error("Sesión expirada"); }
  if (!res.ok) { const err = await res.json().catch(() => ({ error: res.statusText })); throw new Error(err.error || "Error"); }
  return res.json();
}

export const api = {
  login: (u, p) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ username: u, password: p }) }),
  me: () => request("/api/auth/me"),

  getUsers: () => request("/api/admin/users"),
  createUser: (d) => request("/api/admin/users", { method: "POST", body: JSON.stringify(d) }),
  updateUser: (id, d) => request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  resetPassword: (id, p) => request(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password: p }) }),

  getCategories: () => request("/api/categories"),
  addCategory: (d) => request("/api/categories", { method: "POST", body: JSON.stringify(d) }),
  updateCategory: (id, d) => request(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: "DELETE" }),

  getPaymentMethods: () => request("/api/payment-methods"),
  addPaymentMethod: (d) => request("/api/payment-methods", { method: "POST", body: JSON.stringify(d) }),
  updatePaymentMethod: (id, d) => request(`/api/payment-methods/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deletePaymentMethod: (id) => request(`/api/payment-methods/${id}`, { method: "DELETE" }),

  getCreditCards: () => request("/api/credit-cards"),
  addCreditCard: (d) => request("/api/credit-cards", { method: "POST", body: JSON.stringify(d) }),
  updateCreditCard: (id, d) => request(`/api/credit-cards/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteCreditCard: (id) => request(`/api/credit-cards/${id}`, { method: "DELETE" }),

  getExpenses: (p = {}) => { const q = new URLSearchParams(p).toString(); return request(`/api/expenses?${q}`); },
  getCardTotals: (m) => request(`/api/expenses/card-totals?billing_month=${m || ""}`),
  addExpense: (d) => request("/api/expenses", { method: "POST", body: JSON.stringify(d) }),
  updateExpense: (id, d) => request(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteExpense: (id) => request(`/api/expenses/${id}`, { method: "DELETE" }),

  getAlerts: () => request("/api/alerts"),
  getBalance: (m) => request(`/api/balance?month=${m}`),

  getIncomes: (m) => request(`/api/incomes?month=${m || ""}`),
  addIncome: (d) => request("/api/incomes", { method: "POST", body: JSON.stringify(d) }),
  updateIncome: (id, d) => request(`/api/incomes/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteIncome: (id) => request(`/api/incomes/${id}`, { method: "DELETE" }),

  exportData: () => request("/api/admin/export"),
  importData: (d) => request("/api/admin/import", { method: "POST", body: JSON.stringify(d) }),
};
