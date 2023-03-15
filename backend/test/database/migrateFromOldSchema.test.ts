import { describe, it } from "mocha";
import { VuorovaikutusTilaisuusTyyppi } from "../../../common/graphql/apiModel";
import { DBProjekti } from "../../src/database/model";
import { migrateFromOldSchema } from "../../src/database/schemaUpgrade";

const { expect } = require("chai");

describe("migrateFromOldSchema", () => {
  it("should migate suunnitteluvaihe from before multi language support to the new form", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "SAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: "arvio",
        suunnittelunEteneminenJaKesto: "kesto",
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            nimi: "",
            url: "http://www.1.fi",
          },
          {
            nimi: "",
            url: "http://www.2.fi",
          },
        ],
        suunnittelumateriaali: {
          nimi: "suunnittelumateriaali",
          url: "http://www.suunnittelumateriaali.fi",
        },
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: "Tilaisuuden nimi",
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            paatyymisAika: "14:00",
            paikka: "Tilaisuuden paikka",
            osoite: "Osoite 123",
            postinumero: "12345",
            postitoimipaikka: "Postitoimipaikka",
            Saapumisohje: "Saapumisohje",
          },
        ],
      },
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "SAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
          },
          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
          },
        ],
        suunnittelumateriaali: {
          SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
        },
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka" },
            osoite: { SUOMI: "Osoite 123" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka" },
            Saapumisohje: { SUOMI: "Saapumisohje" },
          },
        ],
      },
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should tolerate old pdfs in nähtävilläolo", async () => {
    expect(
      migrateFromOldSchema({
        hyvaksymisPaatosVaiheJulkaisut: [
          {
            hyvaksymisPaatosVaihePDFt: {
              SUOMI: {
                hyvaksymisIlmoitusLausunnonantajillePDFPath:
                  "/hyvaksymispaatos/1/62R Ilmoitus hyvaksymispaatoksesta lausunnon antajille.pdf",
                hyvaksymisIlmoitusMuistuttajillePDFPath: "/hyvaksymispaatos/1/63R Ilmoitus hyvaksymispaatoksesta muistuttajille.pdf",
                hyvaksymisKuulutusPDFPath: "/hyvaksymispaatos/1/60R Kuulutus hyvaksymispaatoksen nahtavillaolo.pdf",
                ilmoitusHyvaksymispaatoskuulutuksestaKunnillePDFPath:
                  "/hyvaksymispaatos/1/61R Ilmoitus hyvaksymispaatoksesta kunnalle ja ELYlle.pdf",
                ilmoitusHyvaksymispaatoskuulutuksestaToiselleViranomaisellePDFPath:
                  "/hyvaksymispaatos/1/12R Ilmoitus hyvaksymispaatoksen kuulutuksesta.pdf",
              },
            },
          },
        ],
      } as any as DBProjekti)
    ).toMatchSnapshot();
  });
});
