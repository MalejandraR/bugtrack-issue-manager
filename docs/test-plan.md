# Plan de pruebas — BugTrack

Documento de pruebas del proyecto **BugTrack** (gestor de issues).
Estructura según la especificación del proyecto §11.4.

> **Cómo extender este archivo:** cada bloque de caso de prueba mantiene los mismos
> siete campos (`Nombre`, `Datos de prueba`, `Precondiciones`, `Pasos`,
> `Resultado esperado`, `Resultado obtenido`, `Estado`). La siguiente fase (E2E/Cypress)
> debe agregar sus casos en la sección 6 respetando ese formato, sin modificar las
> secciones ya completadas.

---

## 1. Objetivo

Verificar que el backend de BugTrack (Spring Boot 3.3.5 + Java 21 + PostgreSQL 16)
se comporta según la especificación: CRUD completo de issues, validación de entrada,
manejo de errores (400/404/500), filtros combinados, persistencia real en base de
datos y contrato de salud del servicio. Se busca evidencia **real** de ejecución,
no estimaciones: cada `Resultado obtenido` proviene de una corrida efectiva.

## 2. Alcance

**Incluido**

- `backend/src/test/java/com/bugtrack/service/IssueServiceTest.java` — pruebas unitarias.
- `backend/src/test/java/com/bugtrack/controller/IssueApiIntegrationTest.java` — pruebas de integración.
- Endpoint `DELETE /api/issues/{id}` agregado para permitir la limpieza de datos de
  prueba entre corridas (reproducibilidad de los tests E2E).
- Verificación en vivo del flujo `DELETE` contra el servidor corriendo en el puerto 8080.

**Excluido (por ahora)**

- Pruebas E2E de frontend (Cypress) — completadas en la sección 7 (13 casos,
  13 Pasó / 0 Falló).
- Pruebas de rendimiento, seguridad y accesibilidad.

**Base de datos de pruebas:** `bugtrack_test` (puerto 5436, perfil `test`).
La base de desarrollo `bugtrack` **no** se usa en los tests automatizados.

## 3. Tipos de pruebas

| Tipo | Herramientas | ¿Contexto Spring? | ¿Base real? | Cantidad |
|---|---|---|---|---|
| Unitarias | JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`) | No | No (mocks) | 17 |
| Integración | `@SpringBootTest` + `MockMvc` + perfil `test` | Sí | Sí (PostgreSQL `bugtrack_test`) | 19 |
| E2E | Cypress (frontend + backend levantado) | Sí | Sí (PostgreSQL `bugtrack`) | 13 (sección 7) |

**Unitarias:** lógica pura de `IssueService` (mapeo DTO→entidad, fuerza de estado
`OPEN`, lanzamiento de `ResourceNotFoundException`, construcción de las
`Specification` de filtro). La validación de los DTO se ejercita con un
`LocalValidatorFactoryBean` aislado, sin levantar Spring.

**Integración:** contrato HTTP completo (códigos, headers, cuerpos JSON) contra la
capa real de persistencia. El esquema se crea con `../database/schema.sql`
(`sql.init.mode: always`, `ddl-auto: validate`) y **cada test limpia la tabla**
`issues` en `@BeforeEach` y `@AfterEach`, de modo que la corrida es
independiente del orden de ejecución y repetible.

---

## 4. Casos de prueba — Backend (unitarias)

Clase: `com.bugtrack.service.IssueServiceTest` · 17 casos · **17 Pasó / 0 Falló**.

#### U01 — `create_mapsDtoForcesOpenStatusAndDelegatesSave`
- **Nombre:** Crear issue mapea el DTO, recorta el título y fuerza `OPEN`.
- **Datos de prueba:** `IssueRequest` con título `"  Login button does nothing  "` (con espacios), descripción `"Click has no effect"`, `severity=HIGH`, `priority=URGENT`.
- **Precondiciones:** `IssueRepository` mockeado; `save` devuelve el argumento recibido.
- **Pasos:** se invoca `IssueService.create(request)`; se captura el argumento con `ArgumentCaptor`.
- **Resultado esperado:** título recortado, descripción/severity/priority iguales al DTO, `status=OPEN`, una única llamada a `save`, y el objeto retornado es el mismo que guardó el repositorio.
- **Resultado obtenido:** Todos los asserts cumplidos: título `"Login button does nothing"`, `status=OPEN`, `save` invocado 1 vez, `assertSame` verdadero.
- **Estado:** Pasó

#### U02 — `validDto_hasNoValidationViolations`
- **Nombre:** DTO válido no produce violaciones de Bean Validation.
- **Datos de prueba:** mismo `IssueRequest` válido de U01.
- **Precondiciones:** `LocalValidatorFactoryBean` inicializado en `@BeforeAll`.
- **Pasos:** `validator.validate(request)`.
- **Resultado esperado:** conjunto vacío de `ConstraintViolation`.
- **Resultado obtenido:** 0 violaciones.
- **Estado:** Pasó

#### U03 — `blankTitle_isRejectedByValidation`
- **Nombre:** Título en blanco viola `@NotBlank`.
- **Datos de prueba:** título `"   "`, resto del payload válido.
- **Precondiciones:** validador inicializado.
- **Pasos:** `validator.validate(request)`; se inspecciona la única violación.
- **Resultado esperado:** 1 violación en `title` con mensaje `title must not be blank`.
- **Resultado obtenido:** 1 violación, campo `title`, mensaje `title must not be blank`.
- **Estado:** Pasó

#### U04 — `titleOver200Chars_isRejectedByValidation`
- **Nombre:** Título de 201 caracteres viola `@Size(max = 200)`.
- **Datos de prueba:** título `"x".repeat(201)`, resto válido.
- **Precondiciones:** validador inicializado.
- **Pasos:** `validator.validate(request)`.
- **Resultado esperado:** 1 violación en `title` con mensaje `title must be at most 200 characters`.
- **Resultado obtenido:** 1 violación, campo `title`, mensaje `title must be at most 200 characters`.
- **Estado:** Pasó

#### U05 — `missingSeverityAndPriority_areRejectedByValidation`
- **Nombre:** `severity` y `priority` nulas producen un error de campo cada una.
- **Datos de prueba:** título y descripción válidos; `severity=null`, `priority=null`.
- **Precondiciones:** validador inicializado.
- **Pasos:** `validator.validate(request)`; se filtra por nombre de campo.
- **Resultado esperado:** 2 violaciones (`severity must not be null`, `priority must not be null`).
- **Resultado obtenido:** 2 violaciones, con esos mensajes exactos.
- **Estado:** Pasó

#### U06 — `getById_found_returnsIssue`
- **Nombre:** `getById` devuelve el issue si existe.
- **Datos de prueba:** id `1`; issue existente con `status=OPEN`.
- **Precondiciones:** `findById(1L)` devuelve `Optional.of(issue)`.
- **Pasos:** `issueService.getById(1L)`.
- **Resultado esperado:** devuelve la misma instancia; se consulta `findById(1L)`.
- **Resultado obtenido:** misma instancia (`assertSame`), `findById(1L)` verificado.
- **Estado:** Pasó

#### U07 — `getById_missing_throwsNotFound`
- **Nombre:** `getById` lanza `ResourceNotFoundException` si no existe.
- **Datos de prueba:** id `404`; `findById` devuelve `Optional.empty()`.
- **Precondiciones:** repositorio mockeado.
- **Pasos:** se invoca `getById(404L)` dentro de `assertThrows`.
- **Resultado esperado:** excepción con mensaje `Issue 404 not found`.
- **Resultado obtenido:** `ResourceNotFoundException`, mensaje `Issue 404 not found`.
- **Estado:** Pasó

#### U08 — `update_found_appliesFieldsAndKeepsStatus`
- **Nombre:** `update` aplica los campos y no toca el estado.
- **Datos de prueba:** id `7`; issue existente con `status=CLOSED`; payload con título `"Renamed"`, descripción `"New description"`, `severity=CRITICAL`, `priority=HIGH`.
- **Precondiciones:** `findById(7L)` y `save` mockeados.
- **Pasos:** `issueService.update(7L, request)`.
- **Resultado esperado:** los 4 campos actualizados y `status=CLOSED` sin cambios; `save` recibe la misma instancia.
- **Resultado obtenido:** campos actualizados, `status=CLOSED` intacto, `save(same(existing))` verificado.
- **Estado:** Pasó

#### U09 — `update_missing_throwsNotFound`
- **Nombre:** `update` de un id inexistente lanza `ResourceNotFoundException` y no guarda.
- **Datos de prueba:** id `404`; `findById` vacío; payload válido.
- **Precondiciones:** repositorio mockeado.
- **Pasos:** `issueService.update(404L, request)` dentro de `assertThrows`.
- **Resultado esperado:** excepción y **cero** llamadas a `save`.
- **Resultado obtenido:** excepción lanzada; `verify(never()).save(any())` sin invocaciones.
- **Estado:** Pasó

#### U10 — `changeStatus_found_changesStatus`
- **Nombre:** `changeStatus` persiste el nuevo estado.
- **Datos de prueba:** id `3`; issue existente `status=OPEN`; nuevo estado `IN_PROGRESS`.
- **Precondiciones:** `findById(3L)` y `save` mockeados.
- **Pasos:** `issueService.changeStatus(3L, Status.IN_PROGRESS)`.
- **Resultado esperado:** el issue devuelto queda `IN_PROGRESS` y se guarda.
- **Resultado obtenido:** `status=IN_PROGRESS`, `save(same(existing))` verificado.
- **Estado:** Pasó

#### U11 — `changeStatus_missing_throwsNotFound`
- **Nombre:** `changeStatus` de un id inexistente lanza excepción y no guarda.
- **Datos de prueba:** id `404`; `findById` vacío; estado `CLOSED`.
- **Precondiciones:** repositorio mockeado.
- **Pasos:** `issueService.changeStatus(404L, Status.CLOSED)` dentro de `assertThrows`.
- **Resultado esperado:** `ResourceNotFoundException` con mensaje `Issue 404 not found`; cero `save`.
- **Resultado obtenido:** excepción con ese mensaje; `save` nunca invocado.
- **Estado:** Pasó

#### U12 — `delete_found_removesIssue`
- **Nombre:** `delete` elimina un issue existente.
- **Datos de prueba:** id `5`; issue existente `status=OPEN`.
- **Precondiciones:** `findById(5L)` mockeado.
- **Pasos:** `issueService.delete(5L)`.
- **Resultado esperado:** `delete(same(existing))` invocado; `deleteById` no usado.
- **Resultado obtenido:** `delete` verificado con la misma instancia; `deleteById` 0 invocaciones.
- **Estado:** Pasó

#### U13 — `delete_missing_throwsNotFound`
- **Nombre:** `delete` de un id inexistente lanza excepción y no borra nada.
- **Datos de prueba:** id `404`; `findById` vacío.
- **Precondiciones:** repositorio mockeado.
- **Pasos:** `issueService.delete(404L)` dentro de `assertThrows`.
- **Resultado esperado:** `ResourceNotFoundException`; cero `delete`/`deleteById`.
- **Resultado obtenido:** excepción lanzada; ambos `verify(never())` sin invocaciones.
- **Estado:** Pasó

#### U14 — `list_withoutFilters_buildsConjunctionAndSortsByIdDesc`
- **Nombre:** `list` sin filtros arma una conjunción plana y ordena por `id` DESC.
- **Datos de prueba:** parámetros `status=null`, `priority=null`, `severity=null`; 2 issues mockeados.
- **Precondiciones:** `findAll(Specification, Sort)` mockeado.
- **Pasos:** `issueService.list(null, null, null)`; se captura la `Specification` y se invoca `toPredicate` con `Root`/`CriteriaQuery`/`CriteriaBuilder` mockeados.
- **Resultado esperado:** `cb.conjunction()` invocado, ningún `cb.equal`, ningún `root.get`, orden `Sort.by(DESC, "id")`.
- **Resultado obtenido:** `conjunction()` verificado, `equal` 0 invocaciones, `root.get` 0 invocaciones, `Sort` igual a `id DESC`.
- **Estado:** Pasó

#### U15 — `list_withStatusFilter_buildsEqualPredicateOnStatus`
- **Nombre:** Filtro por `status` compara `root.status` con el valor.
- **Datos de prueba:** `status=OPEN`, `priority=null`, `severity=null`.
- **Precondiciones:** `findAll` mockeado; `root.get(anyString())` responde con un `Path` mockeado.
- **Pasos:** `issueService.list(Status.OPEN, null, null)`; se invoca `toPredicate` y se captura el valor de `cb.equal`.
- **Resultado esperado:** `root.get("status")` una vez; `priority`/`severity` nunca; un único `equal` con `OPEN`.
- **Resultado obtenido:** `get("status")` verificado, `get("priority")` y `get("severity")` en 0, `equal` 1 vez con valor `Status.OPEN`.
- **Estado:** Pasó

#### U16 — `list_withAllFilters_combinesThreeEqualPredicates`
- **Nombre:** Los tres filtros combinados generan tres predicados `equal` con AND.
- **Datos de prueba:** `status=OPEN`, `priority=URGENT`, `severity=CRITICAL`.
- **Precondiciones:** `findAll` mockeado; `root.get` mockeado.
- **Pasos:** `issueService.list(...)`; se invoca `toPredicate` y se capturan los 3 valores de `cb.equal`.
- **Resultado esperado:** `root.get` sobre `status`, `priority` y `severity` (y nunca sobre `createdAt`); 3 `equal` con esos valores.
- **Resultado obtenido:** 3 accesos a las raíces correctos, `createdAt` en 0, 3 `equal` con `OPEN`, `URGENT` y `CRITICAL`.
- **Estado:** Pasó

#### U17 — `list_withStatusFilterOnly_ignoresOtherCriteria`
- **Nombre:** Un filtro solo de `status` no toca `priority` ni `severity`.
- **Datos de prueba:** `status=CLOSED`, otros nulos.
- **Precondiciones:** igual que U15.
- **Pasos:** `issueService.list(Status.CLOSED, null, null)`; `toPredicate` con mocks.
- **Resultado esperado:** un solo `equal` con `CLOSED`; `priority`/`severity` nunca consultados.
- **Resultado obtenido:** `get("status")` 1 vez, `get("priority")`/`get("severity")` en 0, `equal` 1 vez con `Status.CLOSED`.
- **Estado:** Pasó

---

## 5. Casos de prueba — Backend (integración)

Clase: `com.bugtrack.controller.IssueApiIntegrationTest` · 19 casos · **19 Pasó / 0 Falló**.
Perfil `test`, base `bugtrack_test`, limpieza de la tabla `issues` antes y después de cada caso.

#### I01 — `postValid_returns201WithLocationAndOpenBody`
- **Nombre:** Crear un issue válido devuelve 201 con `Location` y cuerpo `OPEN`.
- **Datos de prueba:** `{"title":"Login button does nothing","description":"Click has no effect","severity":"HIGH","priority":"URGENT"}`.
- **Precondiciones:** tabla `issues` vacía.
- **Pasos:** `POST /api/issues`; se lee `Location` y el cuerpo JSON.
- **Resultado esperado:** 201; `Location` termina en `/api/issues/{id}`; `id > 0`; `status=OPEN`; `createdAt`/`updatedAt` presentes.
- **Resultado obtenido:** 201; `Location: http://localhost:8080/api/issues/10` (id generado por la base); `status=OPEN`; timestamps presentes; título/severity/priority correctos.
- **Estado:** Pasó

#### I02 — `postBlankTitle_returns400WithFieldError`
- **Nombre:** Título en blanco devuelve 400 con `fieldErrors.title`.
- **Datos de prueba:** título `"   "`, descripción y enums válidos.
- **Precondiciones:** tabla vacía.
- **Pasos:** `POST /api/issues`.
- **Resultado esperado:** 400, `fieldErrors.title = "title must not be blank"` y ninguna fila persistida.
- **Resultado obtenido:** 400; `fieldErrors.title` con ese mensaje; `count(*) = 0`.
- **Estado:** Pasó

#### I03 — `postInvalidSeverityEnum_returns400MalformedBody`
- **Nombre:** Enum de severidad inválido devuelve 400 "Malformed request body".
- **Datos de prueba:** `"severity":"BOGUS"`.
- **Precondiciones:** tabla vacía.
- **Pasos:** `POST /api/issues`.
- **Resultado esperado:** 400 con `message = "Malformed request body"` y sin `fieldErrors`.
- **Resultado obtenido:** 400; mensaje exacto `Malformed request body`; `fieldErrors` ausente (JSON omitido por `NON_NULL`).
- **Estado:** Pasó

#### I04 — `postTooLongTitle_returns400`
- **Nombre:** Título de 201 caracteres devuelve 400.
- **Datos de prueba:** `"title": "x" * 201`, resto válido.
- **Precondiciones:** tabla vacía.
- **Pasos:** `POST /api/issues`.
- **Resultado esperado:** 400 con `fieldErrors.title = "title must be at most 200 characters"`.
- **Resultado obtenido:** 400; mensaje exacto `title must be at most 200 characters`.
- **Estado:** Pasó

#### I05 — `list_returns200WithArray`
- **Nombre:** Listar issues devuelve 200 con un arreglo JSON.
- **Datos de prueba:** primero 0 filas; luego 2 issues persistidos por repositorio.
- **Precondiciones:** tabla vacía al inicio del caso.
- **Pasos:** `GET /api/issues` (dos veces).
- **Resultado esperado:** 200 con `[]` y luego arreglo de tamaño 2 con `id` numérico.
- **Resultado obtenido:** 200 con longitud 0; luego longitud 2 y `$[0].id` numérico.
- **Estado:** Pasó

#### I06 — `listFiltersByStatus`
- **Nombre:** `GET ?status=OPEN` devuelve solo los issues `OPEN`.
- **Datos de prueba:** 3 issues: `Open one` (OPEN), `Closed one` (CLOSED), `Another open` (OPEN).
- **Precondiciones:** tabla vacía.
- **Pasos:** `GET /api/issues?status=OPEN` y `GET /api/issues?status=CLOSED`.
- **Resultado esperado:** 200 con 2 filas `OPEN` (ninguna con otro estado) y 1 fila `CLOSED` titulada `Closed one`.
- **Resultado obtenido:** `OPEN` → longitud 2, sin elementos con estado distinto; `CLOSED` → longitud 1, título `Closed one`.
- **Estado:** Pasó

#### I07 — `listCombinesStatusPriorityAndSeverityFilters`
- **Nombre:** Los tres filtros se combinan con AND.
- **Datos de prueba:** 4 issues: `Match` (OPEN/URGENT/CRITICAL), `Wrong priority` (OPEN/LOW/CRITICAL), `Wrong severity` (OPEN/URGENT/LOW), `Wrong status` (CLOSED/URGENT/CRITICAL).
- **Precondiciones:** tabla vacía.
- **Pasos:** `GET /api/issues?status=OPEN&priority=URGENT&severity=CRITICAL`.
- **Resultado esperado:** 200 con exactamente 1 elemento: `Match`.
- **Resultado obtenido:** longitud 1, título `Match`.
- **Estado:** Pasó

#### I08 — `listWithInvalidEnumFilter_returns400`
- **Nombre:** Valor de query inválido devuelve 400.
- **Datos de prueba:** `?status=BOGUS`.
- **Precondiciones:** —
- **Pasos:** `GET /api/issues?status=BOGUS`.
- **Resultado esperado:** 400 con `message = "Invalid value for parameter 'status'"`.
- **Resultado obtenido:** 400; mensaje exacto `Invalid value for parameter 'status'`.
- **Estado:** Pasó

#### I09 — `getById_returns200`
- **Nombre:** Detalle por id devuelve 200.
- **Datos de prueba:** issue creado vía API con título `Detail me`.
- **Precondiciones:** issue persistido (id obtenido del 201).
- **Pasos:** `GET /api/issues/{id}`.
- **Resultado esperado:** 200 con `id`, `title` y `status=OPEN`.
- **Resultado obtenido:** 200; `id` correcto, título `Detail me`, `status=OPEN`.
- **Estado:** Pasó

#### I10 — `getByIdMissing_returns404WithCleanBody`
- **Nombre:** Id inexistente devuelve 404 con cuerpo limpio (sin stack trace).
- **Datos de prueba:** id `999999` (no existe).
- **Precondiciones:** tabla vacía.
- **Pasos:** `GET /api/issues/999999`; se inspecciona el cuerpo crudo.
- **Resultado esperado:** 404, `status=404`, mensaje `Issue 999999 not found`, y el cuerpo sin `Exception`, sin `stackTrace`, sin frames `at com.bugtrack`.
- **Resultado obtenido:** 404; cuerpo `{"timestamp":...,"status":404,"message":"Issue 999999 not found"}`; verificaciones negativas de `Exception`, `stackTrace`, `at com.bugtrack` y `trace` todas sin coincidencias.
- **Estado:** Pasó

#### I11 — `putValid_returns200KeepsStatusAndTouchesUpdatedAt`
- **Nombre:** PUT actualiza campos, conserva el estado y refresca `updatedAt`.
- **Datos de prueba:** issue creado (`Original title`) y llevado a `IN_PROGRESS` con PATCH; luego payload con título `Renamed title`, descripción `New description`, `CRITICAL`, `HIGH`.
- **Precondiciones:** issue existente; se leen `createdAt` y `updatedAt` antes del PUT.
- **Pasos:** `PUT /api/issues/{id}`; se compara el `updatedAt` posterior con el anterior.
- **Resultado esperado:** 200; campos nuevos; `status=IN_PROGRESS` intacto; `createdAt` idéntico al anterior; `updatedAt` distinto del anterior.
- **Resultado obtenido:** 200; campos actualizados; `status=IN_PROGRESS` conservado; `createdAt` igual al previo; `updatedAt` distinto al previo (`assertNotEquals` sin excepción).
- **Estado:** Pasó

#### I12 — `putMissing_returns404`
- **Nombre:** PUT a un id inexistente devuelve 404.
- **Datos de prueba:** id `999999` con payload válido.
- **Precondiciones:** el id no existe.
- **Pasos:** `PUT /api/issues/999999`.
- **Resultado esperado:** 404 con `status=404`.
- **Resultado obtenido:** 404, `status=404`.
- **Estado:** Pasó

#### I13 — `patchStatus_returns200WithNewStatus`
- **Nombre:** PATCH de estado devuelve 200 con el nuevo estado.
- **Datos de prueba:** issue creado vía API; `{"status":"CLOSED"}`.
- **Precondiciones:** issue existente con `status=OPEN`.
- **Pasos:** `PATCH /api/issues/{id}/status`.
- **Resultado esperado:** 200 con `status=CLOSED`.
- **Resultado obtenido:** 200; `id` correcto y `status=CLOSED`.
- **Estado:** Pasó

#### I14 — `patchStatusMissing_returns404`
- **Nombre:** PATCH de estado sobre un id inexistente devuelve 404.
- **Datos de prueba:** id `999999`; `{"status":"CLOSED"}`.
- **Precondiciones:** el id no existe.
- **Pasos:** `PATCH /api/issues/999999/status`.
- **Resultado esperado:** 404 con `status=404`.
- **Resultado obtenido:** 404, `status=404`.
- **Estado:** Pasó

#### I15 — `patchNullStatus_returns400`
- **Nombre:** PATCH con estado nulo devuelve 400 con `fieldErrors.status`.
- **Datos de prueba:** issue existente; `{"status":null}`.
- **Precondiciones:** issue creado vía API.
- **Pasos:** `PATCH /api/issues/{id}/status`.
- **Resultado esperado:** 400 con `fieldErrors.status = "status must not be null"`.
- **Resultado obtenido:** 400; mensaje de campo exacto `status must not be null`.
- **Estado:** Pasó

#### I16 — `deleteThenGet_returns204Then404`
- **Nombre:** DELETE devuelve 204 y el GET posterior devuelve 404.
- **Datos de prueba:** issue creado vía API (título `Delete me`).
- **Precondiciones:** el issue existe y está en la base.
- **Pasos:** `DELETE /api/issues/{id}` → luego `GET /api/issues/{id}` → se consulta `count(*)`.
- **Resultado esperado:** 204 sin cuerpo; después 404 con `status=404`; `count(*) = 0`.
- **Resultado obtenido:** 204 con 0 bytes de cuerpo; GET → 404 con `status=404`; `count(*) = 0`.
- **Estado:** Pasó

#### I17 — `deleteMissing_returns404`
- **Nombre:** DELETE de un id inexistente devuelve 404.
- **Datos de prueba:** id `999999`.
- **Precondiciones:** el id no existe.
- **Pasos:** `DELETE /api/issues/999999`.
- **Resultado esperado:** 404 con `status=404`.
- **Resultado obtenido:** 404, `status=404`.
- **Estado:** Pasó

#### I18 — `repositorySaveIsVisibleThroughTheApi`
- **Nombre:** Prueba de persistencia real: guardado por repositorio y leído por GET.
- **Datos de prueba:** issue persistido directamente con `IssueRepository.save(...)` con `status=CLOSED`, título `Repository round trip`.
- **Precondiciones:** base `bugtrack_test` conectada (no hay transacción de test que haga rollback).
- **Pasos:** `repository.save` → `GET /api/issues/{id}` → `issueRepository.findAll()`.
- **Resultado esperado:** 200 con el mismo `id`, título y `status=CLOSED`; la fila existe físicamente en PostgreSQL.
- **Resultado obtenido:** 200 con `id`, título y `status=CLOSED` coincidentes; `findAll()` contiene la fila.
- **Estado:** Pasó

#### I19 — `health_returns200Up`
- **Nombre:** Endpoint de salud responde 200 `{"status":"UP"}`.
- **Datos de prueba:** —
- **Precondiciones:** contexto Spring arrancado sobre `bugtrack_test`.
- **Pasos:** `GET /api/health`.
- **Resultado esperado:** 200 con `status=UP`.
- **Resultado obtenido:** 200, `{"status":"UP"}`.
- **Estado:** Pasó

---

## 6. Ejecución

### Comandos exactos

```bash
# 1) Maven no está en el PATH (macOS):
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH"

# 2) Correr TODA la suite desde backend/ (obligatorio: el esquema se carga con
#    la ruta relativa file:../database/schema.sql resuelta desde el cwd):
cd /Users/alejandra/Documents/bugtrack-issue-manager/backend
mvn -q clean test          # salida silenciosa, código de salida 0
mvn -B clean test          # corrida final con salida completa (resumen verbatim abajo)

# 3) Verificación en vivo del endpoint DELETE:
./run-local.sh &           # arranca el backend en :8080 con backend/.env
curl -i -X POST http://localhost:8080/api/issues -H 'Content-Type: application/json' \
  -d '{"title":"DELETE live verification","description":"Temporary row created by the test suite verification","severity":"MEDIUM","priority":"LOW"}'
curl -i -X DELETE http://localhost:8080/api/issues/{id}
curl -i http://localhost:8080/api/issues/{id}
lsof -ti :8080 | xargs kill   # apagar el backend
```

- **Fecha de ejecución:** 2026-10-21 (17:57:48 -05:00, hora local).
- **Entorno:** macOS (darwin), OpenJDK 21.0.12.1 (Temurin), Maven 3.9.9, PostgreSQL 16 en puerto 5436.
- **Perfil:** `test` (`@ActiveProfiles("test")`), base `bugtrack_test`.
- **Resultado de `mvn -q clean test`:** código de salida **0**.
- **Resultado de la corrida final `mvn -B clean test`:** `BUILD SUCCESS`.

### Resumen Surefire (verbatim, corrida del 2026-10-21 17:57 `mvn -B clean test`)

```text
[INFO] Running com.bugtrack.controller.IssueApiIntegrationTest
[INFO] Tests run: 19, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 22.18 s -- in com.bugtrack.controller.IssueApiIntegrationTest
[INFO] Running com.bugtrack.service.IssueServiceTest
[INFO] Tests run: 17, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.154 s -- in com.bugtrack.service.IssueServiceTest
[INFO] Results:
[INFO]
[INFO] Tests run: 36, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  37.808 s
[INFO] Finished at: 2026-10-21T17:57:48-05:00
[INFO] ------------------------------------------------------------------------
```

**Corrida posterior (misma fecha, tras agregar los 2 tests de 405/415 en `0ba4160` y la parametrización de variables de entorno del datasource de test):**

```text
[INFO] Tests run: 21, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 16.73 s -- in com.bugtrack.controller.IssueApiIntegrationTest
[INFO] Tests run: 17, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 2.204 s -- in com.bugtrack.service.IssueServiceTest
[INFO] Results:
[INFO] Tests run: 38, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

### Verificación en vivo del endpoint DELETE (2026-10-21, backend en :8080)

| Paso | Comando | Código HTTP | Cuerpo / evidencia |
|---|---|---|---|
| 1 | `POST /api/issues` | **201** | `Location: http://localhost:8080/api/issues/10`, `status=OPEN` |
| 2 | `GET /api/issues/10` | **200** | issue completo con timestamps |
| 3 | `DELETE /api/issues/10` | **204** | cuerpo vacío (0 bytes) |
| 4 | `GET /api/issues/10` | **404** | `{"status":404,"message":"Issue 10 not found"}` |
| 5 | `DELETE /api/issues/999999` | **404** | `{"status":404,"message":"Issue 999999 not found"}` |
| 6 | `GET /api/health` | **200** | `{"status":"UP"}` |

### Estado final de las bases de datos

| Base | Filas en `issues` | Tablas |
|---|---|---|
| `bugtrack` (desarrollo) | **0** | `issues` |
| `bugtrack_test` (pruebas) | **0** (limpieza automática por `@BeforeEach`/`@AfterEach`) | `issues` |

---

## 7. Pruebas E2E (Cypress)

Suite E2E de frontend + backend: **13 casos · 13 Pasó / 0 Falló** (tres corridas
consecutivas verdes; resultados de la corrida final de la sección 7.4).

- **Archivos:** `frontend/cypress.config.js`,
  `frontend/cypress/support/{e2e.js,commands.js}`,
  `frontend/cypress/e2e/{issue-lifecycle,filters,negative}.cy.js`.
- **Datos:** se crean por API (`POST /api/issues`, títulos únicos con
  timestamp) y se borran por API (`GET` + `DELETE` cada fila) en
  `beforeEach`/`afterEach` de cada spec: cada caso es independiente del orden
  y la corrida no depende de datos residuales.
- **Selectores:** exclusivamente los `data-testid` documentados en
  `frontend/README.md`, más uno nuevo (`issues-count-subtitle`, ver 7.3).
- **Entorno:** Node v24.14.1, npm 11.19.1, macOS 12.7.6, backend en `:8080`
  (base `bugtrack`, puerto 5436), frontend Vite en `:5173`.

### 7.1 Casos — positivos (ciclo de vida)

#### E01 — Crear incidencia válida desde el formulario
- **Nombre:** Crear una incidencia válida desde el formulario: toast de éxito y detalle de la nueva incidencia.
- **Datos de prueba:** título `Fallo E2E al guardar el formulario`, descripción multilínea (pasos), severidad `HIGH` (píldora "Alta"), prioridad `URGENT` (píldora "Urgente").
- **Precondiciones:** tabla `issues` vacía (limpieza por API en `beforeEach`); backend `:8080` y frontend `:5173` activos.
- **Pasos:** visitar `/issues/new`; completar `issue-form-title`, `issue-form-description`, elegir severidad/prioridad; `issue-form-submit`.
- **Resultado esperado:** toast `success-toast` con "Incidencia creada correctamente."; navegación a `/issues/{id}` con el drawer abierto; `issue-detail-title` con el título ingresado y `status-select` en `OPEN`.
- **Resultado obtenido:** toast visible con ese texto; URL `/issues/{id}` (regex `\/issues\/\d+$`); título del drawer idéntico y `status-select` con valor `OPEN`.
- **Estado:** Pasó (10247 ms)

#### E02 — Ver el detalle completo de la incidencia
- **Nombre:** Muestra el detalle completo de la incidencia creada, incluida la descripción.
- **Datos de prueba:** incidencia creada por API con título `Detalle completo E2E`, descripción `Descripción con detalle que debe verse en el drawer.`, severidad `CRITICAL`, prioridad `URGENT`.
- **Precondiciones:** la incidencia existe (creada vía `apiCreateIssue`).
- **Pasos:** visitar `/issues/{id}`; leer todos los campos del drawer.
- **Resultado esperado:** visibles `issue-detail-id` (`#id`), `issue-detail-title`, `issue-detail-description` (texto completo), `issue-detail-severity` ("Crítica"), `issue-detail-priority` ("Urgente"), `status-select=OPEN`, `issue-detail-created-at` y `issue-detail-updated-at` con fecha formateada, más acciones `issue-detail-edit` e `issue-detail-back`.
- **Resultado obtenido:** los 10 elementos presentes con los valores esperados; `created-at`/`updated-at` no vacíos.
- **Estado:** Pasó (2228 ms)

#### E03 — Editar título, descripción, severidad y prioridad
- **Nombre:** Edita título, descripción, severidad y prioridad y los cambios quedan persistidos.
- **Datos de prueba:** incidencia original `Título original E2E` / `Descripción original E2E.` / severidad `LOW` / prioridad `LOW`; edición a `Título editado E2E` / `Descripción editada E2E.` / severidad `CRITICAL` / prioridad `URGENT`.
- **Precondiciones:** incidencia creada por API; tabla sin otros datos.
- **Pasos:** visitar `/issues/{id}/edit` (cabecera `issue-edit-id`); modificar los 4 campos; `issue-form-submit`; relectura por API (`GET /api/issues/{id}`).
- **Resultado esperado:** toast "Incidencia actualizada correctamente."; retorno al drawer con los 4 valores nuevos; la relectura por API devuelve los valores nuevos, `status=OPEN` intacto.
- **Resultado obtenido:** toast correcto; `pathname=/issues/{id}`; drawer con título/descripción/severidad/prioridad nuevos; `GET` por API: `title=Título editado E2E`, `description=Descripción editada E2E.`, `severity=CRITICAL`, `priority=URGENT`, `status=OPEN`.
- **Estado:** Pasó (4525 ms)

#### E04 — Cambiar estado desde el select del drawer
- **Nombre:** Cambia el estado desde el select del drawer (`OPEN → IN_PROGRESS`) con toast y persistencia.
- **Datos de prueba:** incidencia creada por API con estado `OPEN`; nuevo estado `IN_PROGRESS`.
- **Precondiciones:** incidencia existente y visible en el drawer.
- **Pasos:** visitar `/issues/{id}`; cambiar `status-select` a `IN_PROGRESS`; leer de nuevo por API.
- **Resultado esperado:** toast `#id pasó a En progreso`; el select del drawer queda en `IN_PROGRESS`; la API devuelve `status=IN_PROGRESS`.
- **Resultado obtenido:** toast con ese texto, `status-select=IN_PROGRESS` y `GET` por API con `status=IN_PROGRESS`.
- **Estado:** Pasó (3269 ms)

#### E05 — Cambiar estado desde el select de la fila
- **Nombre:** Cambia el estado desde el select de la fila del listado con toast.
- **Datos de prueba:** incidencia creada por API (`OPEN`); cambio a `IN_PROGRESS` vía `issue-status-select-{id}`.
- **Precondiciones:** listado `/issues` con la incidencia visible.
- **Pasos:** cambiar el select de la fila; verificar toast, texto `sr-only` de estado y relectura por API.
- **Resultado esperado:** toast `#id pasó a En progreso`; `issue-status-{id}` muestra "En progreso"; el select queda en `IN_PROGRESS`; API confirma.
- **Resultado obtenido:** los cuatro asserts cumplidos.
- **Estado:** Pasó (2141 ms)

#### E06 — Persistencia tras recargar la página
- **Nombre:** La incidencia sobrevive a recargar la página (persistencia real en API + base).
- **Datos de prueba:** incidencia creada por API con título `Persistencia tras recarga`.
- **Precondiciones:** incidencia persistida; listado `/issues` la muestra.
- **Pasos:** visitar `/issues`; `cy.reload()`; verificar fila nuevamente; `GET /api/issues/{id}`.
- **Resultado esperado:** la fila `issue-row-{id}` y `issue-title-{id}` siguen presentes con el mismo título después de recargar; el `GET` devuelve 200 con el mismo `id`.
- **Resultado obtenido:** fila visible antes y después de la recarga, título idéntico y `GET` → 200 con `id` coincidente.
- **Estado:** Pasó (3118 ms)

### 7.2 Casos — filtros y negativos

#### E07 — Filtrar por estado
- **Nombre:** Filtra por estado: solo se ven las filas coincidentes y el subtítulo muestra el conteo correcto.
- **Datos de prueba:** 4 incidencias creadas por API — Alpha (`OPEN`/`HIGH`/`CRITICAL`), Beta (`OPEN`/`LOW`/`LOW`), Gamma (`IN_PROGRESS`/`HIGH`/`MEDIUM`, estado cambiado por `PATCH`), Delta (`CLOSED`/`URGENT`/`HIGH`, estado cambiado por `PATCH`).
- **Precondiciones:** tabla con exactamente esas 4 filas; sin filtros en la URL.
- **Pasos:** visitar `/issues`; seleccionar `filter-status=OPEN` (luego `CLOSED`); verificar filas visibles/ocultas y `issues-count-subtitle`.
- **Resultado esperado:** con `OPEN`: solo Alpha y Beta, subtítulo "2 incidencias de 4", URL con `status=OPEN`; con `CLOSED`: solo Delta, subtítulo "1 incidencia de 4".
- **Resultado obtenido:** exactamente ese comportamiento: 4 filas iniciales ("4 incidencias"), 2 con `OPEN` ("2 incidencias de 4"), 1 con `CLOSED` ("1 incidencia de 4"), filas no coincidentes inexistentes.
- **Estado:** Pasó (7387 ms)

#### E08 — Combinar filtro de estado y prioridad
- **Nombre:** Combina filtro de estado y prioridad: solo la fila que cumple ambos.
- **Datos de prueba:** mismas 4 incidencias de E07.
- **Precondiciones:** listado completo.
- **Pasos:** `filter-status=OPEN` + `filter-priority=HIGH`; luego `filter-clear`.
- **Resultado esperado:** solo Alpha (OPEN+HIGH); subtítulo "1 incidencia de 4"; URL con ambos parámetros; al limpiar, las 4 filas y subtítulo "4 incidencias".
- **Resultado obtenido:** fila Alpha visible; Beta/Gamma/Delta inexistentes; subtítulo "1 incidencia de 4"; `filter-clear` restaura las 4 filas y "4 incidencias".
- **Estado:** Pasó (3513 ms)

#### E09 — Enviar el formulario vacío
- **Nombre:** Enviar el formulario vacío muestra errores inline en español y no dispara la petición POST.
- **Datos de prueba:** formulario sin campos; `cy.intercept` de `POST **/api/issues` que solo contabiliza.
- **Precondiciones:** `/issues/new`; contador de POST en 0.
- **Pasos:** hacer clic en `issue-form-submit` sin completar nada; leer los 4 mensajes de error; verificar que no se navega y que el contador de POST sigue en 0.
- **Resultado esperado:** errores inline `issue-form-error-{title,description,severity,priority}` con "El título es obligatorio.", "La descripción es obligatoria.", "Selecciona una severidad.", "Selecciona una prioridad."; sin POST; seguimos en `/issues/new`; sin pantalla de detalle.
- **Resultado obtenido:** los 4 mensajes exactos visibles (`role="alert"`), `pathname=/issues/new`, contador `POST /api/issues = 0`, sin `issue-detail-title`.
- **Estado:** Pasó (4225 ms)

#### E10 — Título de más de 200 caracteres
- **Nombre:** Título de más de 200 caracteres: el input lo limita y, si se fuerza, muestra el error inline sin enviar.
- **Datos de prueba:** 250 `x` tecleados en `issue-form-title`; después se fuerza un valor de 201 `y` vía el setter nativo de `value` + evento `input` (para ejercitar la validación que el `maxlength` nativo impide alcanzar tecleando).
- **Precondiciones:** `/issues/new` con el resto del formulario completado (descripción, severidad y prioridad válidos) y contador de POST en 0.
- **Pasos:** verificar `maxlength=200`; teclear 250 caracteres y medir el valor; forzar 201 caracteres; enviar.
- **Resultado esperado:** el valor tecleado queda en 200 caracteres (no hay error ni envío); con 201 caracteres forzados aparece `issue-form-error-title` "El título no puede superar los 200 caracteres." y no se dispara el POST.
- **Resultado obtenido:** `maxlength="200"` presente; valor tras teclear = 200 caracteres y sin error inline; valor forzado = 201; al enviar, error inline con ese texto exacto, `pathname=/issues/new` y `POST /api/issues = 0`.
- **Estado:** Pasó (11560 ms)

#### E11 — Abrir una incidencia inexistente
- **Nombre:** Abrir `/issues/999999` muestra el estado "la incidencia no existe" y no una página en blanco.
- **Datos de prueba:** id `999999` (no existe).
- **Precondiciones:** backend arriba; listado vacío detrás del drawer.
- **Pasos:** visitar `/issues/999999`; verificar estado 404 y CTA; navegar de vuelta con `issue-not-found-back`.
- **Resultado esperado:** `issue-not-found` visible con "La incidencia no existe" y el id `999999`; `issue-not-found-back` operable; sin `issue-detail-title` (no se renderiza un detalle vacío); al volver, `/issues` con subtítulo visible.
- **Resultado obtenido:** estado 404 visible con ambos textos; el CTA lleva a `/issues` (`pathname` verificado); nunca aparece el título del detalle; la página no queda en blanco.
- **Estado:** Pasó (2600 ms)

#### E12 — Error 500 del backend con reintento
- **Nombre:** Un 500 del backend muestra el banner de error con Reintentar y el reintento recupera el listado.
- **Datos de prueba:** 1 incidencia creada por API (`Visible tras el reintento`); `cy.intercept` de `GET **/api/issues` responde 500 con cuerpo `{"status":500,"message":"Fallo interno simulado (500)"}` (con `access-control-allow-origin: *`, porque la llamada es cross-origin); después del banner se restaura `req.continue()`.
- **Precondiciones:** listado en error; backend real disponible para el reintento.
- **Pasos:** visitar `/issues`; verificar banner y botón; restaurar respuestas y pulsar `error-retry`.
- **Resultado esperado:** `error-banner` con "No se pudieron cargar las incidencias: Fallo interno simulado (500)" y `error-retry` "Reintentar"; tras reintentar, la fila de la incidencia visible, el banner desaparecido y subtítulo "1 incidencia".
- **Resultado obtenido:** banner y botón con esos textos; tras el clic en Reintentar, fila visible, `error-banner` inexistente y subtítulo "1 incidencia".
- **Estado:** Pasó (2541 ms)

#### E13 — Servidor no disponible
- **Nombre:** Si el servidor no responde se muestra un mensaje de conexión amigable, sin volcado de excepción.
- **Datos de prueba:** `cy.intercept` de `GET **/api/issues` con `forceNetworkError: true`.
- **Precondiciones:** sin datos (tabla vacía).
- **Pasos:** visitar `/issues`; leer el banner; revisar el texto completo de la página.
- **Resultado esperado:** `error-banner` con "No se pudieron cargar las incidencias: No se pudo conectar con el servidor." (mensaje propio de `api.js`, no una excepción cruda) y `error-retry`; el body no contiene `TypeError`, `stackTrace` ni `Error: `.
- **Resultado obtenido:** banner con ese texto exacto y botón Reintentar presentes; las tres verificaciones negativas de volcado de excepción sin coincidencias.
- **Estado:** Pasó (1775 ms)

### 7.3 Decisión de diseño: subtítulo con conteo

El subtítulo del listado (`<p class="sub">`) no tenía `data-testid`, y el caso
E07 exige verificar el conteo. Se agregó **`issues-count-subtitle`** a
`frontend/src/pages/IssuesList.jsx` (solo el atributo; sin cambio de
comportamiento) y se documentó en la tabla de `frontend/README.md`. No se
modificaron componentes, `services/api.js` ni el backend.

### 7.4 Ejecución (corrida final)

#### Comandos exactos

```bash
# 1) Dependencia (devDependency única agregada)
cd /Users/alejandra/Documents/bugtrack-issue-manager/frontend
npm install -D cypress            # cypress 16.2.0
npx cypress install               # npm 11 pospuso el postinstall: instalar el binario a mano
npx cypress verify                # 1er intento: "verification timed out" (Gatekeeper); 2do: OK

# 2) Backend (sources backend/.env, puerto 8080, DB 5436)
cd ../backend
export PATH="$HOME/apps/apache-maven-3.9.9/bin:$PATH" && ./run-local.sh &
curl http://localhost:8080/api/health          # {"status":"UP"}

# 3) Frontend
cd ../frontend && npm run dev                  # http://localhost:5173

# 4) Suite E2E (headless, Electron)
npx cypress run --spec 'cypress/e2e/**/*.cy.js'

# 5) Estado de la base después de la corrida
PGPASSWORD=bugtrack-local-2026 psql -p 5436 -U bugtrack -d bugtrack -h 127.0.0.1 \
  -tAc "SELECT COUNT(*) FROM issues"           # 0

# 6) Apagado por PID (sin pkill; sin tocar los PID de Chrome que son clientes)
lsof -tiTCP:8080 -sTCP:LISTEN | xargs kill
lsof -tiTCP:5173 -sTCP:LISTEN | xargs kill
```

- **Fecha de ejecución:** 2026-10-21, corrida final finalizada a las **19:20:03
  (-05:00, hora local)** (suite completa: 1 min 03 s).
- **Cypress:** 16.2.0 (paquete) / 16.2.0 (binario) / Electron 41.7.0 empaquetado,
  Node empaquetado 24.15.0. Navegador de corrida: **Electron 146 (headless)**
  (Cypress avisa que Electron está deprecado como navegador de tests).
- **Entorno:** Node v24.14.1, npm 11.19.1, macOS 12.7.6 (darwin-x64).
- **Resultado:** código de salida **0**, `All specs passed!`.

#### Resumen verbatim (corrida final)

```text
  Running:  filters.cy.js                                                                   (1 of 3)

  Filtros del listado de incidencias
    ✓ filtra por estado: solo se ven las filas coincidentes y el subtítulo muestra el conteo correcto (7387ms)
    ✓ combina filtro de estado y prioridad: solo la fila que cumple ambos (3513ms)

  2 passing (12s)


  Running:  issue-lifecycle.cy.js                                                           (2 of 3)

  Ciclo de vida de una incidencia
    ✓ crea una incidencia válida desde el formulario: toast de éxito y detalle de la nueva incidencia (10247ms)
    ✓ muestra el detalle completo de la incidencia creada, incluida la descripción (2228ms)
    ✓ edita título, descripción, severidad y prioridad y los cambios quedan persistidos (4525ms)
    ✓ cambia el estado desde el select del drawer (OPEN → IN_PROGRESS) con toast y persistencia (3269ms)
    ✓ cambia el estado desde el select de la fila del listado con toast (2141ms)
    ✓ la incidencia sobrevive a recargar la página (persistencia real en API + base) (3118ms)

  6 passing (27s)


  Running:  negative.cy.js                                                                  (3 of 3)

  Casos negativos
    ✓ enviar el formulario vacío muestra errores inline en español y no dispara la petición POST (4225ms)
    ✓ título de más de 200 caracteres: el input lo limita y, si se fuerza, muestra el error inline sin enviar (11560ms)
    ✓ abrir /issues/999999 muestra el estado "la incidencia no existe" y no una página en blanco (2600ms)
    ✓ un 500 del backend muestra el banner de error con Reintentar y el reintento recupera el listado (2541ms)
    ✓ si el servidor no responde se muestra un mensaje de conexión amigable, sin volcado de excepción (1775ms)

  5 passing (24s)


  (Run Finished)


       Spec                                              Tests  Passing  Failing  Pending  Skipped
  ┌────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ ✔  filters.cy.js                            00:11        2        2        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  issue-lifecycle.cy.js                    00:27        6        6        -        -        - │
  ├────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ ✔  negative.cy.js                           00:24        5        5        -        -        - │
  └────────────────────────────────────────────────────────────────────────────────────────────────┘
    ✔  All specs passed!                        01:03       13       13        -        -        -
```

Cabecera de la corrida (verbatim):

```text
  │ Cypress:        16.2.0                                                                         │
  │ Browser:        Electron 146 (headless) (deprecated)                                           │
  │ Node Version:   v24.14.1 (/usr/local/bin/node)                                                 │
  │ Specs:          3 found (filters.cy.js, issue-lifecycle.cy.js, negative.cy.js)                 │

Warning: The Electron browser is deprecated as a test browser and will be removed in a future version of Cypress.
```

#### Iteraciones de la suite (historial honesto)

| # | Corrida | Resultado | Diagnóstico y cambio |
|---|---|---|---|
| 1 | `npx cypress run` (1.er intento) | Falló el arranque: `Cypress verification timed out` (30 s en el smoke test) | Fue el primer lanzamiento de la app (escaneo de Gatekeeper en macOS 12). Se corrió el binario a mano y `npx cypress verify` → `✔ Verified Cypress!`. Sin cambios de código. |
| 2 | corrida completa | 0/13 (los 3 specs abortados en hooks) | **Cypress 16 eliminó `Cypress.env()`**: `CypressError: \`Cypress.env()\` was removed in Cypress version 16.0.0`. Migración a `Cypress.expose()` (config `expose.apiBaseUrl`), el reemplazo documentado para valores públicos. |
| 3 | corrida completa | 12/13 | `negative.cy.js` (500 + reintento) fallaba: "never found it" para `error-banner`. **Era un bug del test, no del producto**: `failRequests = false` estaba dentro del cuerpo de un `.then()`, donde todas las sentencias se ejecutan síncronas mientras los `cy.*` solo se encolan — el flag se volvía `false` *antes* del `cy.visit`, así que las peticiones se `continue()`aban contra el backend real (200) y no había banner. Evidencia: `cypress/dbg.json` mostraba `GET fail=false` a los 4.9 s. Corregido encadenando el cambio de flag en un `.then()` posterior a la aserción del banner. |
| 4 | corrida completa | 13/13 | — |
| 5 | corrida completa (tras eliminar una variable sin uso que marcaba `oxlint`) | 13/13 | Corrida final verificada dos veces seguidas: verde determinista. |

También se limpió un warning propio de `oxlint` (`api` sin usar en
`negative.cy.js`); `npx oxlint cypress/` queda sin avisos. Los avisos de
`src/hooks/*` son preexistentes y no se tocaron.

#### Estado final

| Verificación | Resultado |
|---|---|
| `SELECT COUNT(*) FROM issues` (base `bugtrack`) tras la corrida | **0** |
| Puerto 8080 (backend) | **libre** (asesinado por PID `lsof -tiTCP:8080 -sTCP:LISTEN`) |
| Puerto 5173 (Vite) | **libre** (mismo método) |
| `git` | sin `add`/`commit` (los archivos E2E quedan sin trackear) |
