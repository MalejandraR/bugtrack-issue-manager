import { defineConfig } from 'cypress'

export default defineConfig({
  // Cypress 16 removed Cypress.env(): public (non-sensitive) config is now
  // declared under `expose` and read with Cypress.expose('apiBaseUrl').
  expose: {
    apiBaseUrl: 'http://localhost:8080/api',
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
  },
})
