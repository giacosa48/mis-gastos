# 💰 Mis Gastos - Planilla de Gastos Mensuales

App web + móvil (PWA) para registrar y gestionar gastos mensuales por categoría.

## ✨ Features

- **CRUD completo**: Agregar, editar y eliminar gastos
- **Categorías personalizables**: 10 categorías predefinidas + crear nuevas
- **Vista mensual**: Navegar entre meses con resumen y desglose por categoría
- **Filtrado**: Filtrar gastos por categoría
- **PWA**: Se instala como app nativa en iOS y Android desde el navegador
- **Responsive**: Mobile-first, funciona perfecto en desktop también

## 🛠 Tech Stack

| Componente | Tecnología |
|-----------|------------|
| Frontend  | React 18 + Vite |
| Backend   | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| PWA       | vite-plugin-pwa |

## 🚀 Setup Local

```bash
# 1. Clonar el repo
git clone <tu-repo>
cd gastos-app

# 2. Instalar dependencias
npm run setup
# (esto instala root + client + server)

# 3. Correr en desarrollo
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## 📱 Instalar en iPhone (PWA)

1. Abrí la app en Safari
2. Tocá el ícono de compartir (⬆️)
3. Seleccioná "Agregar a pantalla de inicio"
4. ¡Listo! Se abre como app nativa

## 🌐 Deploy Gratuito

### Opción 1: Render.com (Recomendado - todo en uno)

1. Subí el proyecto a GitHub
2. Creá cuenta en [render.com](https://render.com)
3. New → Web Service → conectar tu repo
4. Configuración:
   - **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start Command**: `cd server && node index.js`
   - **Environment**: Node
5. Deploy automático ✅

> SQLite se guarda en el filesystem de Render. En el plan gratuito, el disco se resetea periódicamente.
> Para persistencia real, usar **Render con disco persistente** (plan pago) o migrar a Turso/PlanetScale.

### Opción 2: Railway.app

1. Conectar repo de GitHub
2. Railway detecta Node.js automáticamente
3. Configurar:
   - **Build**: `cd client && npm install && npm run build && cd ../server && npm install`
   - **Start**: `cd server && node index.js`

### Opción 3: Fly.io (con volumen persistente)

```bash
# Instalar flyctl
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Crear app
fly launch

# Crear volumen para SQLite
fly volumes create gastos_data --size 1

# Deploy
fly deploy
```

Agregar en `fly.toml`:
```toml
[mounts]
  source = "gastos_data"
  destination = "/data"
```

Y setear `DB_PATH=/data/gastos.db` como variable de entorno.

## 📁 Estructura

```
gastos-app/
├── client/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── api.js          # Cliente HTTP para la API
│   │   ├── App.jsx          # Componente principal
│   │   └── main.jsx         # Entry point
│   ├── index.html
│   ├── vite.config.js       # Config Vite + PWA
│   └── package.json
├── server/
│   ├── index.js             # API Express + SQLite
│   └── package.json
├── package.json              # Scripts raíz
└── README.md
```

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/categories` | Listar categorías |
| POST | `/api/categories` | Crear categoría |
| GET | `/api/expenses?month=2026-02&category=comida` | Listar gastos (con filtros) |
| GET | `/api/expenses/summary?month=2026-02` | Resumen del mes |
| POST | `/api/expenses` | Crear gasto |
| PUT | `/api/expenses/:id` | Editar gasto |
| DELETE | `/api/expenses/:id` | Eliminar gasto |

## 🔧 Variables de Entorno

| Variable | Default | Descripción |
|----------|---------|-------------|
| `PORT` | 3001 | Puerto del servidor |
| `DB_PATH` | `./gastos.db` | Ruta al archivo SQLite |
| `VITE_API_URL` | (vacío) | URL del backend (para deploy separado) |

## 📄 Licencia

MIT
