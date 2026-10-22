// Spec §11.3 — negative cases: empty submit, oversized title, unknown id,
// backend 500 and total network failure. All UI copy asserted in Spanish.

describe('Casos negativos', () => {
  beforeEach(() => {
    cy.apiCleanup()
  })

  afterEach(() => {
    cy.apiCleanup()
  })

  it('enviar el formulario vacío muestra errores inline en español y no dispara la petición POST', () => {
    const requests = { post: 0 }
    cy.intercept('POST', '**/api/issues', (req) => {
      requests.post += 1
      req.continue()
    })

    cy.visit('/issues/new')
    cy.get('[data-testid="issue-form-submit"]').click()

    cy.get('[data-testid="issue-form-error-title"]').should(
      'have.text',
      'El título es obligatorio.',
    )
    cy.get('[data-testid="issue-form-error-description"]').should(
      'have.text',
      'La descripción es obligatoria.',
    )
    cy.get('[data-testid="issue-form-error-severity"]').should(
      'have.text',
      'Selecciona una severidad.',
    )
    cy.get('[data-testid="issue-form-error-priority"]').should(
      'have.text',
      'Selecciona una prioridad.',
    )
    cy.location('pathname').should('eq', '/issues/new')
    cy.get('[data-testid="issue-detail-title"]').should('not.exist')

    cy.wrap(null).should(() => {
      expect(requests.post, 'POST /api/issues no debe dispararse').to.eq(0)
    })
  })

  it('título de más de 200 caracteres: el input lo limita y, si se fuerza, muestra el error inline sin enviar', () => {
    const requests = { post: 0 }
    cy.intercept('POST', '**/api/issues', (req) => {
      requests.post += 1
      req.continue()
    })

    cy.visit('/issues/new')

    // Native max-length: the browser refuses to type past 200 characters.
    cy.get('[data-testid="issue-form-title"]')
      .should('have.attr', 'maxlength', '200')
      .type('x'.repeat(250))
    cy.get('[data-testid="issue-form-title"]')
      .invoke('val')
      .should('have.length', 200)
    cy.get('[data-testid="issue-form-error-title"]').should('not.exist')

    // Complete the rest of the form so only the title error remains.
    cy.get('[data-testid="issue-form-description"]').type('Descripción válida.')
    cy.get('[data-testid="issue-form-severity"]').contains('label', 'Media').click()
    cy.get('[data-testid="issue-form-priority"]').contains('label', 'Media').click()

    // Force the value past the limit to exercise the inline validation path.
    cy.get('[data-testid="issue-form-title"]').then(($input) => {
      const longValue = 'y'.repeat(201)
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      ).set
      setter.call($input[0], longValue)
      $input[0].dispatchEvent(new Event('input', { bubbles: true }))
    })
    cy.get('[data-testid="issue-form-title"]')
      .invoke('val')
      .should('have.length', 201)

    cy.get('[data-testid="issue-form-submit"]').click()

    cy.get('[data-testid="issue-form-error-title"]').should(
      'have.text',
      'El título no puede superar los 200 caracteres.',
    )
    cy.location('pathname').should('eq', '/issues/new')

    cy.wrap(null).should(() => {
      expect(requests.post, 'POST /api/issues no debe dispararse').to.eq(0)
    })
  })

  it('abrir /issues/999999 muestra el estado "la incidencia no existe" y no una página en blanco', () => {
    cy.visit('/issues/999999')

    cy.get('[data-testid="issue-not-found"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'La incidencia no existe')
      .and('contain.text', '999999')
    cy.get('[data-testid="issue-not-found-back"]').should('be.visible')
    cy.get('[data-testid="issue-detail-title"]').should('not.exist')

    cy.get('[data-testid="issue-not-found-back"]').click()
    cy.location('pathname').should('eq', '/issues')
    cy.get('[data-testid="issues-count-subtitle"]').should('be.visible')
  })

  it('un 500 del backend muestra el banner de error con Reintentar y el reintento recupera el listado', () => {
    let failRequests = true
    cy.intercept('GET', '**/api/issues', (req) => {
      if (failRequests) {
        req.reply({
          statusCode: 500,
          headers: { 'access-control-allow-origin': '*' },
          body: { status: 500, message: 'Fallo interno simulado (500)' },
        })
      } else {
        req.continue()
      }
    })

    cy.apiCreateIssue({ title: 'Visible tras el reintento' }).then((issue) => {
      cy.visit('/issues')

      cy.get('[data-testid="error-banner"]', { timeout: 10000 })
        .should('be.visible')
        .and(
          'contain.text',
          'No se pudieron cargar las incidencias: Fallo interno simulado (500)',
        )
        // Restore the backend responses only once the banner is on screen:
        // inside a .then() body every statement runs synchronously while cy.*
        // commands merely queue, so a plain assignment here would execute
        // before the queued visit/assertions.
        .then(() => {
          failRequests = false
        })
      cy.get('[data-testid="error-retry"]')
        .should('be.visible')
        .and('have.text', 'Reintentar')

      cy.get('[data-testid="error-retry"]').click()

      cy.get(`[data-testid="issue-row-${issue.id}"]`, { timeout: 10000 }).should('be.visible')
      cy.get('[data-testid="error-banner"]').should('not.exist')
      cy.get('[data-testid="issues-count-subtitle"]').should('have.text', '1 incidencia')
    })
  })

  it('si el servidor no responde se muestra un mensaje de conexión amigable, sin volcado de excepción', () => {
    cy.intercept('GET', '**/api/issues', { forceNetworkError: true })

    cy.visit('/issues')

    cy.get('[data-testid="error-banner"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'No se pudieron cargar las incidencias: No se pudo conectar con el servidor.')
    cy.get('[data-testid="error-retry"]').should('be.visible')

    cy.get('body').should('not.contain.text', 'TypeError')
    cy.get('body').should('not.contain.text', 'stackTrace')
    cy.get('body').should('not.contain.text', 'Error: ')
  })
})
