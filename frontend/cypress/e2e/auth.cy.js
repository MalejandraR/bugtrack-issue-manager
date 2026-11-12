// Spec Fase 7 — authentication: login through the UI, wrong credentials,
// session gating of the create affordances, route guard, logout and the
// public read path. All UI copy asserted in Spanish.

describe('Autenticación (Fase 7)', () => {
  const authEmail = () => Cypress.expose('authEmail')
  const authPassword = () => Cypress.expose('authPassword')

  it('login con credenciales válidas: muestra el email en el header y guarda la sesión', () => {
    cy.visit('/login')

    cy.get('[data-testid="login-email"]').type(authEmail())
    cy.get('[data-testid="login-password"]').type(authPassword())
    cy.get('[data-testid="login-submit"]').click()

    // Landed on the dashboard with a live session.
    cy.location('pathname').should('eq', '/')
    cy.get('[data-testid="auth-user-email"]').should('have.text', authEmail())
    cy.get('[data-testid="auth-login"]').should('not.exist')
    cy.get('[data-testid="nav-new-issue"]').should('be.visible')
    cy.get('[data-testid="login-error"]').should('not.exist')

    cy.window().then((win) => {
      const stored = JSON.parse(win.localStorage.getItem('bugtrack_auth'))
      expect(stored, 'bugtrack_auth guardado').to.not.equal(null)
      expect(stored.token).to.be.a('string').and.not.equal('')
      expect(stored.email).to.eq(authEmail())
      expect(stored.expiresAt).to.be.greaterThan(Date.now())
    })
  })

  it('contraseña incorrecta: muestra el error amigable en español y no guarda la sesión', () => {
    cy.visit('/login')

    cy.get('[data-testid="login-email"]').type(authEmail())
    cy.get('[data-testid="login-password"]').type('esta-no-es-la-password')
    cy.get('[data-testid="login-submit"]').click()

    cy.get('[data-testid="login-error"]', { timeout: 10000 })
      .should('be.visible')
      .and('contain.text', 'Email o contraseña incorrectos.')
    cy.location('pathname').should('eq', '/login')
    cy.get('[data-testid="auth-user-email"]').should('not.exist')

    cy.window().then((win) => {
      expect(win.localStorage.getItem('bugtrack_auth')).to.equal(null)
    })
  })

  it('sin sesión: el header oculta "+ Nueva" y muestra "Ingresar"', () => {
    cy.visit('/issues')

    cy.get('[data-testid="auth-login"]').should('be.visible').and('have.text', 'Ingresar')
    cy.get('[data-testid="nav-new-issue"]').should('not.exist')
    cy.get('[data-testid="issues-new-issue"]').should('not.exist')
    cy.get('[data-testid="auth-user-email"]').should('not.exist')

    cy.visit('/')
    cy.get('[data-testid="dashboard-new-issue"]').should('not.exist')
  })

  it('visitar /issues/new sin sesión redirige a /login', () => {
    cy.visit('/issues/new')

    cy.location('pathname').should('eq', '/login')
    cy.get('[data-testid="login-form"]').should('be.visible')
    cy.get('[data-testid="issue-form"]').should('not.exist')
  })

  it('visitar /issues/1/edit sin sesión redirige a /login', () => {
    cy.visit('/issues/1/edit')

    cy.location('pathname').should('eq', '/login')
    cy.get('[data-testid="login-form"]').should('be.visible')
  })

  it('logout: limpia la sesión del localStorage y vuelve a mostrar "Ingresar"', () => {
    cy.login()

    cy.get('[data-testid="auth-user-email"]').should('be.visible')
    cy.get('[data-testid="auth-logout"]').should('have.text', 'Salir').click()

    cy.get('[data-testid="auth-login"]').should('be.visible')
    cy.get('[data-testid="auth-user-email"]').should('not.exist')
    cy.get('[data-testid="nav-new-issue"]').should('not.exist')
    cy.window().then((win) => {
      expect(win.localStorage.getItem('bugtrack_auth')).to.equal(null)
    })
  })

  it('el listado y el detalle siguen siendo públicos sin sesión', () => {
    cy.apiCreateIssue({ title: 'Visible sin sesión' }).then((issue) => {
      // No cy.login(): navegamos realmente deslogueados.
      cy.visit('/issues')

      cy.get(`[data-testid="issue-row-${issue.id}"]`).should('be.visible')
      cy.get(`[data-testid="issue-title-${issue.id}"]`).should(
        'have.text',
        'Visible sin sesión',
      )
      cy.get('[data-testid="issues-count-subtitle"]').should('contain.text', 'incidencia')
      // Read-only: sin sesión no hay select de estado ni acción "Editar".
      cy.get(`[data-testid="issue-status-select-${issue.id}"]`).should('not.exist')
      cy.get(`[data-testid="issue-status-static-${issue.id}"]`).should('be.visible')
      cy.get(`[data-testid="issue-edit-${issue.id}"]`).should('not.exist')
      cy.get('[data-testid="auth-login"]').should('be.visible')

      // Detalle (drawer) también público.
      cy.get(`[data-testid="issue-view-${issue.id}"]`).click()
      cy.get('[data-testid="issue-detail-title"]').should('have.text', 'Visible sin sesión')
      cy.get('[data-testid="status-select"]').should('not.exist')
      cy.get('[data-testid="status-static"]').should('be.visible')
      cy.get('[data-testid="issue-detail-edit"]').should('not.exist')
    })
  })
})
