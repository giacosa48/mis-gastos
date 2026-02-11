const BASE = import.meta.env.VITE_API_URL || "";

function getToken() {
  return localStorage.getItem("gastos_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("gastos_token", token);
  else localStorage.removeItem("gastos_token");
}

export function getStoredUser() {
  try {
    const u = localStorage.getItem("gastos_user");
    return u ? JSON.parse(u) : null;
  } catch { return null; }
}

export function setStoredUser(user) {
  if (user) localStorage.setItem("gastos_user", JSON.stringify(user));
  else localStorage.removeItem("gastos_user");
}

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });
  if (res.status === 401) {
    setToken(null);
    setStoredUser(null);
    window.location.reload();
    throw new Error("Sesión expirada");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  login: (username, password) => request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  me: () => request("/api/auth/me"),

  // Admin
  getUsers: () => request("/api/admin/users"),
  createUser: (data) => request("/api/admin/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  resetPassword: (id, password) => request(`/api/admin/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  deleteUser: (id) => request(`/api/admin/users/${id}`, { method: "DELETE" }),

  // Categories
  getCategories: () => request("/api/categories"),
  addCategory: (data) => request("/api/categories", { method: "POST", body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/api/categories/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/api/categories/${id}`, { method: "DELETE" }),

  // Payment Methods
  getPaymentMethods: () => request("/api/payment-methods"),
  addPaymentMethod: (data) => request("/api/payment-methods", { method: "POST", body: JSON.stringify(data) }),
  updatePaymentMethod: (id, data) => request(`/api/payment-methods/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletePaymentMethod: (id) => request(`/api/payment-methods/${id}`, { method: "DELETE" }),

  // Credit Cards
  getCreditCards: () => request("/api/credit-cards"),
  addCreditCard: (data) => request("/api/credit-cards", { method: "POST", body: JSON.stringify(data) }),
  updateCreditCard: (id, data) => request(`/api/credit-cards/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCreditCard: (id) => request(`/api/credit-cards/${id}`, { method: "DELETE" }),

  // Expenses
  getExpenses: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/api/expenses?${qs}`);
  },
  getCardTotals: (billing_month) => request(`/api/expenses/card-totals?billing_month=${billing_month || ""}`),
  addExpense: (data) => request("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
  updateExpense: (id, data) => request(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/api/expenses/${id}`, { method: "DELETE" }),
};
