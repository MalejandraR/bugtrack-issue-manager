# BugTrack Backend

Backend del gestor de issues **BugTrack**. Spring Boot 3.3.5 + Java 21 + PostgreSQL 16.

## Arquitectura por capas

```
controller → service → repository → PostgreSQL
   ↑              ↑
  DTOs         Specifications (filtros combinados)
```

- **`controller`** (`IssueController`, `HealthController`): expone la API REST. Nunca
  devuelve entidades, solo DTOs.
- **`service`** (`IssueService`): lógica de negocio (crear con `status = OPEN`, 404 si no
  existe, filtros combinados con AND).
- **`repository`** (`IssueRepository`): `JpaRepository` + `JpaSpecificationExecutor`.
- **`entity`** (`Issue`, `Severity`, `Priority`, `Status`): mapeo JPA. Los enums se
  guardan como TEXT y además están protegidos por CHECK constraints en SQL.
- **`dto`** (`IssueRequest`, `StatusUpdateRequest`, `IssueResponse`): contratos de entrada
  y salida, con validación (Bean Validation) en la entrada.
- **`exception`**: `GlobalExceptionHandler` centraliza los errores → 400 (validación),
  404 (no encontrado), 500 genérico sin filtrar internals.
- **`config/WebConfig`**: CORS para el dev server de Vite (`http://localhost:5173`).

## Esquema: una sola fuente de verdad

El esquema vive en **`database/schema.sql`** (`CREATE TABLE IF NOT EXISTS issues ...`).
Spring lo ejecuta al arrancar (`spring.sql.init.schema-locations`) y JPA solo lo
**valida** (`ddl-auto: validate`, nunca `update`/`create`). Si cambiás el esquema,
también hay que ajustar la entidad, o el arranque falla a propósito.

> **Importante:** la app debe ejecutarse desde `backend/` porque la ruta
> `file:../database/schema.sql` es relativa al directorio de trabajo.

Los timestamps (`created_at`, `updated_at`) se generan en el backend en **UTC**
(`@CreationTimestamp` / `@UpdateTimestamp`); los `DEFAULT now()` de SQL son solo una
red de seguridad.

## Requisitos

- **Java 21** (JDK). Verificá con `java -version`.
- **Maven 3.9.x**. Verificá con `mvn -v`.
- **PostgreSQL 16** corriendo en el puerto **5436** (¡no 5432!: 5432-5435 los ocupan
  instalaciones legadas). Base `bugtrack`, usuario `bugtrack`.

### Si `mvn` no está en el PATH

```bash
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH"
```

(`run-local.sh` ya hace esto por vos.)

## Configuración (.env)

Las credenciales de la base **no** están hardcodeadas en `application.yml`: se leen del
entorno. Creá el archivo una sola vez:

```bash
cp .env.example .env
# editá .env y poné la contraseña real
```

`.env` está en `.gitignore` (nunca se commitea); `.env.example` sí va al repo.

Variables disponibles:

| Variable | Default en `application.yml` |
|---|---|
| `BUGTRACK_DB_URL` | `jdbc:postgresql://127.0.0.1:5436/bugtrack` |
| `BUGTRACK_DB_USERNAME` | `bugtrack` |
| `BUGTRACK_DB_PASSWORD` | *(sin default — obligatoria)* |

## Cómo ejecutar

Desde el directorio `backend/`:

```bash
./run-local.sh
```

El script carga `.env`, agrega Maven al PATH si hace falta y lanza
`mvn spring-boot:run`. La primera vez Maven descarga dependencias y puede tardar.

Servicio escuchando en el puerto **8080**.

Para generar el jar: `mvn clean package`.

## Endpoints

| Método | Ruta | Descripción | Errores |
|---|---|---|---|
| GET | `/api/health` | Salud del servicio | — |
| GET | `/api/issues` | Lista. Filtros opcionales `?status=&priority=&severity=` (combinados con AND) | 400 si un filtro no es un valor válido |
| GET | `/api/issues/{id}` | Detalle de un issue | 404 |
| POST | `/api/issues` | Crea un issue (siempre nace `OPEN`) → **201** + `Location` | 400 (validación) |
| PUT | `/api/issues/{id}` | Actualiza título/descripción/severity/priority | 400, 404 |
| PATCH | `/api/issues/{id}/status` | Cambia el estado → body `{"status":"IN_PROGRESS"}` | 400, 404 |
| DELETE | `/api/issues/{id}` | Elimina un issue → **204 No Content** | 404 |

> **Por qué existe `DELETE`**: permite limpiar datos de prueba entre corridas de los
> tests E2E, para que sean reproducibles (cada ejecución parte de un estado conocido).
> No hay UI asociada; es un endpoint solo de API.

Valores válidos:

- `severity`: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`
- `priority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`
- `status`: `OPEN` | `IN_PROGRESS` | `CLOSED`

## Cómo verificar

```bash
curl http://localhost:8080/api/health
# {"status":"UP"}

curl -X POST http://localhost:8080/api/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"Botón no responde","description":"Al hacer click no pasa nada","severity":"HIGH","priority":"URGENT"}'
```
