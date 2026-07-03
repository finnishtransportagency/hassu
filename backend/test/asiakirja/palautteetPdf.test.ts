// Contains code generated or recommended by Amazon Q
import { PalautteetPdf } from "../../src/asiakirja/palautteetPdf";
import { Palaute } from "../../src/database/model";
import { expect } from "chai";

const LONG_TEXT =
  "Rakentamisen tilaajan projektipäällikkö vastaa siitä, että suunnitteluperusteet tulee olla " +
  "laadittuna ennen kuin 3.2 Rakentamissuunnittelutoimeksianto alkaa. Rakentamisen tilaajan " +
  "projektipäällikkö varmistaa suunnitteluperusteiden päivityksen myös ennen rakentamisen aloitusta. " +
  "Tilaajan projektipäällikkö, rakennuttaja tai suunnittelija voi päivittää suunnitteluperusteita. " +
  "Suunnitteluperusteiden hyväksymismenettelystä on kerrottu Väyläviraston ohjeessa 38/2021. " +
  "Rakentamisen tilaajan projektipäällikkö tulisi olla nimettynä kohteelle toteuttamisen asiantuntijana " +
  "suunnitteluperusteiden laatimisessa Väylähankkeiden suunnitteluperusteiden menettelykuvaus -ohjeen " +
  "mukaisesti. Suunnitteluperusteet on asiakirja, johon on koottu suunnittelukohteen tilaajan asettamat tavoitteet, " +
  "lähtökohdat sekä sellaiset suunnittelua ohjaavat tekniset asiat, joissa on tehty päätöksiä joko " +
  "aiemassa suunnitteluvaiheessa tai muutoin ennen varsinaisen suunnittelutyön käynnistymistä. " +
  "Väylävirastossa on nimetty väylämuotokohtaisesti suunnitteluperusteiden yhdyshenkilöt suunnittelun, " +
  "rakentamisen, kunnossapidon, erityistekniikoiden sekä tarvittaessa osallistuvien tekniikoiden osalta. " +
  "Yhteyshenkilöt osallistuvat suunnitteluperusteiden laadintaan ja kommentoivat suunnitteluperusteita. " +
  "Suunnitteluperusteissa esitetään myös muita toimijoita ja sidosryhmiä koskevat vaatimukset hankkeessa, " +
  "jossa Väylävirasto on osapuolena.";

function createPalaute(id: number): Palaute {
  return {
    oid: "1.2.3",
    id: `palaute-${id}`,
    vastaanotettu: "2025-05-08T12:04:00+03:00",
    etunimi: `testi${id}`,
    sukunimi: "testaaja",
    sahkoposti: `testi${id}@example.com`,
    puhelinnumero: "0401234567",
    kysymysTaiPalaute: LONG_TEXT + "\n",
    yhteydenottotapaEmail: false,
    yhteydenottotapaPuhelin: false,
    liite: null,
    liitteet: null,
  };
}

describe("PalautteetPdf", () => {
  it("generates a valid PDF with multiple palautteet", async () => {
    const palautteet: Palaute[] = [];
    for (let i = 1; i <= 12; i++) {
      palautteet.push(createPalaute(i));
    }

    const pdf = await new PalautteetPdf("Testiprojekti", palautteet).pdf();
    expect(pdf).to.exist;
    expect(pdf.nimi).to.equal("Palautteet.pdf");
    expect(pdf.sisalto).to.be.a("string");
    expect(pdf.sisalto.length).to.be.greaterThan(0);
  });

  it("generates a valid PDF with yhteydenottotapa fields", async () => {
    const palautteet: Palaute[] = [
      {
        oid: "1.2.3",
        id: "palaute-yhteydenotto",
        vastaanotettu: "2025-05-08T12:04:00+03:00",
        etunimi: "Matti",
        sukunimi: "Meikäläinen",
        sahkoposti: "matti@example.com",
        puhelinnumero: "0401234567",
        kysymysTaiPalaute: LONG_TEXT,
        yhteydenottotapaEmail: true,
        yhteydenottotapaPuhelin: true,
        liite: null,
        liitteet: null,
      },
    ];

    const pdf = await new PalautteetPdf("Testiprojekti", palautteet).pdf();
    expect(pdf).to.exist;
    expect(pdf.sisalto).to.be.a("string");
    expect(pdf.sisalto.length).to.be.greaterThan(0);
  });

  it("handles empty palautteet list", async () => {
    const pdf = await new PalautteetPdf("Testiprojekti", []).pdf();
    expect(pdf).to.exist;
    expect(pdf.nimi).to.equal("Palautteet.pdf");
  });
});
