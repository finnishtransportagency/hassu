import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { api } from "../common/api";
import * as monitoring from "../../../src/aws/monitoring";
import sinon from "sinon";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { ParametersStub } from "../common/parameters";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { expect } from "chai";
import * as API from "hassu-common/graphql/apiModel";
import { DBProjekti } from "../../../src/database/model";
import { adaptHyvaksymisPaatosVaiheToInput } from "hassu-common/util/adaptDBtoInput";
import { assertIsDefined } from "../../../src/util/assertions";
import { hyvaksymisPaatosUudelleenKuulutusAvattu } from "../testProjektis/hyvaksymisPaatosUudelleenKuulutusAvattu";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { pdfGeneratorClient } from "../../../src/asiakirja/lambda/pdfGeneratorClient";
import { EmailClientStub } from "../common/email";
import { S3Mock } from "../common/s3";
import { GeneratePDFEvent } from "../../../src/asiakirja/lambda/generatePDFEvent";
describe("Kun hyväksymispäätöksen uudelleenkuulutuksen lähettää hyväksyttäväksi", () => {
  let personSearchFixture: PersonSearchFixture;
  let getKayttajasStub: sinon.SinonStub;
  let pdfGeneratorStub: sinon.SinonStub;
  let saveProjektiStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let fileServiceCopyYllapitoFolderStub: sinon.SinonStub;
  let insertJulkaisutStub: sinon.SinonStub;
  let projektiAlkutilassa: DBProjekti;
  let loadProjektiByOidStub: sinon.SinonStub;
  let projektiInput: API.TallennaProjektiInput;
  const s3Mock = new S3Mock();
  new ParametersStub();
  const emailClientStub = new EmailClientStub();

  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(monitoring, "setupLambdaMonitoring");
    sinon.stub(monitoring, "setupLambdaMonitoringMetaData");
    pdfGeneratorStub = sinon.stub(pdfGeneratorClient, "generatePDF");
    pdfGeneratorStub.callsFake((event: GeneratePDFEvent) => {
      return {
        __typename: "PDF",
        nimi: event.createHyvaksymisPaatosKuulutusPdf?.asiakirjaTyyppi + ".pdf",
        sisalto: "sisalto",
        textContent: "textContent",
      };
    });
    projektiAlkutilassa = hyvaksymisPaatosUudelleenKuulutusAvattu;

    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    fileServiceCopyYllapitoFolderStub = sinon.stub(fileService, "copyYllapitoFolder");
    insertJulkaisutStub = sinon.stub(projektiDatabase.hyvaksymisPaatosVaiheJulkaisut, "insert");
    assertIsDefined(projektiAlkutilassa.hyvaksymisPaatosVaihe, "projektiAlkutilassa.hyvaksymisPaatosVaihe on määritelty");
    projektiInput = {
      oid: projektiAlkutilassa.oid,
      versio: projektiAlkutilassa.versio,
      hyvaksymisPaatosVaihe: {
        ...adaptHyvaksymisPaatosVaiheToInput(projektiAlkutilassa.hyvaksymisPaatosVaihe),
        uudelleenKuulutus: {
          selosteKuulutukselle: {
            SUOMI: "Seloste kuulutukselle",
          },
          selosteLahetekirjeeseen: {
            SUOMI: "Seloste lähetekirjeeseen",
          },
        },
      },
    };
  });

  beforeEach(() => {
    loadProjektiByOidStub.resolves(projektiAlkutilassa);
    personSearchFixture = new PersonSearchFixture();
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
        personSearchFixture.createKayttaja("A2"),
      ])
    );
  });

  after(() => {
    sinon.restore();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  it("luodaan pdf-tiedostoja s3:een", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await api.tallennaJaSiirraTilaa(projektiInput, {
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });

    const luotujenTiedostojenAsiakirjaTyypit = s3Mock.s3Mock
      .calls()
      .map((item) => (item.args?.[0]?.input as any)?.Metadata?.asiakirjatyyppi);
    expect(luotujenTiedostojenAsiakirjaTyypit).to.eql([
      "HYVAKSYMISPAATOSKUULUTUS",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE",
      "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA",
    ]);
  });

  it("lähetetään s.postia", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await api.tallennaJaSiirraTilaa(projektiInput, {
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });

    expect(emailClientStub.sendEmailStub.args).to.eql([
      [
        {
          subject: "Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus odottaa hyväksyntää HASSU/123/2023",
          text:
            "Valtion liikenneväylien suunnittelu -järjestelmän projektistasi HASSU AUTOMAATTITESTIPROJEKTI1 on luotu hyväksymispäätöskuulutus, joka odottaa hyväksyntääsi.\n" +
            "\n" +
            "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/1.2.246.578.5.1.2978288874.2711575506/hyvaksymispaatos/kuulutus\n" +
            "\n" +
            "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.",
          to: ["mikko.haapamki@cgi.com", "mikko.haapamaki02@cgi.com"],
        },
      ],
    ]);
  });

  it("tallennetaan db:hen hyväksymispäätösvaihe oikeilla tiedoilla", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await api.tallennaJaSiirraTilaa(projektiInput, {
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });
    const saveProjektiArgs = saveProjektiStub.firstCall?.args?.[0];
    expect(saveProjektiArgs).to.exist;
    for (const key of Object.keys(saveProjektiArgs)) {
      switch (key) {
        case "hyvaksymisPaatosVaihe":
          expect(saveProjektiArgs[key]).to.eql({
            aineistoMuokkaus: null,
            aineistoNahtavilla: [
              {
                tiedosto: "/hyvaksymispaatos/3/aineisto3.txt",
                dokumenttiOid: "1.2.246.578.5.100.2162882965.3109821760",
                jarjestys: 1,
                kategoriaId: "osa_a",
                nimi: "aineisto3.txt",
                tila: "VALMIS",
                tuotu: "2025-01-01T00:00:01+02:00",
                uuid: "00000002-e436-4256-a2d2-74ab6778d07f1.20",
              },
              {
                tiedosto: "/hyvaksymispaatos/3/1400-73Y-6710-4_Pituusleikkaus_Y4.pdf",
                dokumenttiOid: "1.2.246.578.5.100.2698246895.2362169760",
                jarjestys: 1,
                kategoriaId: "osa_a",
                nimi: "1400-73Y-6710-4_Pituusleikkaus_Y4.pdf",
                tila: "VALMIS",
                tuotu: "2025-01-01T00:00:01+02:00",
                uuid: "00000005-e436-4256-a2d2-74ab6778d07f1.20uusi",
              },
            ],
            hallintoOikeus: "HAMEENLINNA",
            hyvaksymisPaatos: [
              {
                dokumenttiOid: "1.2.246.578.5.100.2162882965.3109821760",
                jarjestys: 1,
                nimi: "aineisto3.txt",
                tiedosto: "/hyvaksymispaatos/3/paatos/aineisto3.txt",
                tila: "VALMIS",
                tuotu: "2025-01-01T00:00:01+02:00",
                uuid: "00000001-e436-4256-a2d2-74ab6778d07f1.20",
                kategoriaId: undefined,
              },
            ],
            id: 3,
            ilmoituksenVastaanottajat: {
              kunnat: [
                { id: 491, sahkoposti: "mikkeli@mikke.li" },
                { id: 178, sahkoposti: "juva@ju.va" },
                { id: 740, sahkoposti: "savonlinna@savonlin.na" },
              ],
              viranomaiset: [
                {
                  nimi: "ETELA_SAVO_ELY",
                  sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
                },
              ],
            },
            kuulutusPaiva: "2025-01-02",
            kuulutusVaihePaattyyPaiva: "2025-02-02",
            kuulutusYhteystiedot: {
              yhteysHenkilot: ["A000112"],
              yhteysTiedot: [
                {
                  etunimi: "Etunimi",
                  sukunimi: "Sukunimi",
                  organisaatio: undefined,
                  kunta: undefined,
                  puhelinnumero: "0293121213",
                  sahkoposti: "Etunimi.Sukunimi@vayla.fi",
                },
                {
                  etunimi: "Joku",
                  sukunimi: "Jokunen",
                  organisaatio: undefined,
                  kunta: undefined,
                  puhelinnumero: "02998765",
                  sahkoposti: "Joku.Jokunen@vayla.fi",
                },
              ],
            },
            uudelleenKuulutus: {
              tila: "PERUUTETTU",
              selosteKuulutukselle: { SUOMI: "Seloste kuulutukselle" },
              selosteLahetekirjeeseen: { SUOMI: "Seloste lähetekirjeeseen" },
            },
            viimeinenVoimassaolovuosi: undefined,
            hyvaksymisPaatosVaiheSaamePDFt: {
              POHJOISSAAME: { kuulutusPDF: undefined, kuulutusIlmoitusPDF: undefined },
            },
          });
          break;
        case "salt":
          expect(saveProjektiArgs[key]).to.eql("salt123");
          break;
        case "oid":
          expect(saveProjektiArgs[key]).to.eql("1.2.246.578.5.1.2978288874.2711575506");
          break;
        case "versio":
          expect(saveProjektiArgs[key]).to.eql(1);
          break;
        case "kayttoOikeudet":
          expect(saveProjektiArgs[key]).to.eql(projektiAlkutilassa.kayttoOikeudet);
          break;
        default:
          expect(saveProjektiArgs[key]).to.eql(undefined);
          break;
      }
    }
  });

  it("tallennetaan db:hen hyväksymispäätösvaihejulkaisu oikeilla tiedoilla", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await api.tallennaJaSiirraTilaa(projektiInput, {
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });
    expect(insertJulkaisutStub.args?.[0]?.[1]).to.eql({
      aineistoMuokkaus: null,
      aineistoNahtavilla: [
        {
          tiedosto: "/hyvaksymispaatos/3/aineisto3.txt",
          dokumenttiOid: "1.2.246.578.5.100.2162882965.3109821760",
          jarjestys: 1,
          kategoriaId: "osa_a",
          nimi: "aineisto3.txt",
          tila: "VALMIS",
          tuotu: "2025-01-01T00:00:01+02:00",
          uuid: "00000002-e436-4256-a2d2-74ab6778d07f1.20",
        },
        {
          tiedosto: "/hyvaksymispaatos/3/1400-73Y-6710-4_Pituusleikkaus_Y4.pdf",
          dokumenttiOid: "1.2.246.578.5.100.2698246895.2362169760",
          jarjestys: 1,
          kategoriaId: "osa_a",
          nimi: "1400-73Y-6710-4_Pituusleikkaus_Y4.pdf",
          tila: "VALMIS",
          tuotu: "2025-01-01T00:00:01+02:00",
          uuid: "00000005-e436-4256-a2d2-74ab6778d07f1.20uusi",
        },
      ],
      hallintoOikeus: "HAMEENLINNA",
      hyvaksymisPaatos: [
        {
          dokumenttiOid: "1.2.246.578.5.100.2162882965.3109821760",
          jarjestys: 1,
          nimi: "aineisto3.txt",
          tiedosto: "/hyvaksymispaatos/3/paatos/aineisto3.txt",
          tila: "VALMIS",
          tuotu: "2025-01-01T00:00:01+02:00",
          uuid: "00000001-e436-4256-a2d2-74ab6778d07f1.20",
        },
      ],
      id: 3,
      ilmoituksenVastaanottajat: {
        kunnat: [
          {
            id: 491,
            lahetetty: "2022-03-11T14:54",
            sahkoposti: "mikkeli@mikke.li",
          },
          {
            id: 178,
            lahetetty: "2022-03-11T14:54",
            sahkoposti: "juva@ju.va",
          },
          {
            id: 740,
            lahetetty: "2022-03-11T14:54",
            sahkoposti: "savonlinna@savonlin.na",
          },
        ],
        viranomaiset: [
          {
            lahetetty: "2022-03-11T14:54",
            nimi: "ETELA_SAVO_ELY",
            sahkoposti: "kirjaamo.etela-savo@ely-keskus.fi",
          },
        ],
      },
      kuulutusPaiva: "2025-01-02",
      kuulutusVaihePaattyyPaiva: "2025-02-02",
      uudelleenKuulutus: { tila: "PERUUTETTU" },
      velho: {
        asiatunnusVayla: "HASSU/123/2023",
        geoJSON: null,
        kunnat: [91, 92],
        linkitetytProjektit: null,
        linkki: "https://linkki-hankesivulle.fi",
        maakunnat: [1],
        nimi: "HASSU AUTOMAATTITESTIPROJEKTI1",
        suunnittelustaVastaavaViranomainen: "VAYLAVIRASTO",
        tyyppi: "TIE",
        varahenkilonEmail: "mikko.haapamaki02@cgi.com",
        vastuuhenkilonEmail: "mikko.haapamki@cgi.com",
        vaylamuoto: ["tie"],
      },
      kuulutusYhteystiedot: {
        yhteysHenkilot: ["LX581241", "A000112"],
        yhteysTiedot: [
          {
            etunimi: "Etunimi",
            sukunimi: "Sukunimi",
            puhelinnumero: "0293121213",
            sahkoposti: "Etunimi.Sukunimi@vayla.fi",
          },
          {
            etunimi: "Joku",
            sukunimi: "Jokunen",
            puhelinnumero: "02998765",
            sahkoposti: "Joku.Jokunen@vayla.fi",
          },
        ],
      },
      yhteystiedot: [
        {
          etunimi: "A-tunnus1",
          sukunimi: "Hassu",
          puhelinnumero: "123",
          sahkoposti: "mikko.haapamki@cgi.com",
          organisaatio: "CGI Suomi Oy",
          elyOrganisaatio: undefined,
          kunta: undefined,
        },
        {
          etunimi: "Etunimi",
          puhelinnumero: "0293121213",
          sahkoposti: "Etunimi.Sukunimi@vayla.fi",
          sukunimi: "Sukunimi",
        },
        {
          etunimi: "Joku",
          puhelinnumero: "02998765",
          sahkoposti: "Joku.Jokunen@vayla.fi",
          sukunimi: "Jokunen",
        },
      ],
      kielitiedot: { ensisijainenKieli: "SUOMI" },
      tila: "ODOTTAA_HYVAKSYNTAA",
      muokkaaja: "A000111",
      hyvaksymisPaatosVaihePDFt: {
        SUOMI: {
          hyvaksymisKuulutusPDFPath: "/hyvaksymispaatos/3/HYVAKSYMISPAATOSKUULUTUS.pdf",
          hyvaksymisIlmoitusLausunnonantajillePDFPath: "/hyvaksymispaatos/3/ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE.pdf",
          hyvaksymisIlmoitusMuistuttajillePDFPath: "/hyvaksymispaatos/3/ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE.pdf",
          ilmoitusHyvaksymispaatoskuulutuksestaKunnalleToiselleViranomaisellePDFPath:
            "/hyvaksymispaatos/3/ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE.pdf",
          ilmoitusHyvaksymispaatoskuulutuksestaPDFPath: "/hyvaksymispaatos/3/ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA.pdf",
        },
      },
    });
  });
});
