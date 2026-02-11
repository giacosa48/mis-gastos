import { useState, useEffect, useMemo, useCallback, createContext, useContext } from "react";
import { api, setToken, setStoredUser, getStoredUser } from "./api";

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const fontFamily = "'DM Sans', 'SF Pro Display', -apple-system, sans-serif";
const COLORS = { bg: "#FAFAF5", dark: "#1a1a1a", border: "#e8e8e3", muted: "#999", light: "#f5f5f0" };

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${COLORS.bg}; font-family: ${fontFamily}; -webkit-tap-highlight-color: transparent; }
  @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
  @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
  input:focus, select:focus { outline: none; border-color: ${COLORS.dark} !important; }
  ::-webkit-scrollbar { display: none; }
  select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23999' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; }
`;

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: .8, marginBottom: 6, marginTop: 16 };
const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `2px solid ${COLORS.border}`, background: "#fff", fontSize: 15, fontFamily, color: COLORS.dark, transition: "border .2s" };
const selectStyle = { ...inputStyle, paddingRight: 32 };
const btnPrimary = { width: "100%", padding: "14px", borderRadius: 14, background: COLORS.dark, color: "#fff", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily };
const btnSecondary = { ...btnPrimary, background: "#fff", color: COLORS.dark, border: `2px solid ${COLORS.border}` };
const iconBtnStyle = { background: "none", border: "none", fontSize: 16, cursor: "pointer", padding: 4, borderRadius: 6 };
const sectionTitle = { fontSize: 13, fontWeight: 600, color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 };
const cardStyle = { background: "#fff", borderRadius: 16, padding: "16px", marginBottom: 12, border: `1px solid ${COLORS.border}` };

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const formatCurrency = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(n);

// ═══════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════
const AppContext = createContext();

function useApp() { return useContext(AppContext); }

// ═══════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════

function Modal({ children, onClose, title }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", animation: "fadeIn .2s ease" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: COLORS.bg, width: "100%", maxWidth: 480, borderRadius: "24px 24px 0 0", padding: "24px 20px 36px", maxHeight: "92vh", overflowY: "auto", animation: "slideUp .3s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.dark }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#999" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 24, width: "85%", maxWidth: 340, textAlign: "center" }}>
        <p style={{ fontSize: 15, color: COLORS.dark, marginBottom: 20, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ ...btnSecondary, width: "auto", flex: 1, padding: 12 }}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...btnPrimary, width: "auto", flex: 1, padding: 12, background: "#E63946" }}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 0, background: COLORS.light, borderRadius: 12, padding: 3, marginBottom: 20 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, padding: "10px 8px", borderRadius: 10, border: "none",
          background: active === t.id ? "#fff" : "transparent",
          color: active === t.id ? COLORS.dark : COLORS.muted,
          fontWeight: active === t.id ? 600 : 400,
          fontSize: 13, cursor: "pointer", fontFamily,
          boxShadow: active === t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none",
          transition: "all .2s",
        }}>
          {t.icon && <span style={{ marginRight: 4 }}>{t.icon}</span>}
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Pill({ label, icon, color, selected, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, whiteSpace: "nowrap",
      border: selected ? `2px solid ${color || COLORS.dark}` : "2px solid transparent",
      background: selected ? `${color || COLORS.dark}15` : COLORS.light,
      color: selected ? (color || COLORS.dark) : "#555",
      fontWeight: selected ? 600 : 400, fontSize: 12, cursor: "pointer", fontFamily,
    }}>
      {icon && <span>{icon}</span>} {label}
    </button>
  );
}

// ═══════════════════════════════════════
// LOGIN SCREEN
// ═══════════════════════════════════════

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError("");
    try {
      const { token, user } = await api.login(username.trim(), password);
      setToken(token);
      setStoredUser(user);
      onLogin(user);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", fontFamily }}>
      <div style={{ width: "90%", maxWidth: 360 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💰</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: -1 }}>Mis Gastos</h1>
          <p style={{ color: "#666", fontSize: 14, marginTop: 6 }}>Ingresá para continuar</p>
        </div>
        <div style={{ background: COLORS.bg, borderRadius: 20, padding: 24 }}>
          {error && <div style={{ background: "#FEE", color: "#C33", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 16, fontWeight: 500 }}>{error}</div>}
          <label style={labelStyle}>Usuario</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} autoFocus autoCapitalize="none" />
          <label style={labelStyle}>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" style={inputStyle}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
          <div style={{ marginTop: 24 }}>
            <button onClick={handleLogin} disabled={loading} style={{ ...btnPrimary, opacity: loading ? .6 : 1 }}>
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN: USER MANAGEMENT
// ═══════════════════════════════════════

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetPw, setResetPw] = useState(null);
  const [newPw, setNewPw] = useState("");
  const [form, setForm] = useState({ username: "", display_name: "", password: "", role: "user" });
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => { setUsers(await api.getUsers()); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      if (editUser) {
        await api.updateUser(editUser.id, { display_name: form.display_name, role: form.role, active: 1 });
      } else {
        await api.createUser(form);
      }
      setShowForm(false); setEditUser(null); setForm({ username: "", display_name: "", password: "", role: "user" });
      load();
    } catch (e) { alert(e.message); }
  };

  const handleResetPw = async () => {
    if (!newPw) return;
    try { await api.resetPassword(resetPw.id, newPw); setResetPw(null); setNewPw(""); alert("Contraseña actualizada"); } catch (e) { alert(e.message); }
  };

  const handleToggle = async (user) => {
    await api.updateUser(user.id, { active: user.active ? 0 : 1, display_name: user.display_name, role: user.role });
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={sectionTitle}>Usuarios</h3>
        <button onClick={() => { setEditUser(null); setForm({ username: "", display_name: "", password: "", role: "user" }); setShowForm(true); }}
          style={{ ...btnPrimary, width: "auto", padding: "8px 16px", fontSize: 13 }}>+ Nuevo</button>
      </div>

      {users.map((u) => (
        <div key={u.id} style={{ ...cardStyle, opacity: u.active ? 1 : .5, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: u.role === "admin" ? "#7209B715" : "#81B29A15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
            {u.role === "admin" ? "👑" : "👤"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{u.display_name}</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>@{u.username} · {u.role}{!u.active ? " · Inactivo" : ""}</div>
          </div>
          <button onClick={() => { setResetPw(u); setNewPw(""); }} style={iconBtnStyle} title="Blanquear contraseña">🔑</button>
          <button onClick={() => { setEditUser(u); setForm({ username: u.username, display_name: u.display_name, password: "", role: u.role }); setShowForm(true); }} style={iconBtnStyle} title="Editar">✏️</button>
          <button onClick={() => handleToggle(u)} style={iconBtnStyle} title={u.active ? "Desactivar" : "Activar"}>{u.active ? "🚫" : "✅"}</button>
        </div>
      ))}

      {showForm && (
        <Modal title={editUser ? "Editar Usuario" : "Nuevo Usuario"} onClose={() => setShowForm(false)}>
          {!editUser && (<><label style={labelStyle}>Username</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} style={inputStyle} autoCapitalize="none" /></>)}
          <label style={labelStyle}>Nombre</label>
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} style={inputStyle} />
          {!editUser && (<><label style={labelStyle}>Contraseña</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} /></>)}
          <label style={labelStyle}>Rol</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={selectStyle}>
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          <div style={{ marginTop: 24 }}><button onClick={handleSave} style={btnPrimary}>Guardar</button></div>
        </Modal>
      )}

      {resetPw && (
        <Modal title={`Blanquear contraseña: ${resetPw.display_name}`} onClose={() => setResetPw(null)}>
          <label style={labelStyle}>Nueva contraseña</label>
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={inputStyle} autoFocus />
          <div style={{ marginTop: 24 }}><button onClick={handleResetPw} style={btnPrimary}>Blanquear</button></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ABM: PAYMENT METHODS
// ═══════════════════════════════════════

function PaymentMethodsABM() {
  const [methods, setMethods] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", type: "cash" });

  const load = useCallback(async () => { setMethods(await api.getPaymentMethods()); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      if (editing) await api.updatePaymentMethod(editing.id, form);
      else await api.addPaymentMethod(form);
      setShowForm(false); setEditing(null); setForm({ name: "", type: "cash" }); load();
    } catch (e) { alert(e.message); }
  };

  const typeLabels = { cash: "💵 Efectivo", debit_card: "💳 Débito", credit_card: "💳 Crédito" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={sectionTitle}>Medios de Pago</h3>
        <button onClick={() => { setEditing(null); setForm({ name: "", type: "cash" }); setShowForm(true); }}
          style={{ ...btnPrimary, width: "auto", padding: "8px 16px", fontSize: 13 }}>+ Nuevo</button>
      </div>

      {methods.map((m) => (
        <div key={m.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22 }}>{m.type === "cash" ? "💵" : "💳"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>{typeLabels[m.type]}</div>
          </div>
          <button onClick={() => { setEditing(m); setForm({ name: m.name, type: m.type }); setShowForm(true); }} style={iconBtnStyle}>✏️</button>
          <button onClick={async () => { await api.deletePaymentMethod(m.id); load(); }} style={iconBtnStyle}>🗑️</button>
        </div>
      ))}

      {showForm && (
        <Modal title={editing ? "Editar Medio de Pago" : "Nuevo Medio de Pago"} onClose={() => setShowForm(false)}>
          <label style={labelStyle}>Nombre</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Efectivo USD" style={inputStyle} autoFocus />
          <label style={labelStyle}>Tipo</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={selectStyle}>
            <option value="cash">Efectivo</option>
            <option value="debit_card">Tarjeta de Débito</option>
            <option value="credit_card">Tarjeta de Crédito</option>
          </select>
          <div style={{ marginTop: 24 }}><button onClick={handleSave} style={btnPrimary}>Guardar</button></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ABM: CREDIT CARDS
// ═══════════════════════════════════════

function CreditCardsABM() {
  const [cards, setCards] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ card_name: "", brand: "visa", bank: "", closing_day: 15, due_day: 5 });

  const load = useCallback(async () => { setCards(await api.getCreditCards()); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      if (editing) await api.updateCreditCard(editing.id, form);
      else await api.addCreditCard(form);
      setShowForm(false); setEditing(null);
      setForm({ card_name: "", brand: "visa", bank: "", closing_day: 15, due_day: 5 });
      load();
    } catch (e) { alert(e.message); }
  };

  const brandIcons = { visa: "🟦 Visa", mastercard: "🟠 Mastercard", amex: "🟢 Amex", cabal: "🔵 Cabal", naranja: "🟧 Naranja" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={sectionTitle}>Tarjetas de Crédito</h3>
        <button onClick={() => { setEditing(null); setForm({ card_name: "", brand: "visa", bank: "", closing_day: 15, due_day: 5 }); setShowForm(true); }}
          style={{ ...btnPrimary, width: "auto", padding: "8px 16px", fontSize: 13 }}>+ Nueva</button>
      </div>

      {cards.map((c) => (
        <div key={c.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 22 }}>💳</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>{c.card_name}</div>
            <div style={{ fontSize: 12, color: COLORS.muted }}>
              {brandIcons[c.brand] || c.brand} {c.bank && `· ${c.bank}`}
            </div>
            <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>
              Cierre: día {c.closing_day} · Vto: día {c.due_day}
            </div>
          </div>
          <button onClick={() => { setEditing(c); setForm({ card_name: c.card_name, brand: c.brand, bank: c.bank, closing_day: c.closing_day, due_day: c.due_day }); setShowForm(true); }} style={iconBtnStyle}>✏️</button>
          <button onClick={async () => { await api.deleteCreditCard(c.id); load(); }} style={iconBtnStyle}>🗑️</button>
        </div>
      ))}

      {cards.length === 0 && <div style={{ textAlign: "center", padding: 32, color: "#ccc" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💳</div>
        <div style={{ fontSize: 14 }}>No hay tarjetas configuradas</div>
      </div>}

      {showForm && (
        <Modal title={editing ? "Editar Tarjeta" : "Nueva Tarjeta"} onClose={() => setShowForm(false)}>
          <label style={labelStyle}>Nombre de la tarjeta</label>
          <input value={form.card_name} onChange={(e) => setForm({ ...form, card_name: e.target.value })} placeholder="Ej: Visa BNA" style={inputStyle} autoFocus />
          <label style={labelStyle}>Marca</label>
          <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} style={selectStyle}>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">American Express</option>
            <option value="cabal">Cabal</option>
            <option value="naranja">Naranja</option>
          </select>
          <label style={labelStyle}>Banco</label>
          <input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} placeholder="Ej: Banco Nación" style={inputStyle} />
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Día de cierre</label>
              <input type="number" min="1" max="28" value={form.closing_day} onChange={(e) => setForm({ ...form, closing_day: Number(e.target.value) })} style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Día de vencimiento</label>
              <input type="number" min="1" max="28" value={form.due_day} onChange={(e) => setForm({ ...form, due_day: Number(e.target.value) })} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginTop: 24 }}><button onClick={handleSave} style={btnPrimary}>Guardar</button></div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// CATEGORIES ABM
// ═══════════════════════════════════════

function CategoriesABM() {
  const [cats, setCats] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ label: "", icon: "📦", color: "#6C757D" });
  const palette = ["#E07A5F","#F2A541","#81B29A","#3D405B","#7209B7","#0077B6","#E63946","#457B9D","#2A9D8F","#FF6B6B"];

  const load = useCallback(async () => { setCats(await api.getCategories()); }, []);
  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      if (editing) await api.updateCategory(editing.id, form);
      else await api.addCategory(form);
      setShowForm(false); setEditing(null); setForm({ label: "", icon: "📦", color: "#6C757D" }); load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={sectionTitle}>Categorías</h3>
        <button onClick={() => { setEditing(null); setForm({ label: "", icon: "📦", color: "#6C757D" }); setShowForm(true); }}
          style={{ ...btnPrimary, width: "auto", padding: "8px 16px", fontSize: 13 }}>+ Nueva</button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {cats.map((c) => (
          <div key={c.id} style={{ ...cardStyle, display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 8, cursor: "pointer" }}
            onClick={() => { setEditing(c); setForm({ label: c.label, icon: c.icon, color: c.color }); setShowForm(true); }}>
            <span style={{ fontSize: 18 }}>{c.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{c.label}</span>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: c.color }} />
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title={editing ? "Editar Categoría" : "Nueva Categoría"} onClose={() => setShowForm(false)}>
          <label style={labelStyle}>Nombre</label>
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} style={inputStyle} autoFocus />
          <label style={labelStyle}>Emoji</label>
          <input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} style={{ ...inputStyle, width: 80, fontSize: 24, textAlign: "center" }} />
          <label style={labelStyle}>Color</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4, marginBottom: 8 }}>
            {palette.map((c) => (
              <button key={c} onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: 8, background: c, border: form.color === c ? "3px solid #1a1a1a" : "3px solid transparent", cursor: "pointer" }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            {editing && <button onClick={async () => { await api.deleteCategory(editing.id); setShowForm(false); setEditing(null); load(); }} style={{ ...btnSecondary, flex: 1, padding: 12, color: "#E63946", borderColor: "#E63946" }}>Eliminar</button>}
            <button onClick={handleSave} style={{ ...btnPrimary, flex: 1, padding: 12 }}>Guardar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// CARD TOTALS VIEW
// ═══════════════════════════════════════

function CardTotals({ currentMonth }) {
  const [totals, setTotals] = useState([]);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    (async () => {
      const [t, c] = await Promise.all([api.getCardTotals(currentMonth), api.getCreditCards()]);
      setTotals(t);
      setCards(c);
    })();
  }, [currentMonth]);

  const cardMap = useMemo(() => Object.fromEntries(cards.map(c => [c.id, c])), [cards]);
  const grandTotal = totals.reduce((s, t) => s + t.total, 0);
  const [y, m] = currentMonth.split("-").map(Number);

  if (totals.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={sectionTitle}>💳 Resumen Tarjetas · {MONTHS[m - 1]}</h3>
      {totals.map((t) => {
        const card = cardMap[t.card_id];
        const dueDate = card ? `${t.due_day}/${m}/${y}` : "";
        return (
          <div key={t.card_id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600 }}>{t.card_name}</div>
              <div style={{ fontSize: 12, color: COLORS.muted }}>
                {t.brand?.toUpperCase()} {t.bank && `· ${t.bank}`} · {t.count} gastos
              </div>
              {dueDate && <div style={{ fontSize: 11, color: "#E07A5F", fontWeight: 500, marginTop: 2 }}>Vence: {dueDate}</div>}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.dark }}>{formatCurrency(t.total)}</div>
          </div>
        );
      })}
      <div style={{ textAlign: "right", fontSize: 14, fontWeight: 700, color: COLORS.dark, padding: "8px 4px", borderTop: `2px solid ${COLORS.border}` }}>
        Total tarjetas: {formatCurrency(grandTotal)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// EXPENSE FORM (updated with payment method + card)
// ═══════════════════════════════════════

function ExpenseForm({ expense, categories, paymentMethods, creditCards, onSave, onCancel }) {
  const [form, setForm] = useState({
    description: expense?.description || "",
    amount: expense?.amount || "",
    category_id: expense?.category_id || categories[0]?.id || "",
    payment_method_id: expense?.payment_method_id || "",
    credit_card_id: expense?.credit_card_id || "",
    date: expense?.date || new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);

  const selectedPM = paymentMethods.find(p => p.id === form.payment_method_id);
  const showCardSelect = selectedPM?.type === "credit_card";

  const handleSubmit = async () => {
    if (!form.description.trim() || !form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      await onSave({
        ...(expense?.id && { id: expense.id }),
        ...form,
        amount: Number(form.amount),
        credit_card_id: showCardSelect ? form.credit_card_id : null,
      });
    } finally { setSaving(false); }
  };

  const catMap = Object.fromEntries(categories.map(c => [c.id, c]));

  return (
    <Modal title={expense ? "Editar Gasto" : "Nuevo Gasto"} onClose={onCancel}>
      <label style={labelStyle}>Descripción</label>
      <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ej: Almuerzo" style={inputStyle} autoFocus />

      <label style={labelStyle}>Monto ($)</label>
      <input type="number" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0"
        style={{ ...inputStyle, fontSize: 24, fontWeight: 700, letterSpacing: -1 }} />

      <label style={labelStyle}>Fecha</label>
      <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inputStyle} />

      <label style={labelStyle}>Categoría</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
        {categories.map((c) => (
          <Pill key={c.id} label={c.label} icon={c.icon} color={c.color}
            selected={form.category_id === c.id} onClick={() => setForm({ ...form, category_id: c.id })} />
        ))}
      </div>

      <label style={labelStyle}>Medio de Pago</label>
      <select value={form.payment_method_id} onChange={(e) => setForm({ ...form, payment_method_id: e.target.value, credit_card_id: "" })} style={selectStyle}>
        <option value="">Sin especificar</option>
        {paymentMethods.map((m) => (
          <option key={m.id} value={m.id}>{m.type === "cash" ? "💵" : "💳"} {m.name}</option>
        ))}
      </select>

      {showCardSelect && (
        <>
          <label style={labelStyle}>Tarjeta de Crédito</label>
          <select value={form.credit_card_id} onChange={(e) => setForm({ ...form, credit_card_id: e.target.value })} style={selectStyle}>
            <option value="">Seleccionar tarjeta</option>
            {creditCards.map((c) => (
              <option key={c.id} value={c.id}>{c.card_name} ({c.brand})</option>
            ))}
          </select>
          {form.credit_card_id && (() => {
            const card = creditCards.find(c => c.id === form.credit_card_id);
            if (!card) return null;
            return <div style={{ fontSize: 12, color: "#81B29A", marginTop: 4, fontWeight: 500 }}>
              Cierre día {card.closing_day} · Vto día {card.due_day}
            </div>;
          })()}
        </>
      )}

      <div style={{ marginTop: 24 }}>
        <button onClick={handleSubmit} disabled={saving} style={{ ...btnPrimary, opacity: saving ? .6 : 1 }}>
          {saving ? "Guardando..." : expense ? "Guardar cambios" : "Agregar gasto"}
        </button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════
// MAIN EXPENSES VIEW
// ═══════════════════════════════════════

function ExpensesView() {
  const { user } = useApp();
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filterCat, setFilterCat] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [year, month] = currentMonth.split("-").map(Number);

  const catMap = useMemo(() => Object.fromEntries(categories.map(c => [c.id, c])), [categories]);
  const pmMap = useMemo(() => Object.fromEntries(paymentMethods.map(p => [p.id, p])), [paymentMethods]);
  const ccMap = useMemo(() => Object.fromEntries(creditCards.map(c => [c.id, c])), [creditCards]);

  const loadAll = useCallback(async () => {
    try {
      const [cats, pms, ccs, exps] = await Promise.all([
        api.getCategories(), api.getPaymentMethods(), api.getCreditCards(),
        api.getExpenses({ month: currentMonth }),
      ]);
      setCategories(cats); setPaymentMethods(pms); setCreditCards(ccs); setExpenses(exps);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [currentMonth]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSave = async (data) => {
    if (data.id) await api.updateExpense(data.id, data);
    else await api.addExpense(data);
    setShowForm(false); setEditingExpense(null); loadAll();
  };

  const handleDelete = async (id) => {
    await api.deleteExpense(id);
    setConfirm(null);
    loadAll();
  };

  const filtered = useMemo(() =>
    filterCat ? expenses.filter(e => e.category_id === filterCat) : expenses
  , [expenses, filterCat]);

  const totalMonth = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const prevMonth = () => { const d = new Date(year, month - 2, 1); setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };
  const nextMonth = () => { const d = new Date(year, month, 1); setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`); };

  // Category breakdown
  const breakdown = useMemo(() => {
    const totals = {};
    filtered.forEach(e => { totals[e.category_id] = (totals[e.category_id] || 0) + e.amount; });
    return Object.entries(totals).map(([cat, total]) => ({ cat, total })).sort((a, b) => b.total - a.total);
  }, [filtered]);
  const maxBreakdown = Math.max(...breakdown.map(b => b.total), 1);

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: COLORS.muted }}>Cargando...</div>;

  return (
    <>
      {/* Header */}
      <div style={{ padding: "16px 20px 24px", background: COLORS.dark, borderRadius: "0 0 28px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={prevMonth} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#fff", fontSize: 20, width: 34, height: 34, borderRadius: 10, cursor: "pointer" }}>‹</button>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{MONTHS[month - 1]}</div>
            <div style={{ fontSize: 12, color: "#666" }}>{year}</div>
          </div>
          <button onClick={nextMonth} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#fff", fontSize: 20, width: 34, height: 34, borderRadius: 10, cursor: "pointer" }}>›</button>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: "#fff", letterSpacing: -2, lineHeight: 1 }}>{formatCurrency(totalMonth)}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>{filtered.length} gasto{filtered.length !== 1 ? "s" : ""} este mes</div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 100px" }}>
        {/* Card totals */}
        <CardTotals currentMonth={currentMonth} />

        {/* Category filter */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16, scrollbarWidth: "none" }}>
          <Pill label="Todas" selected={!filterCat} onClick={() => setFilterCat(null)} />
          {categories.map(c => (
            <Pill key={c.id} label={c.label} icon={c.icon} color={c.color}
              selected={filterCat === c.id} onClick={() => setFilterCat(filterCat === c.id ? null : c.id)} />
          ))}
        </div>

        {/* Category breakdown */}
        {breakdown.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h3 style={sectionTitle}>Por categoría</h3>
            {breakdown.map(({ cat, total }) => {
              const c = catMap[cat] || { icon: "📦", label: cat, color: "#999" };
              return (
                <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{c.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{formatCurrency(total)}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "#f0f0eb" }}>
                      <div style={{ height: "100%", borderRadius: 3, background: c.color, width: `${(total / maxBreakdown) * 100}%`, transition: "width .4s" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Expense list */}
        <h3 style={sectionTitle}>Detalle</h3>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#ccc" }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: 14 }}>Sin gastos este mes</div>
          </div>
        ) : filtered.map((e) => {
          const c = catMap[e.category_id] || { icon: "📦", label: "?", color: "#999" };
          const pm = pmMap[e.payment_method_id];
          const cc = ccMap[e.credit_card_id];
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee" }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${c.color}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.description}</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 1 }}>
                  {c.label} · {new Date(e.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                  {pm && ` · ${pm.type === "cash" ? "💵" : "💳"}`}
                  {cc && ` ${cc.card_name}`}
                  {e.billing_month && e.billing_month !== currentMonth && <span style={{ color: "#E07A5F" }}> → Cierre {e.billing_month}</span>}
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>{formatCurrency(e.amount)}</div>
              <button onClick={() => { setEditingExpense(e); setShowForm(true); }} style={iconBtnStyle}>✏️</button>
              <button onClick={() => setConfirm(e.id)} style={iconBtnStyle}>🗑️</button>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => { setEditingExpense(null); setShowForm(true); }} style={{
        position: "fixed", bottom: 80, right: 24, width: 54, height: 54, borderRadius: 16,
        background: COLORS.dark, color: "#fff", border: "none", fontSize: 26, cursor: "pointer",
        boxShadow: "0 4px 20px rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50,
      }}>+</button>

      {showForm && (
        <ExpenseForm expense={editingExpense} categories={categories} paymentMethods={paymentMethods} creditCards={creditCards}
          onSave={handleSave} onCancel={() => { setShowForm(false); setEditingExpense(null); }} />
      )}
      {confirm && <ConfirmDialog message="¿Eliminar este gasto?" onConfirm={() => handleDelete(confirm)} onCancel={() => setConfirm(null)} />}
    </>
  );
}

// ═══════════════════════════════════════
// SETTINGS VIEW
// ═══════════════════════════════════════

function SettingsView() {
  const { user } = useApp();
  const [tab, setTab] = useState("categories");

  const tabs = [
    { id: "categories", label: "Categorías", icon: "🏷️" },
    { id: "payment_methods", label: "Medios", icon: "💵" },
    { id: "credit_cards", label: "Tarjetas", icon: "💳" },
  ];
  if (user.role === "admin") tabs.push({ id: "users", label: "Usuarios", icon: "👥" });

  return (
    <div style={{ padding: "20px 20px 100px" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Configuración</h2>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      {tab === "categories" && <CategoriesABM />}
      {tab === "payment_methods" && <PaymentMethodsABM />}
      {tab === "credit_cards" && <CreditCardsABM />}
      {tab === "users" && user.role === "admin" && <AdminUsers />}
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [view, setView] = useState("expenses");

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { setToken(null); setStoredUser(null); setUser(null); };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const navItems = [
    { id: "expenses", icon: "💰", label: "Gastos" },
    { id: "settings", icon: "⚙️", label: "Config" },
  ];

  return (
    <AppContext.Provider value={{ user }}>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: COLORS.bg, fontFamily, color: COLORS.dark }}>
        <style>{globalCSS}</style>

        {/* Top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", background: COLORS.dark }}>
          <div>
            <span style={{ fontSize: 13, color: "#888" }}>Hola, </span>
            <span style={{ fontSize: 14, color: "#fff", fontWeight: 600 }}>{user.display_name}</span>
            {user.role === "admin" && <span style={{ fontSize: 10, color: "#7209B7", marginLeft: 6, fontWeight: 600 }}>ADMIN</span>}
          </div>
          <button onClick={handleLogout} style={{ background: "rgba(255,255,255,.08)", border: "none", color: "#888", fontSize: 12, padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontFamily }}>
            Salir
          </button>
        </div>

        {/* Content */}
        {view === "expenses" && <ExpensesView />}
        {view === "settings" && <SettingsView />}

        {/* Bottom nav */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 480, background: "#fff",
          borderTop: `1px solid ${COLORS.border}`, display: "flex",
          paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setView(n.id)} style={{
              flex: 1, padding: "10px 0 8px", border: "none", background: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              color: view === n.id ? COLORS.dark : COLORS.muted,
              fontWeight: view === n.id ? 600 : 400,
              fontSize: 10, cursor: "pointer", fontFamily,
            }}>
              <span style={{ fontSize: 20 }}>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </div>
      </div>
    </AppContext.Provider>
  );
}
