// Custom commands: data setup/cleanup straight against the REST API, so every
// spec is order-independent and never relies on leftover rows.

const apiBaseUrl = () => Cypress.expose('apiBaseUrl')

let sequence = 0

/**
 * Creates an issue through POST /api/issues and resolves with the response
 * body (includes the generated `id`). Titles are unique per call (timestamp +
 * counter) so parallel/repeat runs never collide.
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

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/issues`,
      body: payload,
      failOnStatusCode: true,
    })
    .its('body')
})

/**
 * Reproducible data strategy: GET every issue and DELETE each one via the
 * API. Used in beforeEach/afterEach so suites start and end with 0 rows.
 */
Cypress.Commands.add('apiCleanup', () => {
  cy.request({
    method: 'GET',
    url: `${apiBaseUrl()}/issues`,
    failOnStatusCode: false,
  }).then((res) => {
    const ids = (Array.isArray(res.body) ? res.body : []).map((issue) => issue.id)
    cy.wrap(ids, { log: false }).each((id) => {
      cy.request({
        method: 'DELETE',
        url: `${apiBaseUrl()}/issues/${id}`,
        failOnStatusCode: false,
      })
    })
  })
})
