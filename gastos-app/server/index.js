const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "gastos-dev-secret-2026";

// ─── Database Setup ───
const dbPath = process.env.DB_PATH || path.join(__dirname, "gastos.db");
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ─── Schema ───
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    label TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT '📦',
    color TEXT NOT NULL DEFAULT '#6C757D',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('credit_card','debit_card','cash')),
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS credit_cards (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payment_method_id TEXT NOT NULL,
    card_name TEXT NOT NULL,
    brand TEXT NOT NULL DEFAULT 'visa',
    bank TEXT NOT NULL DEFAULT '',
    closing_day INTEGER NOT NULL DEFAULT 1,
    due_day INTEGER NOT NULL DEFAULT 15,
    active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id)
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id TEXT NOT NULL,
    payment_method_id TEXT,
    credit_card_id TEXT,
    date TEXT NOT NULL,
    billing_month TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE TABLE IF NOT EXISTS incomes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    month TEXT NOT NULL,
    recurring INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_expenses_billing ON expenses(user_id, billing_month);
  CREATE INDEX IF NOT EXISTS idx_expenses_card ON expenses(credit_card_id);
  CREATE INDEX IF NOT EXISTS idx_incomes_user_month ON incomes(user_id, month);
`);

// ─── Seed admin ───
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const adminId = crypto.randomUUID();
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (id, username, display_name, password_hash, role) VALUES (?,?,?,?,?)").run(adminId, "admin", "Administrador", hash, "admin");
  seedDefaults(adminId);
  console.log("🔑 Admin creado: admin / admin123");
}

function seedDefaults(userId) {
  const cats = [
    { label: "Comida", icon: "🍽️", color: "#E07A5F", s: 1 }, { label: "Bares", icon: "🍺", color: "#F2A541", s: 2 },
    { label: "Ocio", icon: "🎮", color: "#81B29A", s: 3 }, { label: "Salud", icon: "💊", color: "#3D405B", s: 4 },
    { label: "Transporte", icon: "🚗", color: "#7209B7", s: 5 }, { label: "Hogar", icon: "🏠", color: "#0077B6", s: 6 },
    { label: "Ropa", icon: "👕", color: "#E63946", s: 7 }, { label: "Servicios", icon: "📱", color: "#457B9D", s: 8 },
    { label: "Educación", icon: "📚", color: "#2A9D8F", s: 9 }, { label: "Otros", icon: "📦", color: "#6C757D", s: 10 },
  ];
  const cStmt = db.prepare("INSERT INTO categories (id, user_id, label, icon, color, sort_order) VALUES (?,?,?,?,?,?)");
  for (const c of cats) cStmt.run(crypto.randomUUID(), userId, c.label, c.icon, c.color, c.s);

  const pms = [{ name: "Efectivo", type: "cash" }, { name: "Tarjeta de Débito", type: "debit_card" }, { name: "Tarjeta de Crédito", type: "credit_card" }];
  const pStmt = db.prepare("INSERT INTO payment_methods (id, user_id, name, type) VALUES (?,?,?,?)");
  for (const m of pms) pStmt.run(crypto.randomUUID(), userId, m.name, m.type);
}

function calcBillingMonth(expenseDate, closingDay) {
  const d = new Date(expenseDate + "T12:00:00");
  const day = d.getDate();
  let y = d.getFullYear(), m = d.getMonth() + 1;
  if (day > closingDay) { m++; if (m > 12) { m = 1; y++; } }
  return `${y}-${String(m).padStart(2, "0")}`;
}

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: "10mb" }));
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h) return res.status(401).json({ error: "Token requerido" });
  try {
    const payload = jwt.verify(h.replace("Bearer ", ""), JWT_SECRET);
    const user = db.prepare("SELECT id, username, display_name, role, active FROM users WHERE id = ?").get(payload.userId);
    if (!user || !user.active) return res.status(401).json({ error: "Usuario inactivo" });
    req.user = user;
    next();
  } catch { return res.status(401).json({ error: "Token inválido" }); }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Solo admin" });
  next();
}

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Campos requeridos" });
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.toLowerCase().trim());
  if (!user || !user.active) return res.status(401).json({ error: "Credenciales incorrectas" });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Credenciales incorrectas" });
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role } });
});

app.get("/api/auth/me", auth, (req, res) => res.json(req.user));

// ═══════════════════════════════════════
// ADMIN: USERS
// ═══════════════════════════════════════
app.get("/api/admin/users", auth, adminOnly, (req, res) => {
  res.json(db.prepare("SELECT id, username, display_name, role, active, created_at FROM users ORDER BY created_at").all());
});

app.post("/api/admin/users", auth, adminOnly, (req, res) => {
  const { username, display_name, password, role } = req.body;
  if (!username || !password || !display_name) return res.status(400).json({ error: "Campos requeridos" });
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: "Usuario ya existe" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO users (id, username, display_name, password_hash, role) VALUES (?,?,?,?,?)")
    .run(id, username.toLowerCase().trim(), display_name, bcrypt.hashSync(password, 10), role || "user");
  seedDefaults(id);
  res.status(201).json({ id, username: username.toLowerCase().trim(), display_name, role: role || "user", active: 1 });
});

app.put("/api/admin/users/:id", auth, adminOnly, (req, res) => {
  const { display_name, role, active } = req.body;
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ error: "No encontrado" });
  db.prepare("UPDATE users SET display_name=?, role=?, active=? WHERE id=?").run(display_name ?? u.display_name, role ?? u.role, active ?? u.active, req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/users/:id/reset-password", auth, adminOnly, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password requerido" });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(password, 10), req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════
app.get("/api/categories", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order").all(req.user.id));
});
app.post("/api/categories", auth, (req, res) => {
  const { label, icon, color } = req.body;
  if (!label) return res.status(400).json({ error: "Label requerido" });
  const id = crypto.randomUUID();
  const max = db.prepare("SELECT MAX(sort_order) as m FROM categories WHERE user_id = ?").get(req.user.id);
  db.prepare("INSERT INTO categories (id, user_id, label, icon, color, sort_order) VALUES (?,?,?,?,?,?)").run(id, req.user.id, label, icon || "📦", color || "#6C757D", (max.m || 0) + 1);
  res.status(201).json({ id, user_id: req.user.id, label, icon: icon || "📦", color: color || "#6C757D" });
});
app.put("/api/categories/:id", auth, (req, res) => {
  const { label, icon, color } = req.body;
  const c = db.prepare("SELECT * FROM categories WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!c) return res.status(404).json({ error: "No encontrada" });
  db.prepare("UPDATE categories SET label=?, icon=?, color=? WHERE id=?").run(label || c.label, icon || c.icon, color || c.color, req.params.id);
  res.json({ success: true });
});
app.delete("/api/categories/:id", auth, (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// PAYMENT METHODS
// ═══════════════════════════════════════
app.get("/api/payment-methods", auth, (req, res) => {
  res.json(db.prepare("SELECT * FROM payment_methods WHERE user_id = ? AND active = 1").all(req.user.id));
});
app.post("/api/payment-methods", auth, (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: "Campos requeridos" });
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO payment_methods (id, user_id, name, type) VALUES (?,?,?,?)").run(id, req.user.id, name, type);
  res.status(201).json({ id, user_id: req.user.id, name, type, active: 1 });
});
app.put("/api/payment-methods/:id", auth, (req, res) => {
  const { name, type } = req.body;
  const pm = db.prepare("SELECT * FROM payment_methods WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!pm) return res.status(404).json({ error: "No encontrado" });
  db.prepare("UPDATE payment_methods SET name=?, type=? WHERE id=?").run(name || pm.name, type || pm.type, req.params.id);
  res.json({ success: true });
});
app.delete("/api/payment-methods/:id", auth, (req, res) => {
  db.prepare("UPDATE payment_methods SET active = 0 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// CREDIT CARDS
// ═══════════════════════════════════════
app.get("/api/credit-cards", auth, (req, res) => {
  res.json(db.prepare("SELECT cc.*, pm.name as payment_method_name FROM credit_cards cc JOIN payment_methods pm ON cc.payment_method_id = pm.id WHERE cc.user_id = ? AND cc.active = 1").all(req.user.id));
});
app.post("/api/credit-cards", auth, (req, res) => {
  const { card_name, brand, bank, closing_day, due_day } = req.body;
  if (!card_name || !closing_day || !due_day) return res.status(400).json({ error: "Campos requeridos" });
  let pmId;
  const ccPm = db.prepare("SELECT id FROM payment_methods WHERE user_id = ? AND type = 'credit_card' AND active = 1 LIMIT 1").get(req.user.id);
  if (ccPm) pmId = ccPm.id;
  else { pmId = crypto.randomUUID(); db.prepare("INSERT INTO payment_methods (id, user_id, name, type) VALUES (?,?,?,?)").run(pmId, req.user.id, "Tarjeta de Crédito", "credit_card"); }
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO credit_cards (id, user_id, payment_method_id, card_name, brand, bank, closing_day, due_day) VALUES (?,?,?,?,?,?,?,?)").run(id, req.user.id, pmId, card_name, brand || "visa", bank || "", closing_day, due_day);
  res.status(201).json({ id, card_name, brand: brand || "visa", bank: bank || "", closing_day, due_day });
});
app.put("/api/credit-cards/:id", auth, (req, res) => {
  const { card_name, brand, bank, closing_day, due_day } = req.body;
  const c = db.prepare("SELECT * FROM credit_cards WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!c) return res.status(404).json({ error: "No encontrada" });
  db.prepare("UPDATE credit_cards SET card_name=?, brand=?, bank=?, closing_day=?, due_day=? WHERE id=?").run(card_name || c.card_name, brand || c.brand, bank ?? c.bank, closing_day ?? c.closing_day, due_day ?? c.due_day, req.params.id);
  res.json({ success: true });
});
app.delete("/api/credit-cards/:id", auth, (req, res) => {
  db.prepare("UPDATE credit_cards SET active = 0 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════
app.get("/api/expenses", auth, (req, res) => {
  const { month, category, payment_method_id, credit_card_id, billing_month } = req.query;
  let sql = "SELECT * FROM expenses WHERE user_id = ?";
  const params = [req.user.id];
  if (billing_month) { sql += " AND billing_month = ?"; params.push(billing_month); }
  else if (month) { sql += " AND strftime('%Y-%m', date) = ?"; params.push(month); }
  if (category) { sql += " AND category_id = ?"; params.push(category); }
  if (payment_method_id) { sql += " AND payment_method_id = ?"; params.push(payment_method_id); }
  if (credit_card_id) { sql += " AND credit_card_id = ?"; params.push(credit_card_id); }
  sql += " ORDER BY date DESC, created_at DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/expenses/card-totals", auth, (req, res) => {
  const { billing_month } = req.query;
  let sql = `SELECT cc.id as card_id, cc.card_name, cc.brand, cc.bank, cc.closing_day, cc.due_day,
    COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as count
    FROM credit_cards cc LEFT JOIN expenses e ON e.credit_card_id = cc.id AND e.user_id = ?`;
  const params = [req.user.id];
  if (billing_month) { sql += " AND e.billing_month = ?"; params.push(billing_month); }
  sql += " WHERE cc.user_id = ? AND cc.active = 1 GROUP BY cc.id ORDER BY total DESC";
  params.push(req.user.id);
  res.json(db.prepare(sql).all(...params));
});

// Alerts: cards closing tomorrow
app.get("/api/alerts", auth, (req, res) => {
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  const tomorrowDay = tomorrow.getDate();
  const currentBillingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  const closingCards = db.prepare(`
    SELECT cc.id, cc.card_name, cc.brand, cc.bank, cc.closing_day, cc.due_day,
      COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as expense_count
    FROM credit_cards cc 
    LEFT JOIN expenses e ON e.credit_card_id = cc.id AND e.billing_month = ? AND e.user_id = ?
    WHERE cc.user_id = ? AND cc.active = 1 AND cc.closing_day = ?
    GROUP BY cc.id
  `).all(currentBillingMonth, req.user.id, req.user.id, tomorrowDay);

  const dueSoonCards = db.prepare(`
    SELECT cc.id, cc.card_name, cc.brand, cc.bank, cc.closing_day, cc.due_day,
      COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as expense_count
    FROM credit_cards cc 
    LEFT JOIN expenses e ON e.credit_card_id = cc.id AND e.billing_month = ? AND e.user_id = ?
    WHERE cc.user_id = ? AND cc.active = 1 AND cc.due_day = ?
    GROUP BY cc.id
  `).all(currentBillingMonth, req.user.id, req.user.id, tomorrowDay);

  res.json({ closing_tomorrow: closingCards, due_tomorrow: dueSoonCards, check_date: tomorrow.toISOString().slice(0, 10) });
});

app.post("/api/expenses", auth, (req, res) => {
  const { description, amount, category_id, payment_method_id, credit_card_id, date } = req.body;
  if (!description || !amount || !date) return res.status(400).json({ error: "Campos requeridos" });
  let billingMonth = null;
  if (credit_card_id) {
    const card = db.prepare("SELECT closing_day FROM credit_cards WHERE id = ? AND user_id = ?").get(credit_card_id, req.user.id);
    if (card) billingMonth = calcBillingMonth(date, card.closing_day);
  }
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO expenses (id, user_id, description, amount, category_id, payment_method_id, credit_card_id, date, billing_month) VALUES (?,?,?,?,?,?,?,?,?)")
    .run(id, req.user.id, description, amount, category_id, payment_method_id || null, credit_card_id || null, date, billingMonth);
  res.status(201).json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(id));
});

app.put("/api/expenses/:id", auth, (req, res) => {
  const { description, amount, category_id, payment_method_id, credit_card_id, date } = req.body;
  const ex = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!ex) return res.status(404).json({ error: "No encontrado" });
  const newDate = date || ex.date;
  const newCardId = credit_card_id !== undefined ? credit_card_id : ex.credit_card_id;
  let billingMonth = null;
  if (newCardId) { const card = db.prepare("SELECT closing_day FROM credit_cards WHERE id = ?").get(newCardId); if (card) billingMonth = calcBillingMonth(newDate, card.closing_day); }
  db.prepare("UPDATE expenses SET description=?, amount=?, category_id=?, payment_method_id=?, credit_card_id=?, date=?, billing_month=?, updated_at=datetime('now') WHERE id=?")
    .run(description || ex.description, amount ?? ex.amount, category_id || ex.category_id, payment_method_id !== undefined ? payment_method_id : ex.payment_method_id, newCardId, newDate, billingMonth, req.params.id);
  res.json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id));
});

app.delete("/api/expenses/:id", auth, (req, res) => {
  db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// INCOMES (salary/income)
// ═══════════════════════════════════════
app.get("/api/incomes", auth, (req, res) => {
  const { month } = req.query;
  let sql = "SELECT * FROM incomes WHERE user_id = ?";
  const params = [req.user.id];
  if (month) { sql += " AND month = ?"; params.push(month); }
  sql += " ORDER BY date DESC";
  res.json(db.prepare(sql).all(...params));
});

app.get("/api/balance", auth, (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: "month required" });
  const totalIncome = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE user_id = ? AND month = ?").get(req.user.id, month);
  const totalExpense = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND strftime('%Y-%m', date) = ?").get(req.user.id, month);
  const cardTotal = db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE user_id = ? AND billing_month = ? AND credit_card_id IS NOT NULL").get(req.user.id, month);
  res.json({
    income: totalIncome.total,
    expenses: totalExpense.total,
    card_debt: cardTotal.total,
    balance: totalIncome.total - totalExpense.total,
  });
});

app.post("/api/incomes", auth, (req, res) => {
  const { description, amount, date, recurring } = req.body;
  if (!description || !amount || !date) return res.status(400).json({ error: "Campos requeridos" });
  const month = date.slice(0, 7);
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO incomes (id, user_id, description, amount, date, month, recurring) VALUES (?,?,?,?,?,?,?)").run(id, req.user.id, description, amount, date, month, recurring ? 1 : 0);
  res.status(201).json(db.prepare("SELECT * FROM incomes WHERE id = ?").get(id));
});

app.put("/api/incomes/:id", auth, (req, res) => {
  const { description, amount, date, recurring } = req.body;
  const ex = db.prepare("SELECT * FROM incomes WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!ex) return res.status(404).json({ error: "No encontrado" });
  const newDate = date || ex.date;
  db.prepare("UPDATE incomes SET description=?, amount=?, date=?, month=?, recurring=? WHERE id=?")
    .run(description || ex.description, amount ?? ex.amount, newDate, newDate.slice(0, 7), recurring !== undefined ? (recurring ? 1 : 0) : ex.recurring, req.params.id);
  res.json(db.prepare("SELECT * FROM incomes WHERE id = ?").get(req.params.id));
});

app.delete("/api/incomes/:id", auth, (req, res) => {
  db.prepare("DELETE FROM incomes WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// DATA EXPORT/IMPORT (for persistence across deploys)
// ═══════════════════════════════════════
app.get("/api/admin/export", auth, adminOnly, (req, res) => {
  const data = {
    users: db.prepare("SELECT * FROM users").all(),
    categories: db.prepare("SELECT * FROM categories").all(),
    payment_methods: db.prepare("SELECT * FROM payment_methods").all(),
    credit_cards: db.prepare("SELECT * FROM credit_cards").all(),
    expenses: db.prepare("SELECT * FROM expenses").all(),
    incomes: db.prepare("SELECT * FROM incomes").all(),
    exported_at: new Date().toISOString(),
  };
  res.json(data);
});

app.post("/api/admin/import", auth, adminOnly, (req, res) => {
  const data = req.body;
  if (!data || !data.users) return res.status(400).json({ error: "Invalid data" });
  
  const importTx = db.transaction(() => {
    // Clear all tables
    db.exec("DELETE FROM incomes; DELETE FROM expenses; DELETE FROM credit_cards; DELETE FROM payment_methods; DELETE FROM categories; DELETE FROM users;");
    
    const tables = {
      users: "INSERT OR REPLACE INTO users (id, username, display_name, password_hash, role, active, created_at) VALUES (?,?,?,?,?,?,?)",
      categories: "INSERT OR REPLACE INTO categories (id, user_id, label, icon, color, sort_order) VALUES (?,?,?,?,?,?)",
      payment_methods: "INSERT OR REPLACE INTO payment_methods (id, user_id, name, type, active) VALUES (?,?,?,?,?)",
      credit_cards: "INSERT OR REPLACE INTO credit_cards (id, user_id, payment_method_id, card_name, brand, bank, closing_day, due_day, active) VALUES (?,?,?,?,?,?,?,?,?)",
      expenses: "INSERT OR REPLACE INTO expenses (id, user_id, description, amount, category_id, payment_method_id, credit_card_id, date, billing_month, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
      incomes: "INSERT OR REPLACE INTO incomes (id, user_id, description, amount, date, month, recurring, created_at) VALUES (?,?,?,?,?,?,?,?)",
    };
    
    for (const u of (data.users || [])) db.prepare(tables.users).run(u.id, u.username, u.display_name, u.password_hash, u.role, u.active, u.created_at);
    for (const c of (data.categories || [])) db.prepare(tables.categories).run(c.id, c.user_id, c.label, c.icon, c.color, c.sort_order);
    for (const p of (data.payment_methods || [])) db.prepare(tables.payment_methods).run(p.id, p.user_id, p.name, p.type, p.active);
    for (const c of (data.credit_cards || [])) db.prepare(tables.credit_cards).run(c.id, c.user_id, c.payment_method_id, c.card_name, c.brand, c.bank, c.closing_day, c.due_day, c.active);
    for (const e of (data.expenses || [])) db.prepare(tables.expenses).run(e.id, e.user_id, e.description, e.amount, e.category_id, e.payment_method_id, e.credit_card_id, e.date, e.billing_month, e.created_at, e.updated_at);
    for (const i of (data.incomes || [])) db.prepare(tables.incomes).run(i.id, i.user_id, i.description, i.amount, i.date, i.month, i.recurring, i.created_at);
  });
  
  importTx();
  res.json({ success: true, imported: { users: (data.users || []).length, expenses: (data.expenses || []).length } });
});

// ─── SPA Fallback ───
app.get("*", (req, res) => { res.sendFile(path.join(clientDist, "index.html")); });

app.listen(PORT, () => { console.log(`🚀 Gastos API v3 on http://localhost:${PORT}`); });
