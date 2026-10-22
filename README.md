# BugTrack — Gestor de incidencias

[![CI](https://github.com/MalejandraR/bugtrack-issue-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/MalejandraR/bugtrack-issue-manager/actions/workflows/ci.yml)

> **BugTrack** — un gestor de issues minimalista y completo de punta a punta:
> React + Spring Boot + PostgreSQL, con pruebas reales y CI.

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
- Tema claro/oscuro automático (`prefers-color-scheme`), accesibilidad
  (labels reales, `role="alert"`, foco gestionado en el drawer).

## Qué NO incluye (a propósito)

- **Autenticación / autorización** — la API está abierta (MVP de portafolio).
- **Usuarios, proyectos, comentarios, asignación** — una sola entidad: `issues`.
- **Paginación** — el listado devuelve todo.
- **Deploy** — corre local y en CI; no hay entorno publicado.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 8, React Router 7, CSS3 con design tokens (sin librerías de UI) |
| Backend | Spring Boot 3.3.5 (Web, Data JPA, Validation), Java 21, Maven |
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
cp .env.example .env       # completá BUGTRACK_DB_PASSWORD (y puerto si difiere)
./run-local.sh             # arranca en http://localhost:8080
#   (run-local.sh agrega Maven al PATH si hace falta y carga .env)

# 4. Frontend (en otra terminal, desde frontend/)
cd frontend
npm install
npm run dev                # http://localhost:5173
```

Verificación rápida:

```bash
curl http://localhost:8080/api/health   # {"status":"UP"}
```

## Cómo ejecutar las pruebas

**Backend** (unitarias + integración — 38 tests contra PostgreSQL real):

```bash
cd backend
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH"   # si mvn no está en el PATH
mvn test
```

Las integraciones usan la base `bugtrack_test` (creala una vez) con valores por
default locales; en CI se sobreescriben por env vars.

**E2E con Cypress** (13 specs — necesitan backend :8080 y frontend :5173 corriendo):

```bash
# terminal 1                    # terminal 2
cd backend && ./run-local.sh    cd frontend && npm run dev

# terminal 3
cd frontend
npx cypress open          # interactivo   — o —
npx cypress run           # headless
```

Detalle de los 51 casos y sus resultados: [docs/test-plan.md](docs/test-plan.md).

## API

Referencia completa (7 endpoints, enums, códigos de error con ejemplos):
**[docs/api.md](docs/api.md)**.

```bash
curl -X POST http://localhost:8080/api/issues \
  -H 'Content-Type: application/json' \
  -d '{"title":"Botón no responde","description":"Al hacer click no pasa nada","severity":"HIGH","priority":"URGENT"}'
```

## CI

El workflow `CI` (`.github/workflows/ci.yml`) corre en cada push y PR a `main`:

| Job | Qué prueba |
|---|---|
| `backend-tests` | `mvn test` (38 tests) contra un contenedor PostgreSQL 16 |
| `frontend-build` | `npm ci` + `npm run build` |
| `e2e` | Backend empaquetado + Vite dev + `cypress run` (13 specs), con su propio Postgres |

## Limitaciones conocidas

- Sin autenticación: cualquiera con acceso a la URL puede crear, editar o
  borrar incidencias.
- Usuario único implícito: no hay quién "sea dueño" de una incidencia.
- Sin paginación: con muchos issues, `GET /api/issues` crece sin límite.
- Los timestamps se muestran en **UTC** (el frontend los formatea sin
  conversión de zona horaria local).
- La app debe arrancarse desde `backend/` (la ruta `file:../database/schema.sql`
  es relativa al directorio de trabajo).

## Mejoras futuras

- Autenticación (JWT) y autorización por rol.
- Comentarios e historial de cambios por incidencia.
- Asignación a usuarios (`assignee`) con selector en el formulario.
- Paginación y ordenamiento server-side en el listado.
- Deploy (contenedor + base gestionada) y badge de cobertura.

## Licencia y autoría

Proyecto académico de **María Alejandra R.** — portafolio **ifelse**.
