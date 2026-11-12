import { defineConfig } from 'cypress'

export default defineConfig({
  // Cypress 16 removed Cypress.env(): public (non-sensitive) config is now
  // declared under `expose` and read with Cypress.expose('apiBaseUrl').
  // The auth credentials below are the seeded e2e admin (backend AUTH_ADMIN_*):
  // they must match the account the backend seeds. Override without editing this
  // file via BUGTRACK_E2E_EMAIL / BUGTRACK_E2E_PASSWORD (plain env vars — this
  // file runs in Node, not in the browser).
  expose: {
    apiBaseUrl: 'http://localhost:8080/api',
    authEmail: process.env.BUGTRACK_E2E_EMAIL || 'admin@bugtrack.local',
    authPassword: process.env.BUGTRACK_E2E_PASSWORD || 'Bugtrack-E2E-2026!',
  },
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    video: false,
  },
})
