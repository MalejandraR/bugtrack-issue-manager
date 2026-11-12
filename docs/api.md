# API — BugTrack

Referencia completa de la REST API. Arquitectura y decisiones de diseño:
[`architecture.md`](./architecture.md).

## Quick path

1. Base URL local: `http://localhost:8080/api`.
2. Health check: `GET /api/health` → `{"status":"UP"}`.
3. Login (si necesitas escribir): `POST /api/auth/login` → Bearer token (ver
   [Autenticación](#autenticación)).
4. Recurso principal: `/issues` (tabla de endpoints abajo).

## Convenciones generales

| Tema | Detalle |
|---|---|
| Formato | JSON (`Content-Type: application/json`). Otros content types → **415**. |
| Auth | **JWT Bearer (HS256)** para escrituras. Lecturas (`GET /api/health`, `GET /api/issues`, `GET /api/issues/{id}`), `POST /api/auth/login` y assets estáticos son públicos. El resto de `/api/**` exige `Authorization: Bearer <token>` → si falta o es inválido: **401**. Sesiones stateless (sin cookies, sin CSRF). Ver [Autenticación](#autenticación). |
| Timestamps | `createdAt`/`updatedAt` se emiten en **UTC**, formato ISO-8601 con offset (`2026-10-21T21:28:44.512Z`). Los genera el backend, nunca el browser. |
| Orden del listado | `id` descendente (más reciente primero). |
| Filtros | `status`, `priority` y `severity` se combinan con **AND**. |

### Cuerpo de error (`ApiError`)

Todos los errores comparten este cuerpo (el campo `fieldErrors` solo aparece
cuando hay errores de validación):

```json
{
  "timestamp": "2026-10-21T21:28:44.512Z",
  "status": 400,
  "message": "Validation failed",
  "fieldErrors": {
    "title": "title must not be blank"
  }
}
```

| Código | Cuándo ocurre | `message` típico |
|---|---|---|
| **400** | Validación (Bean Validation), parámetro con valor inválido, o body malformado/desconocido | `Validation failed` (+ `fieldErrors`), `Invalid value for parameter 'status'`, `Malformed request body` |
| **404** | Id inexistente en `/issues/{id}` | `Issue 999999 not found` |
| **405** | Verbo HTTP no soportado en la ruta | `Method DELETE not supported for this endpoint` |
| **401** | Ruta protegida sin token, token ausente/inválido/expirado, o credenciales de login incorrectas | `Authentication required`, `Invalid or expired token`, `Invalid email or password` |
| **403** | Token válido pero sin permiso para la operación | `Access denied` |
| **415** | Content-Type distinto de `application/json` | `Content-Type must be application/json` |
| **500** | Error inesperado no contemplado | `An unexpected error occurred` (sin internals) |

> Los mensajes de **401** son deliberadamente genéricos en login: no distinguen
> "usuario inexistente" de "contraseña incorrecta" (evita enumeración de usuarios).

## Tablas de enums

| `severity` | Descripción |
|---|---|
| `LOW` | Menor |
| `MEDIUM` | Media |
| `HIGH` | Alta |
| `CRITICAL` | Crítica |

| `priority` | Descripción |
|---|---|
| `LOW` | Baja |
| `MEDIUM` | Media |
| `HIGH` | Alta |
| `URGENT` | Urgente |

| `status` | Descripción |
|---|---|
| `OPEN` | Abierta (estado inicial de todo issue nuevo) |
| `IN_PROGRESS` | En progreso |
| `CLOSED` | Cerrada |

> Los enums se validan **en dos capas**: Bean Validation responde 400 con un
> mensaje claro al cliente; los `CHECK` constraints de `schema.sql` garantizan lo
> mismo a nivel de base de datos.

## Autenticación

Fase 7: JWT stateless firmado con **HS256**. El backend escribe, el cliente solo
guarda y reenvía el token — no hay cookies ni sesiones de servidor.

### Flujo

1. `POST /api/auth/login` con `{ "email": ..., "password": ... }`.
2. Respuesta **200** con el token:

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresInHours": 24,
  "email": "admin@example.com"
}
```

3. Enviar el token en cada request protegido:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

4. `GET /api/auth/me` (con el header) devuelve `{"email":"..."}`; sin token → 401.

### Reglas

| Regla | Detalle |
|---|---|
| Algoritmo | HS256, secret en `AUTH_JWT_SECRET` (mínimo 32 bytes; si está vacío, arranque con secret efímero aleatorio + WARN) |
| Expiración | `AUTH_JWT_EXPIRY_HOURS` (default 24 h). Token vencido → 401 `Invalid or expired token` |
| Registro | **Cerrado a propósito.** No existe `POST /api/auth/register`. El admin se siembra una sola vez al arrancar (tabla vacía) desde `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` |
| Passwords | Hash **BCrypt** (cost por defecto). Nunca se guarda ni devuelve el password en claro |
| Headers CORS | Preflight `OPTIONS` respondido antes de exigir token (`Access-Control-Allow-Headers: authorization, content-type`) |

---

## Endpoints

### `GET /api/health`

Health check del servicio. No toca la base.

**Params:** ninguno.

**200:**

```json
{ "status": "UP" }
```

---

### `POST /api/auth/login` · **público**

Autentica y devuelve un JWT.

**Body:**

| Campo | Tipo | Reglas |
|---|---|---|
| `email` | string | Obligatorio, no blank |
| `password` | string | Obligatorio, no blank |

```json
{ "email": "admin@example.com", "password": "secreto" }
```

**200:** `{ "token": "...", "tokenType": "Bearer", "expiresInHours": 24, "email": "..." }`

**Errores:** **401** `{"status":401,"message":"Invalid email or password"}` —
igual para usuario inexistente y contraseña incorrecta (anti-enumeración),
**400** (campos blank), **405**, **415**.

---

### `GET /api/auth/me` · **requiere token**

Devuelve el email del usuario del token vigente.

**Headers:** `Authorization: Bearer <token>`.

**200:** `{ "email": "admin@example.com" }`

**Errores:** **401** (`Authentication required` o `Invalid or expired token`),
**405**.

---

### `GET /api/issues`

Lista issues, con filtros opcionales combinados con AND.

**Query params** (todos opcionales):

| Param | Tipo | Valores válidos | Efecto |
|---|---|---|---|
| `status` | enum | `OPEN` \| `IN_PROGRESS` \| `CLOSED` | Filtra por estado |
| `priority` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `URGENT` | Filtra por prioridad |
| `severity` | enum | `LOW` \| `MEDIUM` \| `HIGH` \| `CRITICAL` | Filtra por severidad |

**Ejemplo:** `GET /api/issues?status=OPEN&priority=URGENT`

**200:** array (posiblemente vacío), ordenado por `id` DESC.

```json
[
  {
    "id": 12,
    "title": "Botón no responde",
    "description": "Al hacer click en Guardar no pasa nada.",
    "severity": "HIGH",
    "priority": "URGENT",
    "status": "OPEN",
    "createdAt": "2026-10-21T18:02:11.483Z",
    "updatedAt": "2026-10-21T18:02:11.483Z"
  }
]
```

**Errores:** **400** si un filtro no es un valor del enum
(`{"status":400,"message":"Invalid value for parameter 'status'"}`), **405**,
**415**.

---

### `GET /api/issues/{id}`

Detalle de un issue.

**Path params:** `id` (Long, obligatorio).

**200:** mismo objeto de item que arriba.

**Errores:** **404** `{"status":404,"message":"Issue 999999 not found"}`,
**400** si el id no es numérico, **405**, **415**.

---

### `POST /api/issues` · **requiere token**

Crea un issue. **El estado nace siempre `OPEN`** — el campo `status` no se
acepta en el body a propósito: el ciclo de vida se cambia solo por el endpoint
dedicado `PATCH /{id}/status`.

**Body:**

| Campo | Tipo | Reglas |
|---|---|---|
| `title` | string | Obligatorio, no blank, máx. 200 caracteres |
| `description` | string | Obligatorio, no blank, máx. 5000 caracteres |
| `severity` | enum | Obligatorio (tabla de arriba) |
| `priority` | enum | Obligatorio (tabla de arriba) |

```json
{
  "title": "Botón no responde",
  "description": "Al hacer click en Guardar no pasa nada.",
  "severity": "HIGH",
  "priority": "URGENT"
}
```

**201 Created** + header `Location: http://localhost:8080/api/issues/13` y body
con el issue creado (`id` asignado, `status: "OPEN"`, timestamps calculados).

**Errores:** **401** (sin token o token inválido), **400** con `fieldErrors`, **405**, **415**. Ejemplo real de 400:

```json
{
  "timestamp": "2026-10-21T21:10:03.914Z",
  "status": 400,
  "message": "Validation failed",
  "fieldErrors": {
    "title": "title must not be blank",
    "severity": "severity must not be null"
  }
}
```

---

### `PUT /api/issues/{id}` · **requiere token**

Actualiza **título, descripción, severidad y prioridad**. El `status` y los
timestamps no se tocan vía este endpoint (usa `PATCH /{id}/status` para el
estado; `updatedAt` se recalcula solo).

**Path params:** `id`.

**Body:** idéntico a `POST` (mismas reglas de validación).

```json
{
  "title": "Botón Guardar no responde (corregido título)",
  "description": "Ocurre solo en Firefox.",
  "severity": "CRITICAL",
  "priority": "HIGH"
}
```

**200:** el issue actualizado.

**Errores:** **401** (sin token o token inválido), **400** (validación), **404** (id inexistente), **405**, **415**.

---

### `PATCH /api/issues/{id}/status` · **requiere token**

Cambia el estado de un issue. Endpoint dedicado: el estado no viaja en el
`PUT` para que la transición sea explícita.

**Path params:** `id`.

**Body:**

| Campo | Tipo | Reglas |
|---|---|---|
| `status` | enum | Obligatorio: `OPEN` \| `IN_PROGRESS` \| `CLOSED` |

```json
{ "status": "IN_PROGRESS" }
```

**200:** el issue con el estado nuevo.

**Errores:** **401** (sin token o token inválido), **400** (`status must not be null` o enum inválido), **404**,
**405**, **415**.

---

### `DELETE /api/issues/{id}` · **requiere token**

Elimina un issue.

**Por qué existe (sin UI asociada):** permite limpiar datos de prueba entre
corridas de los tests E2E, para que sean reproducibles (cada ejecución parte de
un estado conocido). Es un endpoint solo-de-API, expuesto para testing y
operación manual.

**Path params:** `id`.

**204 No Content** — cuerpo vacío.

**Errores:** **401** (sin token o token inválido), **404** si el id no existe (`{"status":404,"message":"Issue 999999 not found"}`),
**400** si el id no es numérico, **405**, **415**.

---

## Cheat sheet

| Método | Ruta | Auth | Éxito | Errores principales |
|---|---|---|---|---|
| GET | `/api/health` | pública | 200 | — |
| POST | `/api/auth/login` | pública | 200 + token | 401 (credenciales), 400, 405, 415 |
| GET | `/api/auth/me` | Bearer | 200 | 401, 405 |
| GET | `/api/issues` | pública | 200 (array) | 400 (filtro inválido), 405, 415 |
| GET | `/api/issues/{id}` | pública | 200 | 404, 400, 405, 415 |
| POST | `/api/issues` | Bearer | **201** + `Location` | 401, 400 (validación), 405, 415 |
| PUT | `/api/issues/{id}` | Bearer | 200 | 401, 400, 404, 405, 415 |
| PATCH | `/api/issues/{id}/status` | Bearer | 200 | 401, 400, 404, 405, 415 |
| DELETE | `/api/issues/{id}` | Bearer | **204** | 401, 404, 400, 405, 415 |
