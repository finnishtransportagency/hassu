import { describe, it } from "mocha";
import { AineistoTila, Kieli, VuorovaikutusTilaisuusTyyppi } from "hassu-common/graphql/apiModel";
import { Aineisto, DBProjekti } from "../../src/database/model";
import { migrateFromOldSchema } from "../../src/database/projektiSchemaUpdate";
import MockDate from "mockdate";
import { expect } from "chai";
import { VuorovaikutusAineistoKategoria } from "hassu-common/vuorovaikutusAineistoKategoria";
import { uuid } from "hassu-common/util/uuid";
import sinon from "sinon";
import { nyt } from "../../src/util/dateUtil";
import cloneDeepWith from "lodash/cloneDeepWith";

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
            lisatiedot: "lisatiedot",
          },
        ],
      },
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
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
        suunnittelumateriaali: [
          {
            SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
          },
        ],
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
            lisatiedot: { SUOMI: "lisatiedot" },
          },
        ],
      },
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should migate suunnitteluvaihe from including SAAME multi language to not including it", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "SAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", SAAME: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", SAAME: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            SAAME: { nimi: "", url: "http://www.1.fi" },
          },
          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            SAAME: { nimi: "", url: "http://www.2.fi" },
          },
        ],
        suunnittelumateriaali: {
          SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
          SAAME: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
        },
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi", SAAME: "Tilaisuuden nimi" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka", SAAME: "Tilaisuuden paikka" },
            osoite: { SUOMI: "Osoite 123", SAAME: "Osoite 123" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka", SAAME: "Postitoimipaikka" },
            lisatiedot: { SUOMI: "lisatiedot", SAAME: "lisatiedot" },
          },
        ],
      },
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
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
        suunnittelumateriaali: [
          {
            SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
          },
        ],
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
            lisatiedot: { SUOMI: "lisatiedot" },
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

  it("should migrate suunnitteluvaihe from multilanguage (done always after database fetch and before adapters) and keep swedish translations in place", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "RUOTSI",
        projektinNimiToisellaKielellä: "Projekts namn på svenska",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", RUOTSI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", RUOTSI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            RUOTSI: { nimi: "", url: "http://www.1.fi/sv" },
          },
          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            RUOTSI: { nimi: "", url: "http://www.2.fi/sv" },
          },
        ],
        suunnittelumateriaali: {
          SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
          RUOTSI: { nimi: "planering material", url: "http://www.suunnittelumateriaali.fi/sv" },
        },
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi", RUOTSI: "Tilaisuuden nimi sv" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka", RUOTSI: "Tilaisuuden paikka sv" },
            osoite: { SUOMI: "Osoite 123", RUOTSI: "Osoite 123 sv" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka", RUOTSI: "Postitoimipaikka sv" },
            lisatiedot: { SUOMI: "lisatiedot", RUOTSI: "lisatiedot sv" },
          },
        ],
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "RUOTSI",
        projektinNimiToisellaKielellä: "Projekts namn på svenska",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", RUOTSI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", RUOTSI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            RUOTSI: { nimi: "", url: "http://www.1.fi/sv" },
          },
          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            RUOTSI: { nimi: "", url: "http://www.2.fi/sv" },
          },
        ],
        suunnittelumateriaali: [
          {
            SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
            RUOTSI: { nimi: "planering material", url: "http://www.suunnittelumateriaali.fi/sv" },
          },
        ],
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi", RUOTSI: "Tilaisuuden nimi sv" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka", RUOTSI: "Tilaisuuden paikka sv" },
            osoite: { SUOMI: "Osoite 123", RUOTSI: "Osoite 123 sv" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka", RUOTSI: "Postitoimipaikka sv" },
            lisatiedot: { SUOMI: "lisatiedot", RUOTSI: "lisatiedot sv" },
          },
        ],
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate suunnitteluvaihe including Saapumisohje to including lisatiedot", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "RUOTSI",
        projektinNimiToisellaKielellä: "Projekts namn på svenska",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", RUOTSI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", RUOTSI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            RUOTSI: { nimi: "", url: "http://www.1.fi/sv" },
          },
          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            RUOTSI: { nimi: "", url: "http://www.2.fi/sv" },
          },
        ],
        suunnittelumateriaali: {
          SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
          RUOTSI: { nimi: "planering material", url: "http://www.suunnittelumateriaali.fi/sv" },
        },
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi", RUOTSI: "Tilaisuuden nimi sv" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka", RUOTSI: "Tilaisuuden paikka sv" },
            osoite: { SUOMI: "Osoite 123", RUOTSI: "Osoite 123 sv" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka", RUOTSI: "Postitoimipaikka sv" },
            Saapumisohjeet: { SUOMI: "Saapumisohjeet", RUOTSI: "Saapumisohjeet sv" },
          },
        ],
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "RUOTSI",
        projektinNimiToisellaKielellä: "Projekts namn på svenska",
      },
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", RUOTSI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", RUOTSI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            RUOTSI: { nimi: "", url: "http://www.1.fi/sv" },
          },
          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            RUOTSI: { nimi: "", url: "http://www.2.fi/sv" },
          },
        ],
        suunnittelumateriaali: [
          {
            SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
            RUOTSI: { nimi: "planering material", url: "http://www.suunnittelumateriaali.fi/sv" },
          },
        ],
        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi", RUOTSI: "Tilaisuuden nimi sv" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            lisatiedot: { SUOMI: "Saapumisohjeet", RUOTSI: "Saapumisohjeet sv" },
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka", RUOTSI: "Tilaisuuden paikka sv" },
            osoite: { SUOMI: "Osoite 123", RUOTSI: "Osoite 123 sv" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka", RUOTSI: "Postitoimipaikka sv" },
          },
        ],
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate suunnitteluvaihe with vuorovaikutusTilaisuudet including Saapumisohje and only one language to including lisatiedot ja localizations", async () => {
    const oldForm = {
      versio: 1,

      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "RUOTSI",
        projektinNimiToisellaKielellä: "Projekts namn på svenska",
      },

      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", RUOTSI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", RUOTSI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            RUOTSI: { nimi: "", url: "http://www.1.fi/sv" },
          },

          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            RUOTSI: { nimi: "", url: "http://www.2.fi/sv" },
          },
        ],

        suunnittelumateriaali: {
          SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
          RUOTSI: { nimi: "planering material", url: "http://www.suunnittelumateriaali.fi/sv" },
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
            Saapumisohjeet: "Saapumisohjeet",
          },
        ],
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "RUOTSI",
        projektinNimiToisellaKielellä: "Projekts namn på svenska",
      },

      vuorovaikutusKierros: {
        vuorovaikutusNumero: 0,
        arvioSeuraavanVaiheenAlkamisesta: { SUOMI: "arvio", RUOTSI: "arvio" },
        suunnittelunEteneminenJaKesto: { SUOMI: "kesto", RUOTSI: "kesto" },
        vuorovaikutusJulkaisuPaiva: "2023-01-01",
        videot: [
          {
            SUOMI: { nimi: "", url: "http://www.1.fi" },
            RUOTSI: { nimi: "", url: "http://www.1.fi/sv" },
          },

          {
            SUOMI: { nimi: "", url: "http://www.2.fi" },
            RUOTSI: { nimi: "", url: "http://www.2.fi/sv" },
          },
        ],

        suunnittelumateriaali: [
          {
            SUOMI: { nimi: "suunnittelumateriaali", url: "http://www.suunnittelumateriaali.fi" },
            RUOTSI: { nimi: "planering material", url: "http://www.suunnittelumateriaali.fi/sv" },
          },
        ],

        vuorovaikutusTilaisuudet: [
          {
            tyyppi: VuorovaikutusTilaisuusTyyppi.PAIKALLA,
            nimi: { SUOMI: "Tilaisuuden nimi", RUOTSI: "Tilaisuuden nimi" },
            paivamaara: "2023-02-01",
            alkamisAika: "13:00",
            lisatiedot: { SUOMI: "Saapumisohjeet", RUOTSI: "Saapumisohjeet" },
            paatyymisAika: "14:00",
            paikka: { SUOMI: "Tilaisuuden paikka", RUOTSI: "Tilaisuuden paikka" },
            osoite: { SUOMI: "Osoite 123", RUOTSI: "Osoite 123" },
            postinumero: "12345",
            postitoimipaikka: { SUOMI: "Postitoimipaikka", RUOTSI: "Postitoimipaikka" },
          },
        ],
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not mess up suunnittelumateriaali, if it's already in the correct format", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",

        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 0,
        },
      ],
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 0,
          yhteystiedot: [],
          esitettavatYhteystiedot: {
            yhteysHenkilot: [],
            yhteysTiedot: [],
          },
        },
      ],
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should migate vuorovaikutusKierrosJulkaisu from not including esitettavatYhteystiedot to inluding esitettavatYhteystiedot based on yhteystiedot", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 0,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
        },
      ],
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 0,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
          esitettavatYhteystiedot: {
            yhteysHenkilot: [],
            yhteysTiedot: [
              {
                etunimi: "Joku",
                sukunimi: "Jokunen",
                sahkoposti: "Joku.Jokunen@vayla.fi",
                organisaatio: "",
                puhelinnumero: "02998765",
                titteli: "Konsultti",
              },
            ],
          },
        },
      ],
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should not change vuorovaikutusKierrosJulkaisu if it already contains esitettavatYhteystiedot and yhteystiedot", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 0,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
          esitettavatYhteystiedot: {
            yhteysTiedot: ["a"],
            yhteysHenkilot: [],
          },
        },
      ],
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 0,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
          esitettavatYhteystiedot: {
            yhteysTiedot: ["a"],
            yhteysHenkilot: [],
          },
        },
      ],
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should migate nahtavillaoloJulkaisu from not including kuulutusYhteystiedot to inluding kuulutusYhteystiedot", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
        },
      ],
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
          kuulutusYhteystiedot: {
            yhteysHenkilot: [],
            yhteysTiedot: [
              {
                etunimi: "Joku",
                sukunimi: "Jokunen",
                sahkoposti: "Joku.Jokunen@vayla.fi",
                organisaatio: "",
                puhelinnumero: "02998765",
                titteli: "Konsultti",
              },
            ],
          },
        },
      ],
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  it("should not change nahtavillaoloJulkaisu if it already contains kuulutusYhteystiedot", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
          kuulutusYhteystiedot: {
            yhteysTiedot: [
              {
                etunimi: "Joku",
                sukunimi: "Jokunen",
                sahkoposti: "Joku.Jokunen@vayla.fi",
                organisaatio: "",
                puhelinnumero: "02998765",
                titteli: "Konsultti",
              },
            ],
            yhteysHenkilot: ["a"],
          },
        },
      ],
    };
    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
        toissijainenKieli: "POHJOISSAAME",
        projektinNimiToisellaKielellä: "Projektin nimi",
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          yhteystiedot: [
            {
              etunimi: "Joku",
              sukunimi: "Jokunen",
              sahkoposti: "Joku.Jokunen@vayla.fi",
              organisaatio: "",
              puhelinnumero: "02998765",
              titteli: "Konsultti",
            },
          ],
          kuulutusYhteystiedot: {
            yhteysTiedot: [
              {
                etunimi: "Joku",
                sukunimi: "Jokunen",
                sahkoposti: "Joku.Jokunen@vayla.fi",
                organisaatio: "",
                puhelinnumero: "02998765",
                titteli: "Konsultti",
              },
            ],
            yhteysHenkilot: ["a"],
          },
        },
      ],
    };
    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);
    expect(migratoitu).to.eql(newForm);
  });

  //

  it("should migrate euRahoitusLogot to new form", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      euRahoitusLogot: {
        logoFI: "logoFI.png",
        logoSV: "logoSV.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
        RUOTSI: "logoSV.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not change euRahoitusLogot if it's already in the new from with two languages", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
        RUOTSI: "logoSV.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
        RUOTSI: "logoSV.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate euRahoitusLogot to new form when there is no second language", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        logoFI: "logoFI.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate euRahoitusLogot to new form when second language is POHJOISSAAME", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.POHJOISSAAME,
      },
      euRahoitusLogot: {
        logoFI: "logoFI.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.POHJOISSAAME,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not change euRahoitusLogot if it's already in the new from with one language", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not change euRahoitusLogot if it's already in the new from, even though the current form has extra information", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
        RUOTSI: "logoSV.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
        RUOTSI: "logoSV.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  //

  it("should migrate suunnitteluSopimus.logo to new form", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      suunnitteluSopimus: {
        logo: "logo.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logo.png",
          RUOTSI: "logo.png",
        },
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not change suunnitteluSopimus.logo if it's already in the new from with two languages", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logo.png",
          RUOTSI: "logo.png",
        },
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.RUOTSI,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logo.png",
          RUOTSI: "logo.png",
        },
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate suunnitteluSopimus.logo to new form when there is no second language", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      suunnitteluSopimus: {
        logo: "logo.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logo.png",
        },
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate suunnitteluSopimus.logo to new form when second language is POHJOISSAAME", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.POHJOISSAAME,
      },
      suunnitteluSopimus: {
        logo: "logo.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: Kieli.POHJOISSAAME,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logo.png",
        },
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not change suunnitteluSopimus.logo if it's already in the new from with one language", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      euRahoitusLogot: {
        SUOMI: "logoFI.png",
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should not change suunnitteluSopimus.logo if it's already in the new from, even though the current form has extra information", async () => {
    const oldForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logoFI.png",
          RUOTSI: "logoSV.png",
        },
      },
    };

    const newForm = {
      versio: 1,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      suunnitteluSopimus: {
        logo: {
          SUOMI: "logoFI.png",
          RUOTSI: "logoSV.png",
        },
      },
    };

    const migratoitu = migrateFromOldSchema(oldForm as any as DBProjekti);

    expect(migratoitu).to.eql(newForm);
  });

  it("should migrate suunnitelmaluonnokset and esittelyaineistot to combined field aineistot", async () => {
    const esittelyaineistot: Omit<Aineisto, "uuid">[] = [
      { dokumenttiOid: "esittely.aineisto.oid", nimi: "Esittelyä", tila: AineistoTila.VALMIS },
    ];
    const suunnitelmaluonnokset: Omit<Aineisto, "uuid">[] = [
      { dokumenttiOid: "suunnitelma.luonnos.oid", nimi: "Suunnittelua", tila: AineistoTila.VALMIS },
    ];
    const oldProjekti: Partial<DBProjekti> = {
      versio: 1,
      vuorovaikutusKierros: { vuorovaikutusNumero: 1, ...{ esittelyaineistot, suunnitelmaluonnokset } },
    };
    const newProjekti: Partial<DBProjekti> = {
      versio: 1,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        aineistot: [
          ...esittelyaineistot.map((aineisto) => ({
            ...aineisto,
            kategoriaId: VuorovaikutusAineistoKategoria.ESITTELYAINEISTO,
            uuid: "***migrationtest***",
          })),
          ...suunnitelmaluonnokset.map((aineisto) => ({
            ...aineisto,
            kategoriaId: VuorovaikutusAineistoKategoria.SUUNNITELMALUONNOS,
            uuid: "***migrationtest***",
          })),
        ],
      },
    };

    const migratoitu = replaceTiedostoAineistoUuid(migrateFromOldSchema(oldProjekti as DBProjekti), "***migrationtest***");

    expect(migratoitu).to.eql(newProjekti);
  });

  function replaceTiedostoAineistoUuid(projekti: Partial<DBProjekti>, replacement: string) {
    return cloneDeepWith(projekti, (value, key) => {
      console.log("key", value);
      if (key == "uuid") {
        return replacement;
      }
    });
  }

  it("should not migrate suunnitelmaluonnokset and esittelyaineistot to combined field aineistot if there is already aineistot field present", async () => {
    const esittelyaineistot: Omit<Aineisto, "uuid">[] = [
      { dokumenttiOid: "esittely.aineisto.oid", nimi: "Esittelyä", tila: AineistoTila.VALMIS },
    ];
    const suunnitelmaluonnokset: Omit<Aineisto, "uuid">[] = [
      { dokumenttiOid: "suunnitelma.luonnos.oid", nimi: "Suunnittelua", tila: AineistoTila.VALMIS },
    ];
    const aineistot: Aineisto[] = [
      {
        dokumenttiOid: "esittelyaineistodokumentti",
        nimi: "Aineistonimi",
        tila: AineistoTila.VALMIS,
        kategoriaId: VuorovaikutusAineistoKategoria.ESITTELYAINEISTO,
        uuid: "jotain",
      },
    ];
    const oldProjekti: Partial<DBProjekti> = {
      versio: 1,
      vuorovaikutusKierros: { vuorovaikutusNumero: 1, aineistot, ...{ esittelyaineistot, suunnitelmaluonnokset } },
    };
    const newProjekti: Partial<DBProjekti> = {
      versio: 1,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        aineistot,
      },
    };

    const migratoitu = migrateFromOldSchema(oldProjekti as DBProjekti);

    expect(migratoitu).to.eql(newProjekti);
  });

  it("should migrate nahtavillaoloVaiheJulkaisu's lisaAineistot to lausuntoPyynto", async () => {
    MockDate.set("2023-12-12");
    const oldForm = {
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      asianhallinta: {
        inaktiivinen: true,
      },
      kasittelynTila: {},
      kayttoOikeudet: [],
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
      },
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1.2.246.578.5.100.2489125316.2057886293",
            jarjestys: 0,
            kategoriaId: "osa_a",
            nimi: "Asiakirjaluettelo_osat_A-C.pdf",
            tiedosto: "/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf",
            tila: "VALMIS",
            tuotu: "2023-12-12T10:34:22+02:00",
          },
        ],
        lisaAineisto: [
          {
            dokumenttiOid: "1.2.246.578.5.100.3042249690.1969582740",
            jarjestys: 0,
            nimi: "aineisto4.txt",
            tiedosto: "/nahtavillaolo/1/aineisto4.txt",
            tila: "VALMIS",
            tuotu: "2023-12-12T10:34:36+02:00",
          },
        ],
        aineistopaketti: "aineistot.zip",
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: "HYVAKSYTTY",
          id: 1,
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1.2.246.578.5.100.2489125316.2057886293",
              jarjestys: 0,
              kategoriaId: "osa_a",
              nimi: "Asiakirjaluettelo_osat_A-C.pdf",
              tiedosto: "/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf",
              tila: "VALMIS",
              tuotu: "2023-12-12T10:34:22+02:00",
            },
          ],
          lisaAineisto: [
            {
              dokumenttiOid: "1.2.246.578.5.100.3042249690.1969582740",
              jarjestys: 0,
              nimi: "aineisto4.txt",
              tiedosto: "/nahtavillaolo/1/aineisto4.txt",
              tila: "VALMIS",
              tuotu: "2023-12-12T10:34:36+02:00",
            },
          ],
          aineistopaketti: "/nahtavillaolo/1/aineisto.zip",
        },
      ],
      salt: "6bf729355075cf0ef460f2d46991e694",
      tyyppi: "TIE",
      vahainenMenettely: false,
      velho: {},
      versio: 7,
    };

    const newForm = {
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      asianhallinta: {
        inaktiivinen: true,
      },
      kasittelynTila: {},
      kayttoOikeudet: [],
      kielitiedot: {
        ensisijainenKieli: "SUOMI",
      },
      nahtavillaoloVaihe: {
        aineistoNahtavilla: [
          {
            dokumenttiOid: "1.2.246.578.5.100.2489125316.2057886293",
            jarjestys: 0,
            kategoriaId: "osa_a",
            nimi: "Asiakirjaluettelo_osat_A-C.pdf",
            tiedosto: "/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf",
            tila: "VALMIS",
            tuotu: "2023-12-12T10:34:22+02:00",
            uuid: "***migrationtest***",
          },
        ],
        lisaAineisto: [
          {
            dokumenttiOid: "1.2.246.578.5.100.3042249690.1969582740",
            jarjestys: 0,
            nimi: "aineisto4.txt",
            tiedosto: "/nahtavillaolo/1/aineisto4.txt",
            tila: "VALMIS",
            tuotu: "2023-12-12T10:34:36+02:00",
          },
        ],
        aineistopaketti: "aineistot.zip",
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          tila: "HYVAKSYTTY",
          id: 1,
          aineistoNahtavilla: [
            {
              dokumenttiOid: "1.2.246.578.5.100.2489125316.2057886293",
              jarjestys: 0,
              kategoriaId: "osa_a",
              nimi: "Asiakirjaluettelo_osat_A-C.pdf",
              tiedosto: "/nahtavillaolo/1/Asiakirjaluettelo_osat_A-C.pdf",
              tila: "VALMIS",
              tuotu: "2023-12-12T10:34:22+02:00",
              uuid: "***migrationtest***",
            },
          ],
          lisaAineisto: [
            {
              dokumenttiOid: "1.2.246.578.5.100.3042249690.1969582740",
              jarjestys: 0,
              nimi: "aineisto4.txt",
              tiedosto: "/nahtavillaolo/1/aineisto4.txt",
              tila: "VALMIS",
              tuotu: "2023-12-12T10:34:36+02:00",
            },
          ],
          aineistopaketti: "/nahtavillaolo/1/aineisto.zip",
          kuulutusYhteystiedot: {
            yhteysHenkilot: [],
            yhteysTiedot: undefined,
          },
        },
      ],
      lausuntoPyynnot: [
        {
          uuid: "***migrationtest***",
          poistumisPaiva: nyt().add(180, "day").format("YYYY-MM-DD"),
          lisaAineistot: [
            {
              jarjestys: 0,
              nimi: "aineisto4.txt",
              tiedosto: "/nahtavillaolo/1/aineisto4.txt",
              tila: "VALMIS",
              tuotu: "2023-12-12T10:34:36+02:00",
              uuid: "***migrationtest***",
            },
          ],
          legacy: 1,
          aineistopaketti: "/nahtavillaolo/1/aineisto.zip",
        },
      ],
      salt: "6bf729355075cf0ef460f2d46991e694",
      tyyppi: "TIE",
      vahainenMenettely: false,
      velho: {},
      versio: 7,
    };
    const migratoitu = replaceTiedostoAineistoUuid(migrateFromOldSchema(oldForm as any as DBProjekti), "***migrationtest***");
    expect(migratoitu).to.eql(newForm);
    MockDate.reset();
  });
});
