# BugTrack · Frontend

Interfaz de usuario del gestor de incidencias **BugTrack**. SPA construida con
Vite + React (JavaScript), React Router y `fetch`. Sin librerías de UI: CSS3 puro
con design tokens.

## Requisitos

- Node 24+ y npm 11+
- Backend corriendo en `http://localhost:8080` (ver `../backend`)

## Correr en desarrollo

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de producción en dist/
npm run lint       # oxlint
```

## Configuración del API

La base URL del backend se define **en un solo lugar**: `src/services/api.js`.

```js
const RAW_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
```

Para apuntar a otra instancia, creá un `.env` en la raíz de `frontend/`:

```
VITE_API_URL=http://localhost:9090/api
```

Endpoints consumidos (no inventar otros):

| Método | Ruta                     | Uso                                  |
| ------ | ------------------------ | ------------------------------------ |
| GET    | `/issues?status=&priority=&severity=` | Listado con filtros opcionales |
| GET    | `/issues/{id}`           | Detalle                              |
| POST   | `/issues`                | Crear (estado nace `OPEN`)           |
| PUT    | `/issues/{id}`           | Editar título/descripción/severidad/prioridad |
| PATCH  | `/issues/{id}/status`    | Cambiar estado                       |
| GET    | `/health`                | Health check                         |

Enums: severidad `LOW\|MEDIUM\|HIGH\|CRITICAL`, prioridad `LOW\|MEDIUM\|HIGH\|URGENT`,
estado `OPEN\|IN_PROGRESS\|CLOSED`. Los errores de validación del backend (400)
llegan como `{status, message, fieldErrors: {...}}` y se mapean a los campos del
formulario.

## Estructura

```
src/
├── components/   UI reutilizable (tabla, tarjetas, formulario, badges, feedback)
├── pages/        Dashboard, IssuesList, IssueCreate, IssueDetail, IssueEdit
├── services/     api.js (único punto de configuración del backend)
├── hooks/        useIssues, useIssue, useMediaQuery, useToast
├── utils/        labels (enum → texto en español), fechas, tones de badges
├── App.jsx       Router + layout compartido
└── main.jsx      Punto de entrada
```

## Convención `data-testid`

Los tests automatizados (Cypress, Fase 4) encuentran los elementos por
`data-testid`. Reglas:

- Snake/kebab-case, sin espacios ni tildes, en inglés.
- Los ids dinámicos interpolan el id de la incidencia: `{id}` = `issue.id`.
- Nunca se repiten en el mismo árbol visible (la vista móvil de la lista usa
  tarjetas y la de escritorio usa la tabla, renderizadas en exclusiva).

| `data-testid`                          | Elemento                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| `nav-brand`                            | Logo/marca del navbar (vuelve al dashboard)                     |
| `nav-dashboard`                        | Link del navbar al dashboard                                    |
| `nav-issues`                           | Link del navbar al listado                                      |
| `nav-new-issue`                        | Link del navbar a crear incidencia                              |
| `dashboard-counter-total`              | Tarjeta contador "Total" del dashboard                          |
| `dashboard-counter-open`               | Tarjeta contador "Abiertas"                                     |
| `dashboard-counter-in-progress`        | Tarjeta contador "En progreso"                                  |
| `dashboard-counter-closed`             | Tarjeta contador "Cerradas"                                     |
| `dashboard-new-issue`                  | Botón "Crear incidencia" del dashboard                          |
| `issues-new-issue`                     | Botón "Crear incidencia" del listado                            |
| `filter-status`                        | Select de filtro por estado                                     |
| `filter-priority`                      | Select de filtro por prioridad                                  |
| `filter-severity`                      | Select de filtro por severidad                                  |
| `filter-clear`                         | Botón "Limpiar filtros"                                         |
| `issue-row-{id}`                       | Fila de tabla / tarjeta de una incidencia                       |
| `issue-title-{id}`                     | Título (link al detalle) dentro de la fila/tarjeta              |
| `issue-severity-{id}`                  | Badge de severidad en la fila/tarjeta                           |
| `issue-priority-{id}`                  | Badge de prioridad en la fila/tarjeta                           |
| `issue-status-{id}`                    | Badge de estado en la fila/tarjeta                              |
| `issue-view-{id}`                      | Acción "Ver"                                                    |
| `issue-edit-{id}`                      | Acción "Editar"                                                 |
| `issue-change-status-{id}`             | Acción "Estado" (va al detalle, ancla `#cambiar-estado`)        |
| `issue-form`                           | Elemento `<form>` del formulario crear/editar                   |
| `issue-form-title`                     | Input de título                                                 |
| `issue-form-description`               | Textarea de descripción                                         |
| `issue-form-severity`                  | Select de severidad                                             |
| `issue-form-priority`                  | Select de prioridad                                             |
| `issue-form-submit`                    | Botón de envío del formulario                                   |
| `issue-form-cancel`                    | Link "Cancelar" del formulario                                  |
| `issue-form-error-{field}`             | Mensaje de error inline (`role="alert"`) del campo              |
| `issue-detail-id`                      | "#id" en el detalle                                             |
| `issue-detail-title`                   | Título en el detalle                                            |
| `issue-detail-description`             | Descripción en el detalle                                       |
| `issue-detail-severity`                | Badge de severidad en el detalle                                |
| `issue-detail-priority`                | Badge de prioridad en el detalle                                |
| `issue-detail-status`                  | Badge de estado en el detalle                                   |
| `issue-detail-created-at`              | Fecha de creación formateada                                    |
| `issue-detail-updated-at`              | Fecha de última actualización formateada                        |
| `issue-detail-back`                    | Botón "Volver" al listado                                       |
| `issue-detail-edit`                    | Botón "Editar" desde el detalle                                 |
| `status-select`                        | Select de cambio de estado en el detalle                        |
| `status-save`                          | Botón "Guardar estado" (PATCH)                                  |
| `issue-not-found`                      | Contenedor del estado "la incidencia no existe" (404)           |
| `issue-not-found-back`                 | CTA "Volver al listado" del estado 404                          |
| `issue-edit-id`                        | "#id" en la cabecera de la página de edición                    |
| `empty-state`                          | Estado vacío                                                    |
| `empty-state-cta`                      | CTA del estado vacío (crear incidencia / limpiar filtros)       |
| `error-banner`                         | Banner de error (`role="alert"`)                                |
| `error-retry`                          | Botón "Reintentar" del banner de error                          |
| `spinner`                              | Indicador de carga (`role="status"`)                            |
| `success-toast`                        | Toast de éxito (`role="status"`)                                |
| `success-toast-close`                  | Botón de cierre del toast                                       |
| `not-found-page`                       | Página 404 de rutas inexistentes                                |
| `not-found-home`                       | CTA "Ir al dashboard" de la 404                                 |

## Accesibilidad

- Todo input tiene un `<label htmlFor>` real.
- Los errores de campo usan `role="alert"` + `aria-invalid` + `aria-describedby`.
- Los estados de carga usan `role="status"`.
- Nunca se usa `window.alert` / `window.confirm`.
