// Spec §11.3 — list filters: by status, by priority combined with status,
// plus the result-count subtitle. Seeds are created through the API.

const api = () => Cypress.expose('apiBaseUrl')

describe('Filtros del listado de incidencias', () => {
  const ids = {}

  beforeEach(() => {
    cy.apiCleanup()
    Object.keys(ids).forEach((key) => delete ids[key])

    // 4 issues covering status × priority combinations.
    cy.apiCreateIssue({
      title: 'Filtro Alpha',
      severity: 'CRITICAL',
      priority: 'HIGH',
    })
      .then((issue) => {
        ids.alpha = issue.id
        return cy.apiCreateIssue({ title: 'Filtro Beta', severity: 'LOW', priority: 'LOW' })
      })
      .then((issue) => {
        ids.beta = issue.id
        return cy.apiCreateIssue({
          title: 'Filtro Gamma',
          severity: 'MEDIUM',
          priority: 'HIGH',
        })
      })
      .then((issue) => {
        ids.gamma = issue.id
        return cy.apiCreateIssue({
          title: 'Filtro Delta',
          severity: 'HIGH',
          priority: 'URGENT',
        })
      })
      .then((issue) => {
        ids.delta = issue.id
        return cy.request('PATCH', `${api()}/issues/${ids.gamma}/status`, {
          status: 'IN_PROGRESS',
        })
      })
      .then(() =>
        cy.request('PATCH', `${api()}/issues/${ids.delta}/status`, { status: 'CLOSED' }),
      )
  })

  afterEach(() => {
    cy.apiCleanup()
  })

  it('filtra por estado: solo se ven las filas coincidentes y el subtítulo muestra el conteo correcto', () => {
    cy.visit('/issues')

    cy.get(`[data-testid="issue-row-${ids.alpha}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.beta}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.gamma}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.delta}"]`).should('be.visible')
    cy.get('[data-testid="issues-count-subtitle"]').should('have.text', '4 incidencias')

    cy.get('[data-testid="filter-status"]').select('OPEN')

    cy.url().should('include', 'status=OPEN')
    cy.get(`[data-testid="issue-row-${ids.alpha}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.beta}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.gamma}"]`).should('not.exist')
    cy.get(`[data-testid="issue-row-${ids.delta}"]`).should('not.exist')
    cy.get('[data-testid="issues-count-subtitle"]').should('have.text', '2 incidencias de 4')

    cy.get('[data-testid="filter-status"]').select('CLOSED')
    cy.get(`[data-testid="issue-row-${ids.delta}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.alpha}"]`).should('not.exist')
    cy.get(`[data-testid="issue-row-${ids.beta}"]`).should('not.exist')
    cy.get('[data-testid="issues-count-subtitle"]').should('have.text', '1 incidencia de 4')
  })

  it('combina filtro de estado y prioridad: solo la fila que cumple ambos', () => {
    cy.visit('/issues')

    cy.get('[data-testid="filter-status"]').select('OPEN')
    cy.get('[data-testid="filter-priority"]').select('HIGH')

    cy.url().should('include', 'status=OPEN')
    cy.url().should('include', 'priority=HIGH')
    // Alpha: OPEN + HIGH. Beta: OPEN + LOW (excluded by priority).
    // Gamma: IN_PROGRESS + HIGH (excluded by status). Delta: CLOSED + URGENT.
    cy.get(`[data-testid="issue-row-${ids.alpha}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.beta}"]`).should('not.exist')
    cy.get(`[data-testid="issue-row-${ids.gamma}"]`).should('not.exist')
    cy.get(`[data-testid="issue-row-${ids.delta}"]`).should('not.exist')
    cy.get('[data-testid="issues-count-subtitle"]').should('have.text', '1 incidencia de 4')

    // Clearing the filters restores the full list.
    cy.get('[data-testid="filter-clear"]').click()
    cy.url().should('not.include', 'status=OPEN')
    cy.get(`[data-testid="issue-row-${ids.gamma}"]`).should('be.visible')
    cy.get(`[data-testid="issue-row-${ids.delta}"]`).should('be.visible')
    cy.get('[data-testid="issues-count-subtitle"]').should('have.text', '4 incidencias')
  })
})
