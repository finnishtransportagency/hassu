describe("11 - Projektin kuulutus", () => {
  const projektiNimi = Cypress.env("projektiNimi");
  const oid = Cypress.env("oid");

  before(() => {
    cy.abortEarly();
  });

  it("Hae kuulutussyöte Suomeksi", function () {
    const credentials = Cypress.env("IlmoitustauluSyoteCredentials").split("=");
    cy.request({
      url: Cypress.env("host") + "/api/kuulutukset?kieli=SUOMI",
      auth: { username: credentials[0], password: credentials[1] },
      timeout: 30000,
    }).then((response) => {
      expect(response.status).to.be.eq(200);
      expect(response.headers["content-type"]).to.be.eq("application/rss+xml; charset=UTF-8");
      expect(response.body).to.contain("Kuulutus suunnittelun aloittamisesta: " + projektiNimi);
    });
  });

  it("Hae projektin tiedot", function () {
    const credentials = Cypress.env("IlmoitustauluSyoteCredentials").split("=");
    cy.request({
      url: Cypress.env("host") + "/api/projekti/" + oid + "/tiedot.json",
      auth: { username: credentials[0], password: credentials[1] },
      timeout: 30000,
    }).then((response) => {
      expect(response.status).to.be.eq(200);
      expect(response.headers["content-type"]).to.be.eq("application/json; charset=UTF-8");
      cy.log(response.body);
      expect(response.body.nimi.SUOMI).to.eq(projektiNimi);
      expect(response.body.nimi.RUOTSI).to.eq(projektiNimi + " ruotsiksi");
    });
  });
});
