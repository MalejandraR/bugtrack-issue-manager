# BugTrack · Frontend

Interfaz de usuario del gestor de incidencias **BugTrack**. SPA construida con
Vite + React (JavaScript), React Router y `fetch`. Sin librerías de UI: CSS3 puro
con design tokens.

La identidad visual es **NEObutalism**, tomada 1:1 del prototipo HTML del
proyecto (`../BugTrack · Gestor de incidencias.html`): bordes de 2px, sombras
duras (`4px 4px 0`), esquinas redondeadas, rellenos brillantes y tipografías
Unbounded + DM Sans (cargadas por Google Fonts en `index.html`, sin dependencias
npm). Header superior con logo y navegación en pastilla (no hay sidebar). El
detalle de una incidencia se abre en un **drawer** lateral derecho.

## Tema claro / oscuro

Tema claro por defecto. El tema oscuro **solo** se activa con
`prefers-color-scheme: dark` (mismo bloque `@media` que el prototipo). También
soporta `:root[data-theme="dark"]` por si se quisiera forzar, pero no existe
botón de toggle (el prototipo no lo tiene).

| Token    | Claro                | Oscuro                |
| -------- | -------------------- | --------------------- |
| `--bg`   | `#EDEBFF`            | `#13111D`             |
| `--surf` | `#FFFFFF`            | `#1E1B2E`             |
| `--surf2`| `#F5F3FF`            | `#27233C`             |
| `--ln`   | `#14121F`            | `#EDEBFF`             |
| `--ink`  | `#14121F`            | `#F4F2FF`             |
| `--mut`  | `#5E5B78`            | `#A9A6C8`             |
| `--err`  | `#D6204A`            | `#FF7A93`             |
| `--lime` / `--sun` / `--vio` | `#C6F432` / `#FFD43B` / `#B7A6FF` | iguales (rellenos brillantes siempre llevan texto `--blk`) |

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
| GET    | `/issues/{id}`           | Detalle (drawer)                     |
| POST   | `/issues`                | Crear (estado nace `OPEN`)           |
| PUT    | `/issues/{id}`           | Editar título/descripción/severidad/prioridad |
| PATCH  | `/issues/{id}/status`    | Cambiar estado                       |
| GET    | `/health`                | Health check                         |

Enums: severidad `LOW\|MEDIUM\|HIGH\|CRITICAL`, prioridad `LOW\|MEDIUM\|HIGH\|URGENT`,
estado `OPEN\|IN_PROGRESS\|CLOSED`. Los errores de validación del backend (400)
llegan como `{status, message, fieldErrors: {...}}` y se mapean a los campos del
formulario.

El listado se trae **sin filtros** (`GET /issues`) y se filtra en el cliente
(como el prototipo): los selects siguen reflejándose en la URL
(`?status=&priority=&severity=`) y la búsqueda libre vive en estado del
componente. Tras cada creación/edición/cambio de estado se dispara la señal
`bugtrack:issues-updated` (`src/utils/issueEvents.js`) para que el contador del
header y los listados se refresquen solos.

## Estructura

```
src/
├── components/   UI reutilizable (header, filas, drawer, formulario, badges, feedback)
├── pages/        Dashboard, IssuesList (con drawer anidado), IssueCreate, IssueEdit
├── services/     api.js (único punto de configuración del backend)
├── hooks/        useIssues, useIssue, useMediaQuery, useToast
├── utils/        labels (enum → texto en español + paleta), badges (tones), issueEvents
├── App.jsx       Router + layout compartido (header / main / footer)
└── main.jsx      Punto de entrada
```

Rutas: `/` (dashboard), `/issues` (listado), `/issues/:id` (listado **con el
drawer de detalle abierto**; funciona como deep link y el botón "atrás" lo
cierra), `/issues/new`, `/issues/:id/edit`.

## Convención `data-testid`

Los tests automatizados (Cypress, Fase 4) encuentran los elementos por
`data-testid`. Reglas:

- Snake/kebab-case, sin espacios ni tildes, en inglés.
- Los ids dinámicos interpolan el id de la incidencia: `{id}` = `issue.id`.
- Nunca se repiten en el mismo árbol visible. Por eso los estados de
  carga/error/vacío del drawer **no** reutilizan `spinner`, `error-banner`,
  `error-retry` ni `empty-state`: el listado siempre está detrás del drawer y
  ya los renderiza.

| `data-testid`                          | Elemento                                                        |
| -------------------------------------- | --------------------------------------------------------------- |
| `nav-brand`                            | Logo/marca del header (vuelve al dashboard)                     |
| `nav-dashboard`                        | Link del header al dashboard                                    |
| `nav-issues`                           | Link del header al listado (con contador de no cerradas)        |
| `nav-new-issue`                        | Link del header a crear incidencia                              |
| `dashboard-counter-total`              | Total de incidencias (en la línea "Total: N incidencias")       |
| `dashboard-counter-open`               | Bloque "Abiertas" del dashboard                                 |
| `dashboard-counter-in-progress`        | Bloque "En progreso"                                            |
| `dashboard-counter-closed`             | Bloque "Resuelto" (porcentaje + "X de Y incidencias cerradas")  |
| `dashboard-severity-report`            | Tarjeta "Por severidad" (columnas CSS + badges de prioridad)    |
| `dashboard-severity-{level}`           | Columna de severidad (`low`/`medium`/`high`/`critical`)         |
| `dashboard-new-issue`                  | Botón "+ Crear incidencia" del dashboard                        |
| `issues-new-issue`                     | Botón "+ Crear incidencia" del listado                          |
| `filter-status`                        | Select de filtro por estado (placeholder "Todos los estados")   |
| `filter-priority`                      | Select de filtro por prioridad                                  |
| `filter-severity`                      | Select de filtro por severidad                                  |
| `filter-clear`                         | Botón "Limpiar" (deshabilitado sin filtros ni búsqueda)         |
| `issue-row-{id}`                       | Fila de incidencia (tarjeta `.it`)                              |
| `issue-title-{id}`                     | Título (botón que abre el drawer) dentro de la fila             |
| `issue-severity-{id}`                  | Badge de severidad en la fila                                   |
| `issue-priority-{id}`                  | Badge de prioridad (con puntos ●●●○) en la fila                 |
| `issue-status-{id}`                    | Texto del estado en la fila (sr-only, junto al select)          |
| `issue-status-select-{id}`             | Select de estado en la fila (PATCH inmediato al cambiar)        |
| `issue-change-status-{id}`             | Contenedor del control de estado de la fila                     |
| `issue-view-{id}`                      | Acción "Ver" (abre el drawer)                                   |
| `issue-edit-{id}`                      | Acción "Editar"                                                 |
| `issue-form`                           | Elemento `<form>` del formulario crear/editar                   |
| `issue-form-title`                     | Input de título (maxlength 200)                                 |
| `issue-form-description`               | Textarea de descripción (maxlength 5000)                        |
| `issue-form-severity`                  | Grupo de radio pills de severidad (`role="radiogroup"`)         |
| `issue-form-priority`                  | Grupo de radio pills de prioridad                               |
| `issue-form-submit`                    | Botón de envío del formulario                                   |
| `issue-form-cancel`                    | Link "Cancelar" del formulario                                  |
| `issue-form-error-{field}`             | Mensaje de error inline (`role="alert"`) del campo              |
| `issue-detail-id`                      | "#id" del drawer                                                |
| `issue-detail-title`                   | Título en el drawer                                             |
| `issue-detail-description`             | Descripción en el drawer                                        |
| `issue-detail-severity`                | Badge de severidad en el drawer                                 |
| `issue-detail-priority`                | Badge de prioridad en el drawer                                 |
| `issue-detail-status`                  | Celda "Estado" del drawer (contiene el select)                  |
| `issue-detail-created-at`              | Fecha de creación formateada (`dd/mm/yyyy`)                     |
| `issue-detail-updated-at`              | Fecha de última actualización formateada                        |
| `issue-detail-back`                    | Botón "Cerrar" del drawer                                       |
| `issue-detail-edit`                    | Botón "Editar incidencia" del drawer                            |
| `status-select`                        | Select de cambio de estado del drawer (PATCH al cambiar)        |
| `issue-not-found`                      | Estado "la incidencia no existe" (404): drawer y página edición |
| `issue-not-found-back`                 | CTA "Volver al listado" del estado 404                          |
| `issue-edit-id`                        | "#id" en la cabecera de la página de edición                    |
| `empty-state`                          | Estado vacío (borde discontinuo estilo prototipo)               |
| `empty-state-cta`                      | CTA del estado vacío "Crear incidencia"                         |
| `empty-state-clear`                    | CTA "Limpiar filtros" cuando no hay resultados                  |
| `error-banner`                         | Banner de error (`role="alert"`)                                |
| `error-retry`                          | Botón "Reintentar" del banner de error                          |
| `spinner`                              | Indicador de carga (`role="status"`)                            |
| `success-toast`                        | Toast de éxito (`role="status"`, pastilla oscura inferior)      |
| `success-toast-close`                  | Botón de cierre del toast                                       |
| `not-found-page`                       | Página 404 de rutas inexistentes                                |
| `not-found-home`                       | CTA "Ir al dashboard" de la 404                                 |

> Cambios respecto de la versión con sidebar: se eliminaron `sidebar`,
> `sidebar-toggle` y `sidebar-backdrop` (ya no existe esa navegación) y
> `status-save` (el estado ahora se guarda al cambiar el select, como en el
> prototipo). Se agregó `issue-status-select-{id}` para el select de estado de
> cada fila.

## Accesibilidad

- Todo input tiene un `<label htmlFor>` real; los select de herramientas usan
  `aria-label`.
- Los errores de campo usan `role="alert"` + `aria-invalid` + `aria-describedby`.
- Los estados de carga usan `role="status"`.
- El drawer es un `role="dialog" aria-modal="true"`: el foco entra al abrirse,
  vuelve al elemento que lo abrió al cerrarse, y Escape o el clic en el fondo
  lo cierran.
- Los radios de severidad/prioridad son grupos con `role="radiogroup"` y
  `aria-labelledby`.
- Nunca se usa `window.alert` / `window.confirm`.
