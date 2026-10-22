// Spec §11.3 — positive lifecycle: create → view → edit → status change →
// reload persistence. Data is seeded/cleaned through the REST API only.

const api = () => Cypress.expose('apiBaseUrl')

const UI_TITLE = 'Fallo E2E al guardar el formulario'
const UI_DESCRIPTION = 'Pasos para reproducirlo:\n1. Abrir el formulario.\n2. Enviar vacío.'

describe('Ciclo de vida de una incidencia', () => {
  beforeEach(() => {
    cy.apiCleanup()
  })

  afterEach(() => {
    cy.apiCleanup()
  })

  it('crea una incidencia válida desde el formulario: toast de éxito y detalle de la nueva incidencia', () => {
    cy.visit('/issues/new')

    cy.get('[data-testid="issue-form-title"]').type(UI_TITLE)
    cy.get('[data-testid="issue-form-description"]').type(UI_DESCRIPTION)
    cy.get('[data-testid="issue-form-severity"]').contains('label', 'Alta').click()
    cy.get('[data-testid="issue-form-priority"]').contains('label', 'Urgente').click()
    cy.get('[data-testid="issue-form-submit"]').click()

    cy.get('[data-testid="success-toast"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Incidencia creada correctamente.')

    // The app navigates to /issues/{id} with the detail drawer open.
    cy.url().should('match', /\/issues\/\d+$/)
    cy.get('[data-testid="issue-detail-title"]').should('have.text', UI_TITLE)
    cy.get('[data-testid="status-select"]').should('have.value', 'OPEN')
  })

  it('muestra el detalle completo de la incidencia creada, incluida la descripción', () => {
    cy.apiCreateIssue({
      title: 'Detalle completo E2E',
      description: 'Descripción con detalle que debe verse en el drawer.',
      severity: 'CRITICAL',
      priority: 'URGENT',
    }).then((issue) => {
      cy.visit(`/issues/${issue.id}`)

      cy.get('[data-testid="issue-detail-id"]').should('have.text', `#${issue.id}`)
      cy.get('[data-testid="issue-detail-title"]').should('have.text', issue.title)
      cy.get('[data-testid="issue-detail-description"]').should(
        'have.text',
        issue.description,
      )
      cy.get('[data-testid="issue-detail-severity"]').should('contain.text', 'Crítica')
      cy.get('[data-testid="issue-detail-priority"]').should('contain.text', 'Urgente')
      cy.get('[data-testid="status-select"]').should('have.value', 'OPEN')
      cy.get('[data-testid="issue-detail-created-at"]').should('not.be.empty')
      cy.get('[data-testid="issue-detail-updated-at"]').should('not.be.empty')
      cy.get('[data-testid="issue-detail-edit"]').should('be.visible')
      cy.get('[data-testid="issue-detail-back"]').should('be.visible')
    })
  })

  it('edita título, descripción, severidad y prioridad y los cambios quedan persistidos', () => {
    cy.apiCreateIssue({
      title: 'Título original E2E',
      description: 'Descripción original E2E.',
      severity: 'LOW',
      priority: 'LOW',
    }).then((issue) => {
      cy.visit(`/issues/${issue.id}/edit`)
      cy.get('[data-testid="issue-edit-id"]').should('have.text', `#${issue.id}`)

      cy.get('[data-testid="issue-form-title"]').clear().type('Título editado E2E')
      cy.get('[data-testid="issue-form-description"]')
        .clear()
        .type('Descripción editada E2E.')
      cy.get('[data-testid="issue-form-severity"]').contains('label', 'Crítica').click()
      cy.get('[data-testid="issue-form-priority"]').contains('label', 'Urgente').click()
      cy.get('[data-testid="issue-form-submit"]').click()

      cy.get('[data-testid="success-toast"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain.text', 'Incidencia actualizada correctamente.')

      // Lands on the detail drawer with the new values.
      cy.location('pathname').should('eq', `/issues/${issue.id}`)
      cy.get('[data-testid="issue-detail-title"]').should('have.text', 'Título editado E2E')
      cy.get('[data-testid="issue-detail-description"]').should(
        'have.text',
        'Descripción editada E2E.',
      )
      cy.get('[data-testid="issue-detail-severity"]').should('contain.text', 'Crítica')
      cy.get('[data-testid="issue-detail-priority"]').should('contain.text', 'Urgente')

      // Independent re-read through the API (persists in the DB).
      cy.request('GET', `${api()}/issues/${issue.id}`).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body.title).to.eq('Título editado E2E')
        expect(res.body.description).to.eq('Descripción editada E2E.')
        expect(res.body.severity).to.eq('CRITICAL')
        expect(res.body.priority).to.eq('URGENT')
        expect(res.body.status).to.eq('OPEN')
      })
    })
  })

  it('cambia el estado desde el select del drawer (OPEN → IN_PROGRESS) con toast y persistencia', () => {
    cy.apiCreateIssue({ title: 'Cambio de estado desde el drawer' }).then((issue) => {
      cy.visit(`/issues/${issue.id}`)
      cy.get('[data-testid="issue-detail-title"]').should('be.visible')

      cy.get('[data-testid="status-select"]').select('IN_PROGRESS')

      cy.get('[data-testid="success-toast"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain.text', `#${issue.id} pasó a En progreso`)
      cy.get('[data-testid="status-select"]').should('have.value', 'IN_PROGRESS')

      cy.request('GET', `${api()}/issues/${issue.id}`).then((res) => {
        expect(res.body.status).to.eq('IN_PROGRESS')
      })
    })
  })

  it('cambia el estado desde el select de la fila del listado con toast', () => {
    cy.apiCreateIssue({ title: 'Cambio de estado desde la fila' }).then((issue) => {
      cy.visit('/issues')
      cy.get(`[data-testid="issue-row-${issue.id}"]`).should('be.visible')

      cy.get(`[data-testid="issue-status-select-${issue.id}"]`).select('IN_PROGRESS')

      cy.get('[data-testid="success-toast"]', { timeout: 10000 })
        .should('be.visible')
        .and('contain.text', `#${issue.id} pasó a En progreso`)
      cy.get(`[data-testid="issue-status-${issue.id}"]`).should('contain.text', 'En progreso')
      cy.get(`[data-testid="issue-status-select-${issue.id}"]`).should(
        'have.value',
        'IN_PROGRESS',
      )

      cy.request('GET', `${api()}/issues/${issue.id}`).then((res) => {
        expect(res.body.status).to.eq('IN_PROGRESS')
      })
    })
  })

  it('la incidencia sobrevive a recargar la página (persistencia real en API + base)', () => {
    cy.apiCreateIssue({ title: 'Persistencia tras recarga' }).then((issue) => {
      cy.visit('/issues')
      cy.get(`[data-testid="issue-row-${issue.id}"]`).should('be.visible')

      cy.reload()

      cy.get(`[data-testid="issue-row-${issue.id}"]`).should('be.visible')
      cy.get(`[data-testid="issue-title-${issue.id}"]`).should(
        'have.text',
        'Persistencia tras recarga',
      )

      cy.request('GET', `${api()}/issues/${issue.id}`).then((res) => {
        expect(res.status).to.eq(200)
        expect(res.body.id).to.eq(issue.id)
      })
    })
  })
})
