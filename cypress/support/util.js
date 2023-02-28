export function capturePDFPreview() {
  const pdfs = [];
  cy.get('[name="tallennaProjektiInput"')
    .parent()
    .then((form) => {
      cy.stub(form.get()[0], "submit")
        .callsFake((a, b, c) => {
          let action = form.get()[0].getAttribute("action");
          let tallennaProjektiInput = form.get()[0].children.namedItem("tallennaProjektiInput").getAttribute("value");
          let asiakirjaTyyppi = form.get()[0].children.namedItem("asiakirjaTyyppi").getAttribute("value");
          pdfs.push({
            action: action,
            tallennaProjektiInput: tallennaProjektiInput,
            asiakirjaTyyppi: asiakirjaTyyppi,
          });
        })
        .as("formSubmit");
    });
  return pdfs;
}

export function requestPDFs(pdfs) {
  cy.get("@formSubmit")
    .should("have.been.called")
    .then(() => {
      for (const pdf of pdfs) {
        cy.request("POST", pdf.action, { tallennaProjektiInput: pdf.tallennaProjektiInput, asiakirjaTyyppi: pdf.asiakirjaTyyppi }).then(
          (response) => {
            expect(response.status).to.eq(200);
          }
        );
      }
    });
}

export function selectAllAineistotFromCategory(accordion) {
  cy.get(accordion).click();
  cy.get(accordion + " input[type='checkbox']")
    .should(($tr) => {
      expect($tr).to.have.length.gte(2);
    })
    .wait(1000);
  cy.get(accordion)
    .contains("Valitse")
    .should("be.visible")
    .parent()
    .within(() => {
      cy.get("input[type='checkbox']").click();
    });
}

export function typeIntoFields(selectorToTextMap) {
  selectorToTextMap.forEach((text, selector) => {
    cy.get(selector, {
      timeout: 10000,
    })
      .should("be.enabled")
      .clear()
      .type(text, { delay: 1 });
  });
}

export function verifyAllDownloadLinks(opts) {
  const baseUrl = Cypress.env("host");
  cy.get(".file_download").then((links) => {
    for (const link of links) {
      let href = link.getAttribute("href");
      if (href) {
        let url;
        if (opts?.absoluteURLs) {
          url = href;
        } else {
          url = baseUrl + href;
        }
        cy.request("GET", url).then((response) => {
          expect(response.status).to.eq(200);
        });
      }
    }
  });
}
