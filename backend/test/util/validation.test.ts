import { describe, it } from "mocha";
import { isOkToMakeNewVuorovaikutusKierros } from "../../src/util/validation";
import { expect } from "chai";
import MockDate from "mockdate";
import { DBProjekti } from "../../src/database/model";
import { IlmoitettavaViranomainen, VuorovaikutusKierrosTila, VuorovaikutusTilaisuusTyyppi } from "hassu-common/graphql/apiModel";

describe("the validation function named", () => {
  afterEach(() => {
    MockDate.reset();
  });
  it("isOkToMakeNewVuorovaikutusKierros will return false, if there are upcoming tilaisuus", async function () {
    MockDate.set("2023-05-05");
    const project: Partial<DBProjekti> = {
      vuorovaikutusKierros: {
        vuorovaikutusSaamePDFt: {},
        aineistot: [],
        hankkeenKuvaus: { SUOMI: "asdas" },
        videot: [{ SUOMI: { nimi: "", url: "" } }],
        suunnittelunEteneminenJaKesto: {
          SUOMI:
            "Suunnitteluvaihe on oikea aika perehtyä ja vaikuttaa suunnitelmaratkaisuihin sekä tuoda esiin suunnitelman viimeistelyyn mahdollisesti vaikuttavia tietoja paikallisista olosuhteista. Suunnittelun aikaisessa vuorovaikutuksessa esitellään suunnitelman luonnoksia ja suunnitelmaratkaisuja. Suunnitelmaluonnoksista on mahdollista antaa palautetta sekä esittää kysymyksiä. \n\nLuonnosten esittelyn jälkeen saadut palautteet ja kysymykset käydään läpi ja suunnitelma viimeistellään. Tämän jälkeen valmis suunnitelma asetetaan nähtäville, jolloin asianosaisilla on mahdollisuus jättää suunnitelmasta virallinen muistutus.",
        },
        kysymyksetJaPalautteetViimeistaan: "2023-05-12",
        ilmoituksenVastaanottajat: {
          kunnat: [
            {
              messageId: "<76a9273b-f467-5656-7018-b589d2ebe270@vayliensuunnittelu.fi>",
              sahkoposti: "helsinki@helsinki.fi",
              lahetetty: "2023-05-05T13:10",
              id: 91,
            },
            {
              messageId: "<76a9273b-f467-5656-7018-b589d2ebe270@vayliensuunnittelu.fi>",
              sahkoposti: "vantaa@vantaa.fi",
              lahetetty: "2023-05-05T13:10",
              id: 92,
            },
          ],
          viranomaiset: [
            {
              messageId: "<76a9273b-f467-5656-7018-b589d2ebe270@vayliensuunnittelu.fi>",
              sahkoposti: "kirjaamo.uusimaa@ely-keskus.fi",
              lahetetty: "2023-05-05T13:10",
              nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY,
            },
          ],
        },
        vuorovaikutusTilaisuudet: [
          {
            alkamisAika: "17:10",
            paivamaara: "2023-05-12",
            nimi: { SUOMI: "" },
            paattymisAika: "17:10",
            tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
            esitettavatYhteystiedot: { yhteysHenkilot: ["LX523753"] },
          },
        ],
        vuorovaikutusJulkaisuPaiva: "2023-05-11",
        vuorovaikutusNumero: 2,
        tila: VuorovaikutusKierrosTila.JULKINEN,
        suunnittelumateriaali: [{ SUOMI: { nimi: "", url: "" } }],
        arvioSeuraavanVaiheenAlkamisesta: null,
      },
      oid: "1.2.246.578.5.1.2978288874.2711575506",
      vuorovaikutusKierrosJulkaisut: [
        {
          vuorovaikutusSaamePDFt: {},
          aineistot: [],
          hankkeenKuvaus: { SUOMI: "asdas" },
          videot: [{ SUOMI: { nimi: "", url: "" } }],
          suunnittelunEteneminenJaKesto: {
            SUOMI:
              "Suunnitteluvaihe on oikea aika perehtyä ja vaikuttaa suunnitelmaratkaisuihin sekä tuoda esiin suunnitelman viimeistelyyn mahdollisesti vaikuttavia tietoja paikallisista olosuhteista. Suunnittelun aikaisessa vuorovaikutuksessa esitellään suunnitelman luonnoksia ja suunnitelmaratkaisuja. Suunnitelmaluonnoksista on mahdollista antaa palautetta sekä esittää kysymyksiä. \n\nLuonnosten esittelyn jälkeen saadut palautteet ja kysymykset käydään läpi ja suunnitelma viimeistellään. Tämän jälkeen valmis suunnitelma asetetaan nähtäville, jolloin asianosaisilla on mahdollisuus jättää suunnitelmasta virallinen muistutus.",
          },
          kysymyksetJaPalautteetViimeistaan: "2023-05-05",
          ilmoituksenVastaanottajat: {
            kunnat: [
              { sahkoposti: "helsinki@helsinki.fi", id: 91 },
              { sahkoposti: "vantaa@vantaa.fi", id: 92 },
            ],
            viranomaiset: [{ nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY, sahkoposti: "kirjaamo.uusimaa@ely-keskus.fi" }],
          },
          vuorovaikutusTilaisuudet: [
            {
              yhteystiedot: [
                {
                  sukunimi: "Korkalainen",
                  sahkoposti: "tomi.korkalainen@cgi.com",
                  puhelinnumero: "029213132",
                  organisaatio: "CGI Suomi Oy",
                  etunimi: "Tomi",
                },
              ],
              alkamisAika: "16:06",
              paivamaara: "2022-01-01",
              nimi: { SUOMI: "" },
              paattymisAika: "17:06",
              tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
            },
          ],
          vuorovaikutusPDFt: { SUOMI: { kutsuPDFPath: "/suunnitteluvaihe/vuorovaikutus_1/T413 Kutsu vuorovaikutukseen.pdf" } },
          yhteystiedot: [
            {
              sukunimi: "Hassu",
              sahkoposti: "mikko.haapamki@cgi.com",
              puhelinnumero: "02921312",
              organisaatio: "CGI Suomi Oy",
              etunimi: "A-tunnus1",
            },
          ],
          vuorovaikutusJulkaisuPaiva: "2023-05-05",
          id: 1,
          tila: VuorovaikutusKierrosTila.JULKINEN,
          suunnittelumateriaali: [{ SUOMI: { nimi: "", url: "" } }],
          arvioSeuraavanVaiheenAlkamisesta: null,
          esitettavatYhteystiedot: {},
        },
        {
          vuorovaikutusSaamePDFt: {},
          aineistot: [],
          hankkeenKuvaus: { SUOMI: "asdas" },
          videot: [{ SUOMI: { nimi: "", url: "" } }],
          suunnittelunEteneminenJaKesto: {
            SUOMI:
              "Suunnitteluvaihe on oikea aika perehtyä ja vaikuttaa suunnitelmaratkaisuihin sekä tuoda esiin suunnitelman viimeistelyyn mahdollisesti vaikuttavia tietoja paikallisista olosuhteista. Suunnittelun aikaisessa vuorovaikutuksessa esitellään suunnitelman luonnoksia ja suunnitelmaratkaisuja. Suunnitelmaluonnoksista on mahdollista antaa palautetta sekä esittää kysymyksiä. \n\nLuonnosten esittelyn jälkeen saadut palautteet ja kysymykset käydään läpi ja suunnitelma viimeistellään. Tämän jälkeen valmis suunnitelma asetetaan nähtäville, jolloin asianosaisilla on mahdollisuus jättää suunnitelmasta virallinen muistutus.",
          },
          kysymyksetJaPalautteetViimeistaan: "2023-05-12",
          ilmoituksenVastaanottajat: {
            kunnat: [
              { sahkoposti: "helsinki@helsinki.fi", id: 91 },
              { sahkoposti: "vantaa@vantaa.fi", id: 92 },
            ],
            viranomaiset: [{ nimi: IlmoitettavaViranomainen.UUDENMAAN_ELY, sahkoposti: "kirjaamo.uusimaa@ely-keskus.fi" }],
          },
          vuorovaikutusTilaisuudet: [
            {
              yhteystiedot: [
                {
                  sukunimi: "Korkalainen",
                  sahkoposti: "tomi.korkalainen@cgi.com",
                  puhelinnumero: "029213132",
                  organisaatio: "CGI Suomi Oy",
                  etunimi: "Tomi",
                },
              ],
              alkamisAika: "17:10",
              paivamaara: "2023-05-12",
              nimi: { SUOMI: "" },
              paattymisAika: "17:10",
              tyyppi: VuorovaikutusTilaisuusTyyppi.SOITTOAIKA,
            },
          ],
          vuorovaikutusPDFt: { SUOMI: { kutsuPDFPath: "/suunnitteluvaihe/vuorovaikutus_2/T413 Kutsu vuorovaikutukseen.pdf" } },
          yhteystiedot: [
            {
              sukunimi: "Hassu",
              sahkoposti: "mikko.haapamki@cgi.com",
              puhelinnumero: "02921312",
              organisaatio: "CGI Suomi Oy",
              etunimi: "A-tunnus1",
            },
          ],
          vuorovaikutusJulkaisuPaiva: "2023-05-11",
          id: 2,
          tila: VuorovaikutusKierrosTila.JULKINEN,
          suunnittelumateriaali: [{ SUOMI: { nimi: "", url: "" } }],
          arvioSeuraavanVaiheenAlkamisesta: null,
          esitettavatYhteystiedot: {},
        },
      ],
      paivitetty: "2023-05-05T13:10:18+03:00",
      versio: 7,
    };

    const value = isOkToMakeNewVuorovaikutusKierros({
      nahtavillaoloVaiheJulkaisut: project.nahtavillaoloVaiheJulkaisut,
      vuorovaikutusKierros: project.vuorovaikutusKierros,
      vuorovaikutusKierrosJulkaisut: project.vuorovaikutusKierrosJulkaisut,
    });
    expect(value).to.eql(false);
  });
});
