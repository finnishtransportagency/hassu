// Ignore javascript error on login page
Cypress.on("uncaught:exception", (err) => {
  if (err.message.indexOf("saveLastUsername") > 0) {
    return false;
  }
});

describe("Login", () => {
  it("Ohjaa kirjautumaton kirjautumissivulle", () => {
    cy.clearCookies();
    if (Cypress.env("localServer") === true) {
      cy.intercept("/yllapito/graphql", (req) =>
        req.reply({ statusCode: 302, headers: { location: "https://www.vayla.fi/should_not_actually_redirect_here" } })
      ).as("graphql");
      cy.visit(Cypress.env("host") + "/yllapito");
      cy.wait("@graphql");
      cy.url().should("contain", "login");
    } else {
      cy.visit(Cypress.env("host") + "/yllapito");
      cy.url().should("contain", "login");
    }
  });

  it("Kirjaudu A1 käyttäjänä", () => {
    cy.login("A1");
    cy.visit(Cypress.env("host") + "/yllapito");
  });
});
