export function capturePDFPreview() {
  const pdfs = [];
  cy.get("[name=\"tallennaProjektiInput\"")
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
            asiakirjaTyyppi: asiakirjaTyyppi
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
        cy.request("POST", pdf.action, { tallennaProjektiInput: pdf.tallennaProjektiInput, asiakirjaTyyppi: pdf.asiakirjaTyyppi }).then((response) => {
          expect(response.status).to.eq(200);
        });
      }
    });
}
