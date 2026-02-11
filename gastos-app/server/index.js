const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "gastos-secret-change-in-prod-" + crypto.randomBytes(8).toString("hex");

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
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id),
    FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id)
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_expenses_billing ON expenses(user_id, billing_month);
  CREATE INDEX IF NOT EXISTS idx_expenses_card ON expenses(credit_card_id);
`);

// ─── Seed admin user ───
const adminExists = db.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
if (!adminExists) {
  const adminId = crypto.randomUUID();
  const hash = bcrypt.hashSync("admin123", 10);
  db.prepare("INSERT INTO users (id, username, display_name, password_hash, role) VALUES (?,?,?,?,?)")
    .run(adminId, "admin", "Administrador", hash, "admin");
  
  // Seed default categories for admin
  seedCategoriesForUser(adminId);
  // Seed default payment methods for admin
  seedPaymentMethodsForUser(adminId);
  console.log("🔑 Admin created: admin / admin123");
}

function seedCategoriesForUser(userId) {
  const cats = [
    { label: "Comida", icon: "🍽️", color: "#E07A5F", sort_order: 1 },
    { label: "Bares", icon: "🍺", color: "#F2A541", sort_order: 2 },
    { label: "Ocio", icon: "🎮", color: "#81B29A", sort_order: 3 },
    { label: "Salud", icon: "💊", color: "#3D405B", sort_order: 4 },
    { label: "Transporte", icon: "🚗", color: "#7209B7", sort_order: 5 },
    { label: "Hogar", icon: "🏠", color: "#0077B6", sort_order: 6 },
    { label: "Ropa", icon: "👕", color: "#E63946", sort_order: 7 },
    { label: "Servicios", icon: "📱", color: "#457B9D", sort_order: 8 },
    { label: "Educación", icon: "📚", color: "#2A9D8F", sort_order: 9 },
    { label: "Otros", icon: "📦", color: "#6C757D", sort_order: 10 },
  ];
  const stmt = db.prepare("INSERT INTO categories (id, user_id, label, icon, color, sort_order) VALUES (?,?,?,?,?,?)");
  for (const c of cats) {
    stmt.run(crypto.randomUUID(), userId, c.label, c.icon, c.color, c.sort_order);
  }
}

function seedPaymentMethodsForUser(userId) {
  const methods = [
    { name: "Efectivo", type: "cash" },
    { name: "Tarjeta de Débito", type: "debit_card" },
    { name: "Tarjeta de Crédito", type: "credit_card" },
  ];
  const stmt = db.prepare("INSERT INTO payment_methods (id, user_id, name, type) VALUES (?,?,?,?)");
  for (const m of methods) {
    stmt.run(crypto.randomUUID(), userId, m.name, m.type);
  }
}

// ─── Billing month calculation ───
function calcBillingMonth(expenseDate, closingDay) {
  const d = new Date(expenseDate + "T12:00:00");
  const day = d.getDate();
  let billingYear = d.getFullYear();
  let billingMonth = d.getMonth() + 1; // 1-indexed
  
  // If expense is AFTER closing day, it goes to NEXT month's bill
  if (day > closingDay) {
    billingMonth++;
    if (billingMonth > 12) {
      billingMonth = 1;
      billingYear++;
    }
  }
  return `${billingYear}-${String(billingMonth).padStart(2, "0")}`;
}

// ─── Middleware ───
app.use(cors());
app.use(express.json());

const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// Auth middleware
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token requerido" });
  try {
    const token = header.replace("Bearer ", "");
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare("SELECT id, username, display_name, role, active FROM users WHERE id = ?").get(payload.userId);
    if (!user || !user.active) return res.status(401).json({ error: "Usuario inactivo o no encontrado" });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Solo administradores" });
  next();
}

// ═══════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Usuario y contraseña requeridos" });
  
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: "Credenciales incorrectas" });
  if (!user.active) return res.status(401).json({ error: "Usuario desactivado" });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Credenciales incorrectas" });
  
  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "30d" });
  res.json({
    token,
    user: { id: user.id, username: user.username, display_name: user.display_name, role: user.role },
  });
});

app.get("/api/auth/me", auth, (req, res) => {
  res.json(req.user);
});

// ═══════════════════════════════════════
// ADMIN: USER MANAGEMENT
// ═══════════════════════════════════════

app.get("/api/admin/users", auth, adminOnly, (req, res) => {
  const users = db.prepare("SELECT id, username, display_name, role, active, created_at FROM users ORDER BY created_at").all();
  res.json(users);
});

app.post("/api/admin/users", auth, adminOnly, (req, res) => {
  const { username, display_name, password, role } = req.body;
  if (!username || !password || !display_name) return res.status(400).json({ error: "Campos requeridos: username, display_name, password" });
  
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username.toLowerCase().trim());
  if (existing) return res.status(409).json({ error: "El usuario ya existe" });
  
  const id = crypto.randomUUID();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("INSERT INTO users (id, username, display_name, password_hash, role) VALUES (?,?,?,?,?)")
    .run(id, username.toLowerCase().trim(), display_name, hash, role || "user");
  
  // Seed defaults for new user
  seedCategoriesForUser(id);
  seedPaymentMethodsForUser(id);
  
  res.status(201).json({ id, username: username.toLowerCase().trim(), display_name, role: role || "user", active: 1 });
});

app.put("/api/admin/users/:id", auth, adminOnly, (req, res) => {
  const { display_name, role, active } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  
  db.prepare("UPDATE users SET display_name = ?, role = ?, active = ? WHERE id = ?")
    .run(display_name ?? user.display_name, role ?? user.role, active ?? user.active, req.params.id);
  
  res.json({ success: true });
});

app.post("/api/admin/users/:id/reset-password", auth, adminOnly, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password requerido" });
  
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(req.params.id);
  if (!user) return res.status(404).json({ error: "Usuario no encontrado" });
  
  const hash = bcrypt.hashSync(password, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, req.params.id);
  res.json({ success: true });
});

app.delete("/api/admin/users/:id", auth, adminOnly, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "No podés eliminarte a vos mismo" });
  db.prepare("UPDATE users SET active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// ═══════════════════════════════════════
// CATEGORIES (per user)
// ═══════════════════════════════════════

app.get("/api/categories", auth, (req, res) => {
  const cats = db.prepare("SELECT * FROM categories WHERE user_id = ? ORDER BY sort_order").all(req.user.id);
  res.json(cats);
});

app.post("/api/categories", auth, (req, res) => {
  const { label, icon, color } = req.body;
  if (!label) return res.status(400).json({ error: "Label requerido" });
  const id = crypto.randomUUID();
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM categories WHERE user_id = ?").get(req.user.id);
  db.prepare("INSERT INTO categories (id, user_id, label, icon, color, sort_order) VALUES (?,?,?,?,?,?)")
    .run(id, req.user.id, label, icon || "📦", color || "#6C757D", (maxOrder.m || 0) + 1);
  res.status(201).json({ id, user_id: req.user.id, label, icon: icon || "📦", color: color || "#6C757D" });
});

app.put("/api/categories/:id", auth, (req, res) => {
  const { label, icon, color } = req.body;
  const cat = db.prepare("SELECT * FROM categories WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!cat) return res.status(404).json({ error: "No encontrada" });
  db.prepare("UPDATE categories SET label=?, icon=?, color=? WHERE id=?")
    .run(label || cat.label, icon || cat.icon, color || cat.color, req.params.id);
  res.json({ success: true });
});

app.delete("/api/categories/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM categories WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: "No encontrada" });
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// PAYMENT METHODS (per user)
// ═══════════════════════════════════════

app.get("/api/payment-methods", auth, (req, res) => {
  const methods = db.prepare("SELECT * FROM payment_methods WHERE user_id = ? AND active = 1").all(req.user.id);
  res.json(methods);
});

app.post("/api/payment-methods", auth, (req, res) => {
  const { name, type } = req.body;
  if (!name || !type) return res.status(400).json({ error: "name y type requeridos" });
  if (!["credit_card", "debit_card", "cash"].includes(type)) return res.status(400).json({ error: "type inválido" });
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
// CREDIT CARDS (per user)
// ═══════════════════════════════════════

app.get("/api/credit-cards", auth, (req, res) => {
  const cards = db.prepare(`
    SELECT cc.*, pm.name as payment_method_name 
    FROM credit_cards cc 
    JOIN payment_methods pm ON cc.payment_method_id = pm.id 
    WHERE cc.user_id = ? AND cc.active = 1
  `).all(req.user.id);
  res.json(cards);
});

app.post("/api/credit-cards", auth, (req, res) => {
  const { card_name, brand, bank, closing_day, due_day, payment_method_id } = req.body;
  if (!card_name || !closing_day || !due_day) return res.status(400).json({ error: "card_name, closing_day, due_day requeridos" });
  
  // Find or create credit_card payment method
  let pmId = payment_method_id;
  if (!pmId) {
    const ccPm = db.prepare("SELECT id FROM payment_methods WHERE user_id = ? AND type = 'credit_card' AND active = 1 LIMIT 1").get(req.user.id);
    if (ccPm) pmId = ccPm.id;
    else {
      pmId = crypto.randomUUID();
      db.prepare("INSERT INTO payment_methods (id, user_id, name, type) VALUES (?,?,?,?)").run(pmId, req.user.id, "Tarjeta de Crédito", "credit_card");
    }
  }
  
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO credit_cards (id, user_id, payment_method_id, card_name, brand, bank, closing_day, due_day) VALUES (?,?,?,?,?,?,?,?)")
    .run(id, req.user.id, pmId, card_name, brand || "visa", bank || "", closing_day, due_day);
  res.status(201).json({ id, card_name, brand: brand || "visa", bank: bank || "", closing_day, due_day });
});

app.put("/api/credit-cards/:id", auth, (req, res) => {
  const { card_name, brand, bank, closing_day, due_day } = req.body;
  const card = db.prepare("SELECT * FROM credit_cards WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!card) return res.status(404).json({ error: "No encontrada" });
  db.prepare("UPDATE credit_cards SET card_name=?, brand=?, bank=?, closing_day=?, due_day=? WHERE id=?")
    .run(card_name || card.card_name, brand || card.brand, bank ?? card.bank, closing_day ?? card.closing_day, due_day ?? card.due_day, req.params.id);
  res.json({ success: true });
});

app.delete("/api/credit-cards/:id", auth, (req, res) => {
  db.prepare("UPDATE credit_cards SET active = 0 WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  res.json({ deleted: true });
});

// ═══════════════════════════════════════
// EXPENSES (per user, with billing logic)
// ═══════════════════════════════════════

app.get("/api/expenses", auth, (req, res) => {
  const { month, category, payment_method_id, credit_card_id, billing_month } = req.query;
  let sql = "SELECT * FROM expenses WHERE user_id = ?";
  const params = [req.user.id];

  if (billing_month) {
    sql += " AND billing_month = ?";
    params.push(billing_month);
  } else if (month) {
    sql += " AND strftime('%Y-%m', date) = ?";
    params.push(month);
  }
  if (category) { sql += " AND category_id = ?"; params.push(category); }
  if (payment_method_id) { sql += " AND payment_method_id = ?"; params.push(payment_method_id); }
  if (credit_card_id) { sql += " AND credit_card_id = ?"; params.push(credit_card_id); }
  sql += " ORDER BY date DESC, created_at DESC";

  res.json(db.prepare(sql).all(...params));
});

// Card totals per billing month
app.get("/api/expenses/card-totals", auth, (req, res) => {
  const { billing_month } = req.query;
  let sql = `
    SELECT cc.id as card_id, cc.card_name, cc.brand, cc.bank, cc.due_day,
           COALESCE(SUM(e.amount), 0) as total, COUNT(e.id) as count
    FROM credit_cards cc
    LEFT JOIN expenses e ON e.credit_card_id = cc.id AND e.user_id = ?
  `;
  const params = [req.user.id];
  if (billing_month) {
    sql += " AND e.billing_month = ?";
    params.push(billing_month);
  }
  sql += " WHERE cc.user_id = ? AND cc.active = 1 GROUP BY cc.id ORDER BY total DESC";
  params.push(req.user.id);

  res.json(db.prepare(sql).all(...params));
});

app.post("/api/expenses", auth, (req, res) => {
  const { description, amount, category_id, payment_method_id, credit_card_id, date } = req.body;
  if (!description || !amount || !date) return res.status(400).json({ error: "description, amount, date requeridos" });
  
  // Calculate billing_month for credit card expenses
  let billingMonth = null;
  if (credit_card_id) {
    const card = db.prepare("SELECT closing_day FROM credit_cards WHERE id = ? AND user_id = ?").get(credit_card_id, req.user.id);
    if (card) {
      billingMonth = calcBillingMonth(date, card.closing_day);
    }
  }
  
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO expenses (id, user_id, description, amount, category_id, payment_method_id, credit_card_id, date, billing_month) 
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, description, amount, category_id, payment_method_id || null, credit_card_id || null, date, billingMonth);
  
  res.status(201).json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(id));
});

app.put("/api/expenses/:id", auth, (req, res) => {
  const { description, amount, category_id, payment_method_id, credit_card_id, date } = req.body;
  const existing = db.prepare("SELECT * FROM expenses WHERE id = ? AND user_id = ?").get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: "No encontrado" });
  
  const newDate = date || existing.date;
  const newCardId = credit_card_id !== undefined ? credit_card_id : existing.credit_card_id;
  
  let billingMonth = null;
  if (newCardId) {
    const card = db.prepare("SELECT closing_day FROM credit_cards WHERE id = ?").get(newCardId);
    if (card) billingMonth = calcBillingMonth(newDate, card.closing_day);
  }
  
  db.prepare(`UPDATE expenses SET description=?, amount=?, category_id=?, payment_method_id=?, credit_card_id=?, date=?, billing_month=?, updated_at=datetime('now') WHERE id=?`)
    .run(
      description || existing.description,
      amount ?? existing.amount,
      category_id || existing.category_id,
      payment_method_id !== undefined ? payment_method_id : existing.payment_method_id,
      newCardId,
      newDate,
      billingMonth,
      req.params.id
    );
  
  res.json(db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id));
});

app.delete("/api/expenses/:id", auth, (req, res) => {
  const result = db.prepare("DELETE FROM expenses WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: "No encontrado" });
  res.json({ deleted: true });
});

// ─── SPA Fallback ───
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Gastos API v2 running on http://localhost:${PORT}`);
  console.log(`📁 DB: ${dbPath}`);
});
