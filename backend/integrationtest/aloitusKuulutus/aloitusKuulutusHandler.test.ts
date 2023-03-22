import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { cleanupAnyProjektiData, replaceFieldsByName } from "../api/testFixtureRecorder";
import {
  addLogoFilesToProjekti,
  defaultMocks,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  PDFGeneratorStub,
  takeYllapitoS3Snapshot,
} from "../api/testUtil/util";
import { deleteProjekti, tallennaEULogo } from "../api/testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "../api/apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

const { expect } = require("chai");

async function takeSnapshot(oid: string) {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const objs = {
    aloitusKuulutus: dbProjekti?.aloitusKuulutus,
    aloitusKuulutusJulkaisut: dbProjekti?.aloitusKuulutusJulkaisut,
  };
  replaceFieldsByName(objs, "2022-11-04", "hyvaksymisPaiva");
  expect(objs).toMatchSnapshot();
}

describe("AloitusKuulutus", () => {
  const userFixture = new UserFixture(userService);
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  const pdfGeneratorStub = new PDFGeneratorStub();
  const { emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub } = defaultMocks();

  before(async () => {
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    pdfGeneratorStub.init();
    const oid = new ProjektiFixture().dbProjekti1().oid;
    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (ignored) {
      // ignored
    }
    await addLogoFilesToProjekti(oid);
    mockSaveProjektiToVelho();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("suorita aloituskuulutuksen hyväksymisprosessin eri vaiheet onnistuneesti", async function () {
    const projekti = new ProjektiFixture().dbProjekti1();
    const oid = projekti.oid;
    await deleteProjekti(oid);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await projektiDatabase.createProjekti(projekti);
    await addLogoFilesToProjekti(oid);
    await takeSnapshot(oid);

    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYLKAA,
      syy: "Korjaa teksti",
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
    emailClientStub.verifyEmailsSent();
  });

  it("suorita aloituskuulutuksen hyväksymisprosessin saamen kielellä onnistuneesti", async function () {
    const dbProjekti = new ProjektiFixture().dbProjektiHyvaksymisMenettelyssaSaame();
    delete dbProjekti.aloitusKuulutusJulkaisut;
    delete dbProjekti.vuorovaikutusKierros;
    delete dbProjekti.vuorovaikutusKierrosJulkaisut;
    delete dbProjekti.hyvaksymisPaatosVaihe;
    delete dbProjekti.hyvaksymisPaatosVaiheJulkaisut;
    delete dbProjekti.jatkoPaatos1Vaihe;
    delete dbProjekti.jatkoPaatos1VaiheJulkaisut;
    delete dbProjekti.jatkoPaatos2Vaihe;
    delete dbProjekti.jatkoPaatos2VaiheJulkaisut;
    const oid = dbProjekti.oid;
    await deleteProjekti(oid);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await projektiDatabase.createProjekti(dbProjekti);
    await addLogoFilesToProjekti(oid);

    let p = await api.lataaProjekti(oid);
    const aloitusKuulutus = p.aloitusKuulutus;
    assertIsDefined(aloitusKuulutus);

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      aloitusKuulutus: {
        ...aloitusKuulutus,
        aloituskuulutusSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Aloituskuulutus saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.aloitusKuulutus?.aloituskuulutusSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Aloituskuulutus saamenkielisellä kuulutuksella ja ilmoituksella",
      ProjektiPaths.PATH_ALOITUSKUULUTUS
    );
  });
});
