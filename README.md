# 🏟️ Gestión de Reservas de Canchas

Sistema para administrar canchas, usuarios, turnos y pagos con:

- **Frontend:** React 19 + React Router 7 + TailwindCSS 3 (Vite)
- **Backend:** Node.js + Express 5 + Prisma 7 + PostgreSQL (Supabase)
- **Auth:** JWT + bcrypt
- **Auditoría:** nivel 1 (campos en entidades) + nivel 2 (`AuditLog` global)

> **Etapa actual:** autenticación, autorización, administración de usuarios / canchas / tipos / precios, reportes y auditoría. El flujo de reservas de cliente y la integración con Mercado Pago viven en otra rama.

---

## 📁 Estructura

```
.
├── src/                       # Frontend (Vite + React)
│   ├── api/client.js          # Cliente HTTP centralizado (fetch + JWT)
│   ├── context/AuthContext.jsx
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Calendario.jsx     # (mock — pertenece a otra rama)
│   │   └── ProtectedRoute.jsx
│   ├── layouts/
│   │   ├── AdminLayout.jsx
│   │   └── UserLayout.jsx     # (otra rama)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Usuarios.jsx
│   │   ├── CanchasYPrecios.jsx
│   │   ├── Reportes.jsx
│   │   └── UserDashboard.jsx  # (otra rama)
│   ├── App.jsx
│   └── main.jsx
└── backend/
    ├── prisma/
    │   ├── schema.prisma      # Modelo de datos
    │   ├── migrations/        # Historial de migraciones
    │   └── seed.js            # Crea admin inicial (idempotente)
    └── src/
        ├── server.js          # Entry point Express
        ├── config/prisma.js
        ├── middlewares/       # authenticate, authorize, errorHandler
        ├── routes/            # auth, users, courts, court-types, reports, audit
        ├── controllers/
        ├── services/          # altaUsuario, loginUsuario, crearCancha, ...
        └── services/audit/    # createAuditLog
```

---

## ⚙️ Configuración inicial

### 1. Variables de entorno

#### Frontend (`/.env`)

```env
VITE_API_URL=http://localhost:4000/api
```

#### Backend (`/backend/.env`)

```env
PORT=4000
NODE_ENV=development

# Cadena de conexión de Supabase (Project Settings → Database → Connection string)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres

# JWT
JWT_SECRET=un-secreto-largo-y-aleatorio

# CORS
CORS_ORIGINS=http://localhost:5173
```

> ⚠️ Si usás el **pooler** de Supabase (recomendado para producción), `DATABASE_URL` apunta al pooler y `DIRECT_URL` apunta al host directo (para migraciones).

### 2. Instalar dependencias

```bash
# Frontend
npm install

# Backend
cd backend
npm install
```

### 3. Generar el cliente Prisma

```bash
cd backend
npm run prisma:generate
```

### 4. Aplicar migraciones (ya incluidas en el repo)

```bash
cd backend
npx prisma migrate deploy
```

Si la base ya tiene el esquema inicial (caso típico de este repo), Prisma detectará que no hay migraciones pendientes.

### 5. Crear usuario administrador inicial

```bash
cd backend
npm run seed
```

Crea un usuario admin (`admin@canchas.com` / `Admin1234`) **solo si no existe**.

---

## 🚀 Comandos

### Frontend

```bash
npm run dev       # vite (puerto 5173)
npm run build     # build producción
npm run preview   # preview del build
```

### Backend

```bash
cd backend
npm run dev       # nodemon (puerto 4000)
npm start         # node normal
npm run prisma:generate   # regenerar cliente Prisma
npm run prisma:migrate    # crear/devolver migración (dev)
npm run seed              # idempotente: crear admin inicial
```

---

## 🔐 Autenticación y autorización

- **Login:** `POST /api/auth/login` con `{ email, contrasena }`. Devuelve `{ token, usuario }`.
- **JWT:** incluye `idUsuario` y `rol`. Expiración configurable (`JWT_EXPIRES_IN`, default `1h`).
- **Middleware:**
  - `authenticate` valida el header `Authorization: Bearer <token>`.
  - `authorize("ADMIN")` rechaza con `403` si el rol no coincide.
- **Persistencia frontend:** token y usuario se guardan en `localStorage` (`gr_token`, `gr_user`).
- **Rutas protegidas:**
  - `/admin/*` requiere rol `ADMIN`
  - `/user` requiere rol `USUARIO`
  - Si no hay sesión, redirige a `/login` (preservando `from`).

---

## 📡 Endpoints

### Auth

| Método | Ruta              | Body                              | Auth |
|--------|-------------------|-----------------------------------|------|
| POST   | `/api/auth/login` | `{ email, contrasena }`           | no   |

### Usuarios (solo ADMIN)

| Método | Ruta                          | Descripción                  |
|--------|-------------------------------|------------------------------|
| GET    | `/api/users?rol=&buscar=`     | Listar (filtros opcionales)  |
| GET    | `/api/users/:id`              | Obtener uno                  |
| PATCH  | `/api/users/:id`              | Editar campos básicos        |
| PATCH  | `/api/users/:id/status`       | Suspender / reactivar        |

### Canchas y tipos

| Método | Ruta                          | Auth | Descripción |
|--------|-------------------------------|------|-------------|
| GET    | `/api/courts?incluirInactivos=`  | sí   | Listar |
| GET    | `/api/courts/:id`             | sí   | Obtener |
| POST   | `/api/courts`                 | ADMIN| Crear + genera turnos |
| PATCH  | `/api/courts/:id`             | ADMIN| Editar (incluye soft-delete con `activa:false`) |
| GET    | `/api/court-types`            | sí   | Listar tipos |
| POST   | `/api/court-types`            | ADMIN| Crear tipo |
| PATCH  | `/api/court-types/:id`        | ADMIN| Modificar descripción |

### Reportes (solo ADMIN)

| Método | Ruta                          | Descripción |
|--------|-------------------------------|-------------|
| GET    | `/api/reports?mes=YYYY-MM`    | Métricas (JSON) |
| GET    | `/api/reports/export?mes=...` | Descarga PDF |

Métricas devueltas: `reservasHoy`, `ocupacionHoy`, `ingresosMes`, `pagosMes`, `pagosPendientes`, `reservasEnMes`, `turnosHoy`, `turnosReservadosHoy`.

### Auditoría (solo ADMIN)

| Método | Ruta                                          | Descripción |
|--------|-----------------------------------------------|-------------|
| GET    | `/api/audit?entity=&entityId=&performedBy=&limit=&offset=` | Listado paginado |

---

## 🛡️ Auditoría

### Nivel 1 — entidades

Todas las entidades (`Usuario`, `Cancha`, `TipoCancha`) tienen:

- `createdAt` / `created_at` — fecha de creación
- `modifiedAt` / `modified_at` — fecha de última modificación (autoupdate)
- `operacion` / `ultimoCambio` — etiqueta de última operación (`ALTA`, `MODIFICACION`, `SUSPENSION`, `REACTIVACION`, …)
- `modificadoPor` — `id` del usuario que ejecutó la última operación

### Nivel 2 — historial global

Tabla `AuditLog` con:

```
id, entity, entityId, operation, performedBy, performedAt, oldValues, newValues
```

Cada cambio administrativo registra una fila con los valores anteriores y nuevos (sin contraseñas ni tokens).

### Servicio reutilizable

```js
import { createAuditLog } from "./services/audit/createAuditLog.js";

await prisma.$transaction(async (tx) => {
  const actualizado = await tx.cancha.update({ where: { id }, data });
  await createAuditLog({
    entity: "Cancha",
    entityId: id,
    operation: "MODIFICACION",
    performedBy: req.user.id,
    oldValues: previo,
    newValues: actualizado,
    tx,
  });
});
```

---

## 🗃️ Modelo de datos

| Tabla        | Propósito                                    |
|--------------|----------------------------------------------|
| `Usuario`    | Usuarios del sistema (ADMIN / USUARIO)       |
| `Cancha`     | Canchas físicas                              |
| `TipoCancha` | Tipos (Fútbol 5 / 7 / 11, etc.)              |
| `Turno`      | Franjas horarias concretas (30 días por defecto) |
| `Reserva`    | Reservas hechas por usuarios                 |
| `Pago`       | Pagos asociados a reservas                   |
| `AuditLog`   | Historial global de auditoría                |

---

## 🔐 Credenciales iniciales

Después de correr `npm run seed`:

```
email:    admin@canchas.com
password: Admin1234
```

---

## 📦 Stack completo

- React 19, React Router 7, Tailwind 3, Vite 8
- Express 5, Prisma 7, @prisma/adapter-pg, jsonwebtoken 9, bcrypt 6
- pdfkit (generación de PDF)
- helmet + cors + morgan (seguridad y logging)
- PostgreSQL 17 (Supabase)
