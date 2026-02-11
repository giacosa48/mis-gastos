import { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "./api";

const MONTHS = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

const formatCurrency = (n) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

/* ─── CategoryPill ─── */
function CategoryPill({ cat, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 14px", borderRadius: 20, whiteSpace: "nowrap",
      border: selected ? `2px solid ${cat.color}` : "2px solid transparent",
      background: selected ? `${cat.color}18` : "#f5f5f0",
      color: selected ? cat.color : "#555",
      fontWeight: selected ? 600 : 400,
      fontSize: 13, cursor: "pointer", transition: "all .2s", fontFamily: "inherit",
    }}>
      <span>{cat.icon}</span> {cat.label}
    </button>
  );
}

/* ─── ExpenseForm ─── */
function ExpenseForm({ expense, categories, onSave, onCancel }) {
  const [desc, setDesc] = useState(expense?.description || "");
  const [amount, setAmount] = useState(expense?.amount || "");
  const [catId, setCatId] = useState(expense?.category_id || categories[0]?.id || "otros");
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!desc.trim() || !amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await onSave({
        ...(expense?.id && { id: expense.id }),
        description: desc.trim(),
        amount: Number(amount),
        category_id: catId,
        date,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,.45)", display: "flex",
      alignItems: "flex-end", justifyContent: "center",
      animation: "fadeIn .2s ease",
    }}>
      <div style={{
        background: "#FAFAF5", width: "100%", maxWidth: 480,
        borderRadius: "24px 24px 0 0", padding: "28px 24px env(safe-area-inset-bottom, 36px)",
        maxHeight: "92vh", overflowY: "auto", animation: "slideUp .3s ease",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "#1a1a1a", fontWeight: 700, letterSpacing: "-.3px" }}>
            {expense ? "Editar gasto" : "Nuevo gasto"}
          </h2>
          <button onClick={onCancel} style={{
            background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999", padding: 4,
          }}>✕</button>
        </div>

        <label style={labelStyle}>Descripción</label>
        <input value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="Ej: Almuerzo con amigos" style={inputStyle} autoFocus />

        <label style={labelStyle}>Monto ($)</label>
        <input type="number" inputMode="numeric" value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="0"
          style={{ ...inputStyle, fontSize: 28, fontWeight: 700, letterSpacing: -1 }} />

        <label style={labelStyle}>Fecha</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />

        <label style={{ ...labelStyle, marginBottom: 10 }}>Categoría</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {categories.map((c) => (
            <CategoryPill key={c.id} cat={c} selected={catId === c.id} onClick={() => setCatId(c.id)} />
          ))}
        </div>

        <button onClick={handleSubmit} disabled={saving} style={{
          width: "100%", padding: "16px", borderRadius: 14,
          background: saving ? "#888" : "#1a1a1a", color: "#fff", border: "none",
          fontSize: 16, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}>
          {saving ? "Guardando..." : expense ? "Guardar cambios" : "Agregar gasto"}
        </button>
      </div>
    </div>
  );
}

/* ─── NewCategoryForm ─── */
function NewCategoryForm({ onSave, onCancel }) {
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📦");
  const [color, setColor] = useState("#6C757D");
  const colors = ["#E07A5F","#F2A541","#81B29A","#3D405B","#7209B7","#0077B6","#E63946","#457B9D","#2A9D8F","#FF6B6B"];

  const handleSave = () => {
    if (!label.trim()) return;
    const id = label.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    onSave({ id, label: label.trim(), icon, color });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,0,0,.45)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#FAFAF5", width: "90%", maxWidth: 380,
        borderRadius: 20, padding: "24px",
      }}>
        <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Nueva categoría</h3>

        <label style={labelStyle}>Nombre</label>
        <input value={label} onChange={(e) => setLabel(e.target.value)}
          placeholder="Ej: Mascotas" style={inputStyle} autoFocus />

        <label style={labelStyle}>Emoji</label>
        <input value={icon} onChange={(e) => setIcon(e.target.value)}
          style={{ ...inputStyle, fontSize: 24, width: 80, textAlign: "center" }} />

        <label style={labelStyle}>Color</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 24 }}>
          {colors.map((c) => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 32, height: 32, borderRadius: 8, background: c, border: color === c ? "3px solid #1a1a1a" : "3px solid transparent",
              cursor: "pointer",
            }} />
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: 14, borderRadius: 12, border: "2px solid #ddd",
            background: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Cancelar</button>
          <button onClick={handleSave} style={{
            flex: 1, padding: 14, borderRadius: 12, border: "none",
            background: "#1a1a1a", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Crear</button>
        </div>
      </div>
    </div>
  );
}

/* ─── ExpenseRow ─── */
function ExpenseRow({ expense, catMap, onEdit, onDelete }) {
  const c = catMap[expense.category_id] || { icon: "📦", label: "Otros", color: "#6C757D" };
  const [confirming, setConfirming] = useState(false);

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14,
      padding: "14px 0", borderBottom: "1px solid #eee",
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12,
        background: `${c.color}15`, display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
      }}>{c.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 15, fontWeight: 500, color: "#1a1a1a",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>{expense.description}</div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>
          {c.label} · {new Date(expense.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
        </div>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#1a1a1a", whiteSpace: "nowrap", letterSpacing: "-.3px" }}>
        {formatCurrency(expense.amount)}
      </div>
      <div style={{ display: "flex", gap: 2 }}>
        <button onClick={() => onEdit(expense)} style={iconBtnStyle} title="Editar">✏️</button>
        {confirming ? (
          <button onClick={() => { onDelete(expense.id); setConfirming(false); }}
            style={{ ...iconBtnStyle, background: "#fee", borderRadius: 6 }} title="Confirmar">
            ✅
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} style={iconBtnStyle} title="Eliminar">🗑️</button>
        )}
      </div>
    </div>
  );
}

/* ─── CategoryBreakdown ─── */
function CategoryBreakdown({ expenses, catMap }) {
  const breakdown = useMemo(() => {
    const totals = {};
    expenses.forEach((e) => {
      totals[e.category_id] = (totals[e.category_id] || 0) + e.amount;
    });
    return Object.entries(totals).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total);
  }, [expenses]);

  const max = Math.max(...breakdown.map((b) => b.total), 1);
  if (!breakdown.length) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={sectionTitle}>Por categoría</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {breakdown.map(({ cat, total }) => {
          const c = catMap[cat] || { icon: "📦", label: cat, color: "#6C757D" };
          return (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#333" }}>{c.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{formatCurrency(total)}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "#f0f0eb" }}>
                  <div style={{
                    height: "100%", borderRadius: 3, background: c.color,
                    width: `${(total / max) * 100}%`, transition: "width .5s ease",
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterCat, setFilterCat] = useState(null);
  const [error, setError] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  const [year, month] = currentMonth.split("-").map(Number);
  const catMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  // Load data
  const loadExpenses = useCallback(async () => {
    try {
      const [cats, exps] = await Promise.all([
        api.getCategories(),
        api.getExpenses(currentMonth),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setError(null);
    } catch (e) {
      setError("No se pudo conectar al servidor. Verificá que esté corriendo.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  // Handlers
  const handleSave = async (data) => {
    try {
      if (data.id && editingExpense) {
        await api.updateExpense(data.id, data);
      } else {
        await api.addExpense(data);
      }
      await loadExpenses();
      setShowForm(false);
      setEditingExpense(null);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteExpense(id);
      await loadExpenses();
    } catch (e) {
      alert("Error al eliminar: " + e.message);
    }
  };

  const handleNewCategory = async (cat) => {
    try {
      await api.addCategory(cat);
      setCategories((prev) => [...prev, cat]);
      setShowCatForm(false);
    } catch (e) {
      alert("Error al crear categoría: " + e.message);
    }
  };

  const filtered = useMemo(() =>
    filterCat ? expenses.filter((e) => e.category_id === filterCat) : expenses
  , [expenses, filterCat]);

  const totalMonth = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const d = new Date(year, month, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#FAFAF5", fontFamily }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 16, color: "#999" }}>Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: "#FAFAF5", fontFamily, paddingBottom: 100, color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #FAFAF5; -webkit-tap-highlight-color: transparent; }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        input:focus { outline: none; border-color: #1a1a1a !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: "12px 20px", background: "#FFF3CD", color: "#856404",
          fontSize: 13, textAlign: "center", fontWeight: 500,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: "20px 20px 0", background: "#1a1a1a", borderRadius: "0 0 28px 28px", paddingBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, color: "#888", fontWeight: 500, letterSpacing: 1, textTransform: "uppercase" }}>
              Mis Gastos
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
              {filtered.length} registro{filtered.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button onClick={() => setShowCatForm(true)} style={{
            background: "rgba(255,255,255,.1)", border: "none", color: "#aaa",
            fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
          }}>
            + Categoría
          </button>
        </div>

        {/* Month selector */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <button onClick={prevMonth} style={navBtnStyle}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{MONTHS[month - 1]}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{year}</div>
          </div>
          <button onClick={nextMonth} style={navBtnStyle}>›</button>
        </div>

        {/* Total */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: "#fff", letterSpacing: -2, lineHeight: 1 }}>
            {formatCurrency(totalMonth)}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>Total del mes</div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "24px 20px" }}>
        {/* Category filter chips */}
        <div style={{
          display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 20,
          WebkitOverflowScrolling: "touch", scrollbarWidth: "none",
        }}>
          <button onClick={() => setFilterCat(null)} style={{
            display: "inline-flex", alignItems: "center", padding: "6px 14px",
            borderRadius: 20, whiteSpace: "nowrap",
            border: !filterCat ? "2px solid #1a1a1a" : "2px solid transparent",
            background: !filterCat ? "#1a1a1a0a" : "#f5f5f0",
            color: !filterCat ? "#1a1a1a" : "#555",
            fontWeight: !filterCat ? 600 : 400,
            fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>Todas</button>
          {categories.map((c) => (
            <CategoryPill key={c.id} cat={c} selected={filterCat === c.id}
              onClick={() => setFilterCat(filterCat === c.id ? null : c.id)} />
          ))}
        </div>

        <CategoryBreakdown expenses={filtered} catMap={catMap} />

        {/* Expenses list */}
        <h3 style={sectionTitle}>Detalle</h3>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#bbb" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>Sin gastos este mes</div>
            <div style={{ fontSize: 13, marginTop: 4, color: "#ccc" }}>Tocá + para agregar uno</div>
          </div>
        ) : (
          filtered.map((e) => (
            <ExpenseRow key={e.id} expense={e} catMap={catMap}
              onEdit={(exp) => { setEditingExpense(exp); setShowForm(true); }}
              onDelete={handleDelete} />
          ))
        )}
      </div>

      {/* FAB */}
      <button onClick={() => { setEditingExpense(null); setShowForm(true); }} style={{
        position: "fixed", bottom: 28, right: "calc(50% - 28px)",
        width: 56, height: 56, borderRadius: 16,
        background: "#1a1a1a", color: "#fff", border: "none",
        fontSize: 28, cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,.25)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 50, lineHeight: 1,
      }}>+</button>

      {/* Modals */}
      {showForm && (
        <ExpenseForm expense={editingExpense} categories={categories}
          onSave={handleSave} onCancel={() => { setShowForm(false); setEditingExpense(null); }} />
      )}
      {showCatForm && (
        <NewCategoryForm onSave={handleNewCategory} onCancel={() => setShowCatForm(false)} />
      )}
    </div>
  );
}

// ─── Styles ───
const fontFamily = "'DM Sans', 'SF Pro Display', -apple-system, sans-serif";

const labelStyle = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#999",
  textTransform: "uppercase", letterSpacing: .8, marginBottom: 6, marginTop: 18,
};

const inputStyle = {
  width: "100%", padding: "14px 16px", borderRadius: 12,
  border: "2px solid #e8e8e3", background: "#fff",
  fontSize: 15, fontFamily, color: "#1a1a1a", transition: "border .2s",
};

const navBtnStyle = {
  background: "rgba(255,255,255,.08)", border: "none",
  color: "#fff", fontSize: 22, width: 36, height: 36,
  borderRadius: 10, cursor: "pointer", fontFamily,
};

const iconBtnStyle = {
  background: "none", border: "none", fontSize: 16,
  cursor: "pointer", padding: 4, borderRadius: 6,
};

const sectionTitle = {
  fontSize: 14, fontWeight: 600, color: "#999",
  textTransform: "uppercase", letterSpacing: 1, marginBottom: 12,
};
