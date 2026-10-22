# API — BugTrack

Referencia completa de la REST API. Arquitectura y decisiones de diseño:
[`architecture.md`](./architecture.md).

## Quick path

1. Base URL local: `http://localhost:8080/api`.
2. Health check: `GET /api/health` → `{"status":"UP"}`.
3. Recurso principal: `/issues` (tabla de endpoints abajo).

## Convenciones generales

| Tema | Detalle |
|---|---|
| Formato | JSON (`Content-Type: application/json`). Otros content types → **415**. |
| Auth | **Ninguna.** Es un MVP de portafolio: no hay tokens, sesiones ni usuarios. Cualquier cliente puede leer y escribir. |
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
| **415** | Content-Type distinto de `application/json` | `Content-Type must be application/json` |
| **500** | Error inesperado no contemplado | `An unexpected error occurred` (sin internals) |

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

## Endpoints

### `GET /api/health`

Health check del servicio. No toca la base.

**Params:** ninguno.

**200:**

```json
{ "status": "UP" }
```

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

### `POST /api/issues`

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

**Errores:** **400** con `fieldErrors`, **405**, **415**. Ejemplo real de 400:

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

### `PUT /api/issues/{id}`

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

**Errores:** **400** (validación), **404** (id inexistente), **405**, **415**.

---

### `PATCH /api/issues/{id}/status`

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

**Errores:** **400** (`status must not be null` o enum inválido), **404**,
**405**, **415**.

---

### `DELETE /api/issues/{id}`

Elimina un issue.

**Por qué existe (sin UI asociada):** permite limpiar datos de prueba entre
corridas de los tests E2E, para que sean reproducibles (cada ejecución parte de
un estado conocido). Es un endpoint solo-de-API, expuesto para testing y
operación manual.

**Path params:** `id`.

**204 No Content** — cuerpo vacío.

**Errores:** **404** si el id no existe (`{"status":404,"message":"Issue 999999 not found"}`),
**400** si el id no es numérico, **405**, **415**.

---

## Cheat sheet

| Método | Ruta | Éxito | Errores principales |
|---|---|---|---|
| GET | `/api/health` | 200 | — |
| GET | `/api/issues` | 200 (array) | 400 (filtro inválido), 405, 415 |
| GET | `/api/issues/{id}` | 200 | 404, 400, 405, 415 |
| POST | `/api/issues` | **201** + `Location` | 400 (validación), 405, 415 |
| PUT | `/api/issues/{id}` | 200 | 400, 404, 405, 415 |
| PATCH | `/api/issues/{id}/status` | 200 | 400, 404, 405, 415 |
| DELETE | `/api/issues/{id}` | **204** | 404, 400, 405, 415 |
