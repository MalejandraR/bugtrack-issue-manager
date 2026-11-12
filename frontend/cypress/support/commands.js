// Custom commands: data setup/cleanup straight against the REST API, so every
// spec is order-independent and never relies on leftover rows.
//
// Since Fase 7 the writes on the API require a Bearer token: every command logs
// in first through POST /api/auth/login with the seeded e2e admin (exposed in
// cypress.config.js). `cy.login()` additionally seeds the SPA session in
// localStorage (`bugtrack_auth`) so UI tests run signed in.

const apiBaseUrl = () => Cypress.expose('apiBaseUrl')
const authEmail = () => Cypress.expose('authEmail')
const authPassword = () => Cypress.expose('authPassword')

let sequence = 0

/** POST /api/auth/login → resolves with the bearer token of the e2e admin. */
const apiLogin = () =>
  cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/auth/login`,
      body: { email: authEmail(), password: authPassword() },
      failOnStatusCode: true,
    })
    .its('body.token')

/**
 * Seeds the SPA session (bugtrack_auth in localStorage) without driving the form:
 * logs in through the API, then loads the app once with the session injected
 * before the first paint. Subsequent cy.visit() calls in the same test keep it
 * (same origin); Cypress clears it between tests (test isolation).
 */
Cypress.Commands.add('login', () => {
  apiLogin().then((token) => {
    const session = JSON.stringify({
      token,
      email: authEmail(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    })
    cy.visit('/login', {
      onBeforeLoad: (win) => win.localStorage.setItem('bugtrack_auth', session),
    })
  })
})

/**
 * Creates an issue through POST /api/issues (authenticated) and resolves with the
 * response body (includes the generated `id`). Titles are unique per call
 * (timestamp + counter) so parallel/repeat runs never collide. UI session is not
 * touched: this is pure API data setup.
 */
Cypress.Commands.add('apiCreateIssue', (overrides = {}) => {
  sequence += 1
  const payload = {
    title: `E2E ${Date.now()}-${sequence}`,
    description: 'Incidencia de prueba creada por Cypress (datos sintéticos).',
    severity: 'MEDIUM',
    priority: 'MEDIUM',
    ...overrides,
  }

  return apiLogin().then((token) =>
    cy
      .request({
        method: 'POST',
        url: `${apiBaseUrl()}/issues`,
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
        failOnStatusCode: true,
      })
      .its('body'),
  )
})

/**
 * Sets an issue's status through PATCH /api/issues/{id}/status (authenticated).
 * Data-setup helper for specs that need non-OPEN states (e.g. filter seeds).
 */
Cypress.Commands.add('apiPatchStatus', (id, status) =>
  apiLogin().then((token) =>
    cy.request({
      method: 'PATCH',
      url: `${apiBaseUrl()}/issues/${id}/status`,
      headers: { Authorization: `Bearer ${token}` },
      body: { status },
      failOnStatusCode: true,
    }),
  ),
)

/**
 * Reproducible data strategy: GET every issue (public read — no token needed) and
 * DELETE each one via the API (authenticated). Used in beforeEach/afterEach so
 * suites start and end with 0 rows.
 */
Cypress.Commands.add('apiCleanup', () => {
  cy.request({
    method: 'GET',
    url: `${apiBaseUrl()}/issues`,
    failOnStatusCode: false,
  }).then((res) => {
    const ids = (Array.isArray(res.body) ? res.body : []).map((issue) => issue.id)
    if (ids.length === 0) return
    apiLogin().then((token) => {
      cy.wrap(ids, { log: false }).each((id) => {
        cy.request({
          method: 'DELETE',
          url: `${apiBaseUrl()}/issues/${id}`,
          headers: { Authorization: `Bearer ${token}` },
          failOnStatusCode: false,
        })
      })
    })
  })
})
