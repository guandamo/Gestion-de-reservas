# Despliegue en Render

Documento operacional para que vos o quien opere el servicio pueda replicar el
despliegue paso a paso, **a mano desde el Dashboard de Render**.

> **La configuración vive únicamente en el Dashboard.** Este documento es la
> referencia de qué tiene que haber en cada servicio. No hay un `render.yaml` en
> el repo a propósito: si lo hubiera y alguien lo aplicara con "New Blueprint
> Instance", Render crearía servicios nuevos con nombres y dominios que no son
> los reales, y con `CORS_ORIGINS` / `FRONTEND_URL` apuntando a un dominio que
> no existe. Si algún día se quiere versionar la config, primero hay que
> corregir los nombres de servicio y las URLs para que coincidan con los
> desplegados.

> Antes de tocar Render, asegurate de haber commiteado y pusheado los cambios
> de la rama `fix/pagos-reservas-produccion` hacia `origin`. Render arma la
> imagen desde la rama configurada — si no hay nada nuevo, deploya lo viejo.

---

## 1. Resumen de la arquitectura

| Servicio | Tipo | Raíz | Build | Arranque | Health Check |
|---|---|---|---|---|---|
| API (backend) | Web Service (Node) | `backend/` | `npm ci` | `npm start` | `/health` |
| Web (frontend) | Static Site | raíz | `npm ci && npm run build` | — | — |

Variables y claves necesarias abajo. Las que tienen valor `=` son de muestra;
**los secretos reales los pegás vos desde el Dashboard.**

> **Orden recomendado:** crear primero el Web Service (para tener su URL
> pública), después el Static Site (para tener la suya), y recién entonces
> terminar de pegar `CORS_ORIGINS`, `FRONTEND_URL`, `MP_NOTIFICATION_URL` y
> `VITE_API_URL`. Cada cambio fuerza un redeploy.

---

## 2. Web Service — `gestion-de-reservas-api`

### 2.1 Creación

- "New" → "Web Service" → conectar repo `guandamo/Gestion-de-reservas`.
- Rama: la que corresponda (típicamente `dev` para el deploy productivo).
- **Root Directory:** `backend`.
- **Runtime:** Node.
- **Build Command:** `npm ci` (la `postinstall` corre `prisma generate`).
- **Start Command:** `npm start`.
- **Plan:** el que prefieras. **Free** está bien para empezar, con el límite
  ya conocido de que el barrido de expiraciones no corre mientras el servicio
  duerme (ver §6).

### 2.2 Variables de entorno

Pegar **a mano** desde el Dashboard (no commitear valores):

| Variable | Valor (referencia) | Notas |
|---|---|---|
| `NODE_ENV` | `production` | silencia `morgan` |
| `JWT_SECRET` | **clave aleatoria nueva** | `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. No reutilizar la de desarrollo. |
| `DATABASE_URL` | `postgresql://postgres.<REF>:<PASS>@aws-0-<REGION>.pooler.supabase.com:5432/postgres` | SESSION-MODE puerto 5432. NO uses transaction-mode (6543) con Prisma 7 + adapter-pg. |
| `DIRECT_URL` | igual que `DATABASE_URL` | sirve como conexión directa |
| `CORS_ORIGINS` | `https://gestion-de-reservas.onrender.com` | después del deploy del Static Site |
| `FRONTEND_URL` | `https://gestion-de-reservas.onrender.com` | se usa para derivar `back_urls` de MP |
| `MP_ACCESS_TOKEN` | `APP_USR-…` (Sandbox) o `APP-…` (prod) | panel de MP → Developers → Credentials |
| `MP_COLLECTOR_ID` | numérico | del mismo panel |
| `MP_NOTIFICATION_URL` | `https://gestion-de-reservas-api.onrender.com/api/payments/webhook` | URL pública del Web Service. NO usar `localhost`. |
| `MP_RETURN_URL_SUCCESS` | (opcional) vacío; se deriva de `FRONTEND_URL` + `/pago/exito` | la pantalla de retorno valida contra la API y termina en `/user/reservar` |
| `MP_RETURN_URL_PENDING` | (opcional) derivado de `FRONTEND_URL` + `/pago/pendiente` | |
| `MP_RETURN_URL_FAILURE` | (opcional) derivado de `FRONTEND_URL` + `/pago/fallo` | |
| `RESERVATION_EXPIRATION_MS` | `180000` | 3 min, ya está bien por defecto |
| `RESERVATION_SWEEP_INTERVAL_MS` | `30000` | cada 30 s, ya está bien por defecto |

> **Las `back_urls` de Mercado Pago tienen que ser HTTPS.** MP las descarta
> en silencio si no lo son: la preferencia se crea sin error pero con las tres
> URLs vacías, y el checkout no tiene forma de volver a la app. En Render esto
> no es problema —`FRONTEND_URL` ya es el HTTPS del Static Site— pero es la
> razón por la que el flujo de retorno **no se puede probar en local** con
> `FRONTEND_URL=http://localhost:5173`. Medido contra la API de MP Sandbox el
> 2026-10-21: `http://localhost` y `http://<host público>` se descartan igual;
> sólo `https://` se guarda. Para probarlo en local, túnel (ngrok/cloudflared)
> y esa URL https en `FRONTEND_URL`.
>
> La prueba que lo detecta es `backend/tests/flujo-retorno-mp.js`: relee de la
> API de MP lo que quedó guardado y falla con ese diagnóstico exacto.

> **NO** se necesitan estas variables obsoletas aunque aparezcan comentadas
> en algunas referencias: `RESEND_API_KEY`, `EMAIL_FROM`, `OTP_HASH_SECRET`,
> `MP_WEBHOOK_SECRET`, `JWT_EXPIRES_IN`. El código no las lee.

### 2.3 Health Check

- Path: `/health` (lo define `backend/src/server.js:49`).
- Render lo pega solo. Si lo dejas vacío, Render usa `/` y puede fallar.

### 2.4 Comando post-deploy: aplicar migraciones

**Decisión importante:** NO uses `prisma migrate dev` en el deploy productivo
(siempre es interactivo y puede pedir confirmaciones). En cambio:

```bash
cd backend && npx prisma migrate deploy
```

Aplicar **una vez** contra la BD de producción desde tu máquina local antes
del primer deploy, o bien agregalo a un "Postgres Migration Job" en Render si
lo tenés habilitado. La migración incluida es
`backend/prisma/migrations/20261020120000_add_reserva_vencimiento/`.

---

## 3. Static Site — `gestion-de-reservas-web`

### 3.1 Creación

- "New" → "Static Site" → conectar repo.
- Rama: la misma que el Web Service.
- **Root Directory:** raíz del repo (no `backend/`).
- **Build Command:** `npm ci && npm run build`.
- **Publish Directory:** `dist`.

### 3.2 Variable de entorno de build

Esto define la URL que se incrusta en el bundle Vite. **Si la cambiás, hay
que rebuildear.**

| Variable | Valor |
|---|---|
| `VITE_API_URL` | `https://gestion-de-reservas-api.onrender.com/api` |

### 3.3 Rewrite del SPA (CRÍTICO)

Sin esto, `/pago/exito`, `/user/reservar`, etc. devuelven 404 al recargar o
entrar por URL directa (porque la app usa `BrowserRouter`).

- En el Static Site → "Redirects/Rewrites":
  - **Source:** `/*`
  - **Destination:** `/index.html`
  - **Type:** Rewrite (no Redirect).

---

## 4. Configuración de Mercado Pago

### 4.1 URLs de retorno

Las `back_urls` se derivan automáticamente de `FRONTEND_URL`. No hace falta
sobreescribirlas salvo que quieras rutas distintas.

### 4.2 URL del webhook

`MP_NOTIFICATION_URL=https://gestion-de-reservas-api.onrender.com/api/payments/webhook`

Esta URL **debe ser alcanzable desde los servidores de MP**. Con el dominio
de Render lo es. **No** sirve con `localhost` ni con IP privada.

Si el webhook no está accesible, el flujo **igual funciona** porque la
pantalla de retorno consulta `/api/payments/estado` y confirma el pago
contra la API de MP. La diferencia es que la confirmación no es instantánea,
solo ocurre cuando el usuario vuelve a la app.

### 4.3 Sandbox vs Producción

- **Sandbox:** usuarios de prueba con tarjetas precargadas. No cobra de
  verdad. URL del panel: `https://www.mercadopago.com.ar/developers/panel/`.
- **Producción:** requiere `MP_ACCESS_TOKEN` real y homologación de la cuenta.

Para el primer deploy quedate en Sandbox. Migrar a producción es solo cambiar
el token; el código no diferencia.

---

## 5. Smoke tests contra el deploy

Después del primer deploy, ejecutar `backend/tests/smoke.js` apuntando al
servicio real:

```bash
API_BASE=https://gestion-de-reservas-api.onrender.com node tests/smoke.js
```

Pasa si: 32/32 aserciones verdes (auth, autorización, register, login).

El sweep (expiración) necesita conexión directa a la BD; correr localmente
contra la misma base de producción con `DATABASE_URL` apuntando a Supabase:

```bash
cd backend && node tests/sweep.js
```

---

## 6. Limitaciones conocidas

### 6.1 Plan Free de Render

Si elegís el plan gratuito, el servicio se suspende tras 15 min sin tráfico.
**Mientras está suspendido**, el barrido periódico (`setInterval`) **no
corre**, así que las reservas no expiran hasta que entre un nuevo request.

Mitigaciones posibles (no implementadas en esta primera entrega):

1. **Lazy expiry:** chequear `vencimientoAt` en cada `GET /api/turnos` o
   `POST /api/reservations` antes de devolver la disponibilidad. Funciona
   aunque el servicio duerma.
2. **Cron externo:** un cron-job.org o similar pegándole a un endpoint que
   dispare el sweep. El proceso dormido igual se despierta si recibe request.

### 6.2 Validación del webhook

El webhook **no se firma**: se confía en el `collector_id` que devuelve la
API al consultar el pago. Si querés agregar validación HMAC, leer
`MP_WEBHOOK_SECRET` y verificar la firma del header con la fórmula documentada
por MP para tu país.

---

## 7. Rollback

Si después del deploy algo se rompe:

1. Render → Web Service → "Manual Deploy" → elegir un commit anterior.
2. Si la BD tiene la columna `vencimientoAt` aplicada y querés volver a una
   versión sin código nuevo, **no generar migraciones nuevas que la
   eliminen** sin avisar: Prisma fallaría. Lo correcto es un commit que
   ignore la columna.

---

## 8. Próximos pasos sugeridos (no incluidos en esta entrega)

- Rate limiting en `/api/auth/login` y `/api/auth/register`
  (`express-rate-limit`). Crítico para producción.
- Verificación de email (el flujo actual crea la cuenta directo; sin paso
  intermedio).
- Lazy expiry si vas a quedar en Plan Free (ver §6.1).
- HTTPS forzado y cabeceras extra (helmet ya está activo, pero se puede
  endurecer).
- Logging estructurado (Pino o similar) en lugar de `console.log`.
