const BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export const api = {
  // Categories
  getCategories: () => request("/api/categories"),
  addCategory: (cat) => request("/api/categories", { method: "POST", body: JSON.stringify(cat) }),

  // Expenses
  getExpenses: (month, category) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (category) params.set("category", category);
    return request(`/api/expenses?${params}`);
  },
  getSummary: (month) => request(`/api/expenses/summary?month=${month || ""}`),
  addExpense: (exp) => request("/api/expenses", { method: "POST", body: JSON.stringify(exp) }),
  updateExpense: (id, exp) => request(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(exp) }),
  deleteExpense: (id) => request(`/api/expenses/${id}`, { method: "DELETE" }),
};
