import * as dayjs from "dayjs";

export function selectFromDropdown(elementId, valueText) {
  cy.get(elementId).click();
  cy.get("li")
    .contains(new RegExp("^" + valueText + "$"))
    .click();
}

export function capturePDFPreview() {
  const pdfs = [];
  cy.get('[name="tallennaProjektiInput"')
    .parent()
    .then((form) => {
      let stub = cy.stub(form.get()[0] as HTMLFormElement, "submit").as("formSubmit");
      stub.callsFake(() => {
        let action = form.get()[0].getAttribute("action");
        let tallennaProjektiInput = form.get()[0].children.namedItem("tallennaProjektiInput").getAttribute("value");
        let asiakirjaTyyppi = form.get()[0].children.namedItem("asiakirjaTyyppi").getAttribute("value");
        pdfs.push({
          action: action,
          tallennaProjektiInput: tallennaProjektiInput,
          asiakirjaTyyppi: asiakirjaTyyppi,
        });
      });
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

export function selectAineistotFromCategory(accordion: string, aineistojenNimet: string[]) {
  cy.get(accordion).click();
  aineistojenNimet.forEach((nimi) => {
    cy.get("#aineisto_accordion_Suunnitelma-aineisto")
      .contains(nimi)
      .parentsUntil("div[data-index]")
      .find('input[name*="select_row_"]')
      .first()
      .click();
  });
}

export function typeIntoFields(selectorToTextMap: Record<string, string>) {
  Object.entries(selectorToTextMap).forEach(([selector, text]) => {
    cy.get(selector, {
      timeout: 10000,
    })
      .should("be.enabled")
      .type(CLEAR_ALL + text, { delay: 1 });
  });
}

type VerifyAllDownloadLinksOptions = {
  absoluteURLs?: boolean;
};

export function verifyAllDownloadLinks(opts?: VerifyAllDownloadLinksOptions) {
  const baseUrl = Cypress.env("host");
  cy.get(".file_download").then((links) => {
    for (const link of links.get()) {
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

export const formatDate = (date?) => {
  return dayjs(date).format("DD.MM.YYYY");
};

export const CLEAR_ALL = "{selectall}{backspace}";
