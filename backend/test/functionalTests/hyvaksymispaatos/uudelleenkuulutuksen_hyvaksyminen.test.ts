import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { api } from "../common/api";
import * as monitoring from "../../../src/aws/monitoring";
import sinon from "sinon";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";
import { ParametersStub } from "../common/parameters";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { DBProjekti } from "../../../src/database/model";
import { EmailClientStub } from "../common/email";
import * as API from "hassu-common/graphql/apiModel";
import { hyvaksymisPaatosUudelleenKuulutusOdottaaHyvaksyntaa } from "../testProjektis/hyvaksymisPaatosUudelleenkuulutusOdottaaHyvaksyntaa";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import cloneDeepWith from "lodash/cloneDeepWith";
import { expect } from "chai";
import { S3Mock } from "../common/s3";

describe("Kun hyväksymispäätöksen uudelleenkuulutuksen hyväksyy", () => {
  let personSearchFixture: PersonSearchFixture;
  let getKayttajasStub: sinon.SinonStub;
  let saveProjektiStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  let fileServiceCopyYllapitoFolderStub: sinon.SinonStub;
  let updateJulkaisutStub: sinon.SinonStub;
  let projektiAlkutilassa: DBProjekti;
  let loadProjektiByOidStub: sinon.SinonStub;

  new ParametersStub();
  new S3Mock();
  const emailClientStub = new EmailClientStub();
  const projari: API.NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    uid: "A000112",
    etunimi: "A-tunnus1",
    sukunimi: "Hassu",
    roolit: ["hassu_admin", "hassu_kayttaja"],
  };
  before(() => {
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
    sinon.stub(monitoring, "setupLambdaMonitoring");
    sinon.stub(monitoring, "setupLambdaMonitoringMetaData");
    projektiAlkutilassa = hyvaksymisPaatosUudelleenKuulutusOdottaaHyvaksyntaa;

    loadProjektiByOidStub = sinon.stub(projektiDatabase, "loadProjektiByOid");
    fileServiceCopyYllapitoFolderStub = sinon.stub(fileService, "copyYllapitoFolder");
    updateJulkaisutStub = sinon.stub(projektiDatabase.hyvaksymisPaatosVaiheJulkaisut, "update");
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

  it("lähtee s.posteja", async () => {
    userFixture.loginAs(projari);
    await api.siirraTila({
      oid: projektiAlkutilassa.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
    });

    const actualValuesCleaned = cloneDeepWith(emailClientStub.sendEmailStub.args, (value, key) => {
      if (key === "content") {
        return "***unittest***";
      }
    });
    expect(actualValuesCleaned).to.eql([
      [
        {
          subject: "Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus hyväksytty HASSU/123/2023",
          text:
            "Valtion liikenneväylien suunnittelu -järjestelmän projektisi HASSU AUTOMAATTITESTIPROJEKTI1 hyväksymispäätöskuulutus on hyväksytty.\n" +
            "\n" +
            "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/1.2.246.578.5.1.2978288874.2711575506/hyvaksymispaatos\n" +
            "\n" +
            "Sait tämän viestin, koska sinut on merkitty kuulutuksen laatijaksi. Tämä on automaattinen sähköposti, johon ei voi vastata.",
          to: "matti.meikalainen@vayla.fi",
        },
      ],
      [
        {
          subject: "Valtion liikenneväylien suunnittelu: Hyväksymispäätöskuulutus hyväksytty HASSU/123/2023",
          text:
            "Valtion liikenneväylien suunnittelu -järjestelmän projektisi HASSU AUTOMAATTITESTIPROJEKTI1 hyväksymispäätöskuulutus on hyväksytty.\n" +
            "\n" +
            "Voit tarkastella kuulutusta osoitteessa https://localhost:3000/yllapito/projekti/1.2.246.578.5.1.2978288874.2711575506/hyvaksymispaatos\n" +
            "\n" +
            "Viethän sekä oheisen kuulutuksen että erillisen viestin, jossa on liitteenä ilmoitus kuulutuksesta, asianhallintaan suunnitelman hallinnollisen käsittelyn asialle. Toimi organisaatiosi asianhallinnan ohjeistusten mukaisesti.\n" +
            "\n" +
            "Sait tämän viestin, koska sinut on merkitty projektin projektipäälliköksi. Tämä on automaattinen sähköposti, johon ei voi vastata.",
          to: ["mikko.haapamki@cgi.com", "mikko.haapamaki02@cgi.com"],
          attachments: [
            {
              filename: "HYVAKSYMISPAATOSKUULUTUS.pdf",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
            {
              filename: "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE.pdf",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
            {
              filename: "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_LAUSUNNONANTAJILLE.pdf",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
            {
              filename: "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_MUISTUTTAJILLE.pdf",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
          ],
        },
      ],
      [
        {
          subject: "Väyläviraston kuulutuksesta ilmoittaminen",
          text:
            "Hei,\n" +
            "\n" +
            "Liitteenä on Väyläviraston ilmoitus Liikenne- ja viestintävirasto Traficomin tekemästä hyväksymispäätöksestä koskien suunnitelmaa HASSU AUTOMAATTITESTIPROJEKTI1 sekä ilmoitus kuulutuksesta.\n" +
            "\n" +
            "Pyydämme suunnittelualueen kuntia julkaisemaan liitteenä olevan ilmoituksen kuulutuksesta verkkosivuillaan.\n" +
            "\n" +
            "\n" +
            "Ystävällisin terveisin\n" +
            "\n" +
            "A-tunnus1 Hassu\n" +
            "\n" +
            "CGI Suomi Oy",
          to: ["mikkeli@mikke.li", "juva@ju.va", "savonlinna@savonlin.na", "kirjaamo.etela-savo@ely-keskus.fi"],
          cc: ["mikko.haapamki@cgi.com", "mikko.haapamaki02@cgi.com"],
          attachments: [
            {
              filename: "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA.pdf",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
            {
              filename: "ILMOITUS_HYVAKSYMISPAATOSKUULUTUKSESTA_KUNNALLE_JA_TOISELLE_VIRANOMAISELLE.pdf",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
            {
              filename: "aineisto3.txt",
              contentDisposition: "attachment",
              contentType: "image/png",
              content: "***unittest***",
            },
          ],
        },
      ],
    ]);
  });
});
