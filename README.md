# BugTrack — Gestor de incidencias

[![CI](https://github.com/MalejandraR/bugtrack-issue-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/MalejandraR/bugtrack-issue-manager/actions/workflows/ci.yml)

> **BugTrack** — un gestor de issues minimalista y completo de punta a punta:
> React + Spring Boot + PostgreSQL, con pruebas reales y CI.
>
> 🌐 **En producción:** https://bugtrack-issue-manager.vercel.app
> ⚙️ API: https://bugtrack-backend-9jih.onrender.com/api

*(El badge de CI se activa en el primer push a `main` con el workflow
`.github/workflows/ci.yml`; hasta entonces muestra "no status".)*

## El problema que resuelve

Los equipos chicos necesitan anotar bugs, priorizarlos y ver en qué estado
están, sin configurar un Jira. BugTrack es ese registro: crear una incidencia,
clasificarla por severidad y prioridad, moverla por su ciclo de vida
(abierta → en progreso → cerrada) y filtrarla al instante. Todo en una SPA
rápida sobre una API REST limpia.

## Funcionalidades (MVP actual)

- **Dashboard** con contadores (total, abiertas, en progreso, cerradas) y
  reporte por severidad.
- **Listado de incidencias** con filtros por estado/prioridad/severidad
  (combinables con AND) y búsqueda libre en el cliente.
- **Crear / editar incidencias** con validación de campos en el backend
  (errores 400 mapeados a cada campo del formulario).
- **Ciclo de vida explícito**: el estado solo cambia por `PATCH /{id}/status`;
  toda incidencia nace `OPEN`.
- **Detalle en drawer** lateral con deep-link (`/issues/:id`).
- **Login con JWT** (Fase 7): las lecturas son públicas; crear, editar y cambiar
  estado exigen `Authorization: Bearer <token>` (ver
  [docs/api.md](docs/api.md#autenticación)). La UI oculta las acciones de
  escritura sin sesión y redirige a `/login`.
- Tema claro/oscuro automático (`prefers-color-scheme`), accesibilidad
  (labels reales, `role="alert"`, foco gestionado en el drawer).

## Qué NO incluye (a propósito)

- **Registro de usuarios** — cerrado a propósito: no existe
  `POST /api/auth/register`; el único admin se siembra al arrancar con
  `AUTH_ADMIN_EMAIL` / `AUTH_ADMIN_PASSWORD` (solo si la tabla está vacía).
- **Roles/permisos granulares, gestión de usuarios, refresh tokens** — hay un
  solo rol (`ROLE_USER`) y tokens de vida fija (`AUTH_JWT_EXPIRY_HOURS`).
- **Proyectos, comentarios, asignación** — una sola entidad: `issues`.
- **Paginación** — el listado devuelve todo.
- **Deploy** — corre local y en CI; no hay entorno publicado.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7, CSS3 con design tokens (sin librerías de UI) |
| Backend | Spring Boot 3.3.5 (Web, Data JPA, Validation, Security), Java 21, Maven, JJWT 0.12.6 |
| Base de datos | PostgreSQL 16 |
| Tests | JUnit 5 + Mockito, `@SpringBootTest`, Cypress 16 |
| CI | GitHub Actions (`.github/workflows/ci.yml`) |

## Arquitectura (resumen)

Backend en capas estrictas: `controller → service → repository → PostgreSQL`,
con DTOs separados de las entities, manejo de errores centralizado y
`schema.sql` como única fuente de verdad del esquema (`ddl-auto: validate`).

```
React SPA (:5173)
      │  HTTP JSON
      ▼
Controller ──► Service ──► Repository ──► PostgreSQL
      │            │
      ▼            ▼
  DTOs        Specifications (filtros AND)
      │
      ▼
GlobalExceptionHandler ──► ApiError (400/404/405/415/500)
```

La versión completa, con el porqué de cada decisión, está en
**[docs/architecture.md](docs/architecture.md)**.

## Requisitos previos

- **Java 21** (JDK) — `java -version`
- **Maven 3.9.x** — `mvn -v`
- **Node.js 20+** (probado con 24; CI usa 24) — `node -v`
- **PostgreSQL 16**

> **⚠️ Nota sobre puertos (configuración específica de esta máquina):** en el
> equipo de desarrollo local, PostgreSQL corre en el puerto **5436** porque
> 5432–5435 están ocupados por instalaciones legadas. Por eso
> `application.yml` usa `jdbc:postgresql://127.0.0.1:5436/bugtrack` como
> default. **En tu máquina (o en CI) el puerto puede ser el 5432 estándar**:
> no hardcodees nada — todo se configura por variables de entorno
> (`BUGTRACK_DB_URL`, `BUGTRACK_DB_USERNAME`, `BUGTRACK_DB_PASSWORD`), como
> se ve en `.github/workflows/ci.yml`.

## Instalación paso a paso

```bash
# 1. Clonar
git clone https://github.com/MalejandraR/bugtrack-issue-manager.git
cd bugtrack-issue-manager

# 2. Base de datos (una sola vez)
createdb bugtrack          # o con tu administrador de Postgres favorito

# 3. Backend (desde backend/)
cd backend
cp .env.example .env       # completá BUGTRACK_DB_PASSWORD, AUTH_JWT_SECRET (>=32
#                           # bytes: openssl rand -base64 48) y el admin AUTH_ADMIN_*
./run-local.sh             # arranca en http://localhost:8080
#   (run-local.sh agrega Maven al PATH si hace falta y carga .env)
#   El admin se siembra UNA sola vez, al primer arranque con la tabla users vacía.

# 4. Frontend (en otra terminal, desde frontend/)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Verificación rápida:

```bash
curl http://localhost:8080/api/health   # {"status":"UP"}

# Login + una escritura autenticada (reemplazá email/password con tus AUTH_ADMIN_*):
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"tu-password"}' | \
  sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
curl -X POST http://localhost:8080/api/issues \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Prueba","description":"Con token","severity":"LOW","priority":"LOW"}'
```

## Cómo ejecutar las pruebas

**Backend** (unitarias + integración — 68 tests contra PostgreSQL real):

```bash
cd backend
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH"   # si mvn no está en el PATH
mvn test
```

Las integraciones usan la base `bugtrack_test` (creala una vez) con valores por
default locales; en CI se sobreescriben por env vars.

**E2E con Cypress** (4 specs / 20 tests — necesitan backend :8080 y frontend
:5173 corriendo **con las credenciales del admin e2e**):

```bash
# terminal 1 (exportá las mismas AUTH_* que cypress.config.js espera)
cd backend
export AUTH_JWT_SECRET='...' AUTH_ADMIN_EMAIL=admin@bugtrack.local \
  AUTH_ADMIN_PASSWORD='Bugtrack-E2E-2026!'
./run-local.sh
# terminal 2
cd frontend && npm run dev

# terminal 3
cd frontend
npx cypress open          # interactivo   — o —
npx cypress run           # headless
```

Detalle de los 51 casos y sus resultados: [docs/test-plan.md](docs/test-plan.md).

## API

Referencia completa (9 endpoints, enums, autenticación, códigos de error con
ejemplos): **[docs/api.md](docs/api.md)**.

```bash
# Escrituras necesitan Bearer token (los GET son públicos):
curl -X POST http://localhost:8080/api/issues \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Botón no responde","description":"Al hacer click no pasa nada","severity":"HIGH","priority":"URGENT"}'
```

## CI

El workflow `CI` (`.github/workflows/ci.yml`) corre en cada push y PR a `main`:

| Job | Qué prueba |
|---|---|
| `backend-tests` | `mvn test` (68 tests) contra un contenedor PostgreSQL 16 |
| `frontend-build` | `npm ci` + `npm run build` |
| `e2e` | Backend empaquetado (con `AUTH_*` para sembrar el admin e2e) + Vite dev + `cypress run` (4 specs / 20 tests), con su propio Postgres |
| `backend-image` | `docker build` de la imagen multi-stage (valida el Dockerfile que usa Render) |

## Limitaciones conocidas

- Un solo usuario sembrado (admin) y un solo rol: no hay gestión de usuarios
  ni permisos por incidencia (`assignee` sigue sin existir).
- JWT de vida fija: sin refresh token — al vencer, la sesión del SPA se limpia y
  toca volver a `/login`.
- Registro cerrado: dar de alta a otra persona hoy es manual (insertar hash
  BCrypt en la tabla `users`).
- Sin paginación: con muchos issues, `GET /api/issues` crece sin límite.
- Los timestamps se muestran en **UTC** (el frontend los formatea sin
  conversión de zona horaria local).
- La app debe arrancarse desde `backend/` (la ruta `file:../database/schema.sql`
  es relativa al directorio de trabajo).
- **Plan gratis en Render:** el backend se duerme tras ~15 minutos sin tráfico;
  la primera petición tarda ~30-90 s en despertarlo. El frontend de Vercel no
  tiene este problema, pero una acción que toque la API después de un rato
  inactivo puede parecer lenta la primera vez.

## Mejoras futuras

- Registro/invitación de usuarios y roles (hoy: admin único sembrado).
- Refresh token / rotación de sesión y gestión de usuarios desde la UI.
- Comentarios e historial de cambios por incidencia.
- Asignación a usuarios (`assignee`) con selector en el formulario.
- Paginación y ordenamiento server-side en el listado.

## Licencia y autoría

Proyecto académico de **María Alejandra R.** — portafolio **ifelse**.
