const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Database Setup ───
const dbPath = process.env.DB_PATH || path.join(__dirname, "gastos.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    category_id TEXT NOT NULL DEFAULT 'otros',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );

  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
`);

// Seed default categories
const defaultCategories = [
  { id: "comida", label: "Comida", icon: "🍽️", color: "#E07A5F", sort_order: 1 },
  { id: "bares", label: "Bares", icon: "🍺", color: "#F2A541", sort_order: 2 },
  { id: "ocio", label: "Ocio", icon: "🎮", color: "#81B29A", sort_order: 3 },
  { id: "salud", label: "Salud", icon: "💊", color: "#3D405B", sort_order: 4 },
  { id: "transporte", label: "Transporte", icon: "🚗", color: "#7209B7", sort_order: 5 },
  { id: "hogar", label: "Hogar", icon: "🏠", color: "#0077B6", sort_order: 6 },
  { id: "ropa", label: "Ropa", icon: "👕", color: "#E63946", sort_order: 7 },
  { id: "servicios", label: "Servicios", icon: "📱", color: "#457B9D", sort_order: 8 },
  { id: "educacion", label: "Educación", icon: "📚", color: "#2A9D8F", sort_order: 9 },
  { id: "otros", label: "Otros", icon: "📦", color: "#6C757D", sort_order: 10 },
];

const insertCat = db.prepare(`
  INSERT OR IGNORE INTO categories (id, label, icon, color, sort_order)
  VALUES (@id, @label, @icon, @color, @sort_order)
`);
const seedCategories = db.transaction(() => {
  for (const cat of defaultCategories) insertCat.run(cat);
});
seedCategories();

// ─── Middleware ───
app.use(cors());
app.use(express.json());

// Serve static frontend in production
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// ─── API Routes ───

// GET /api/categories
app.get("/api/categories", (req, res) => {
  const cats = db.prepare("SELECT * FROM categories ORDER BY sort_order").all();
  res.json(cats);
});

// POST /api/categories
app.post("/api/categories", (req, res) => {
  const { id, label, icon, color } = req.body;
  if (!id || !label) return res.status(400).json({ error: "id and label required" });
  const maxOrder = db.prepare("SELECT MAX(sort_order) as m FROM categories").get();
  db.prepare(`
    INSERT INTO categories (id, label, icon, color, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, label, icon || "📦", color || "#6C757D", (maxOrder.m || 0) + 1);
  res.status(201).json({ id, label, icon, color });
});

// GET /api/expenses?month=2026-02&category=comida
app.get("/api/expenses", (req, res) => {
  const { month, category } = req.query;
  let sql = "SELECT * FROM expenses WHERE 1=1";
  const params = [];

  if (month) {
    sql += " AND strftime('%Y-%m', date) = ?";
    params.push(month);
  }
  if (category) {
    sql += " AND category_id = ?";
    params.push(category);
  }
  sql += " ORDER BY date DESC, created_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json(rows);
});

// GET /api/expenses/summary?month=2026-02
app.get("/api/expenses/summary", (req, res) => {
  const { month } = req.query;
  let whereClause = "";
  const params = [];

  if (month) {
    whereClause = "WHERE strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  const total = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses ${whereClause}
  `).get(...params);

  const byCategory = db.prepare(`
    SELECT category_id, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses ${whereClause}
    GROUP BY category_id
    ORDER BY total DESC
  `).all(...params);

  res.json({ ...total, byCategory });
});

// POST /api/expenses
app.post("/api/expenses", (req, res) => {
  const { id, description, amount, category_id, date } = req.body;
  if (!description || !amount || !date) {
    return res.status(400).json({ error: "description, amount, and date are required" });
  }
  const expId = id || require("crypto").randomUUID();
  db.prepare(`
    INSERT INTO expenses (id, description, amount, category_id, date)
    VALUES (?, ?, ?, ?, ?)
  `).run(expId, description, amount, category_id || "otros", date);

  const expense = db.prepare("SELECT * FROM expenses WHERE id = ?").get(expId);
  res.status(201).json(expense);
});

// PUT /api/expenses/:id
app.put("/api/expenses/:id", (req, res) => {
  const { description, amount, category_id, date } = req.body;
  const existing = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });

  db.prepare(`
    UPDATE expenses
    SET description = ?, amount = ?, category_id = ?, date = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(
    description || existing.description,
    amount ?? existing.amount,
    category_id || existing.category_id,
    date || existing.date,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM expenses WHERE id = ?").get(req.params.id);
  res.json(updated);
});

// DELETE /api/expenses/:id
app.delete("/api/expenses/:id", (req, res) => {
  const result = db.prepare("DELETE FROM expenses WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Not found" });
  res.json({ deleted: true });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 Gastos API running on http://localhost:${PORT}`);
});
