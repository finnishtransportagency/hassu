// /cypress/support/index.d.ts
/// <reference  types="cypress" />
import "./commands";
declare global {
  namespace Cypress {
    interface Chainable {
      abortEarly(): Chainable<unknown>;
      login(username: String): void;
      archiveProjekti(oid: String): void;
    }
  }
}
