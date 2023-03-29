import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { Kieli, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { cleanupAnyProjektiData, replaceFieldsByName } from "../api/testFixtureRecorder";
import {
  addLogoFilesToProjekti,
  defaultMocks,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  takePublicS3Snapshot,
  takeYllapitoS3Snapshot,
} from "../api/testUtil/util";
import { deleteProjekti, tallennaEULogo } from "../api/testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "../api/apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "../api/testUtil/saameUtil";

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
  const { emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub } = defaultMocks();

  before(async () => {
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

  it("suorita aloituskuulutuksen hyväksymisprosessi saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.ALOITUSKUULUTUS);
    const oid = dbProjekti.oid;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
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

    //
    // Hyväksyntä
    //
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await importAineistoMock.processQueue();

    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Aloituskuulutusjulkaisu saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.aloitusKuulutusJulkaisu?.aloituskuulutusSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Aloituskuulutusjulkaisu saamenkielisellä kuulutuksella ja ilmoituksella ylläpidossa",
      ProjektiPaths.PATH_ALOITUSKUULUTUS
    );
    const julkinenProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
    expectToMatchSnapshot(
      "Julkisen aloituskuulutuksen saamenkieliset PDFt",
      cleanupAnyProjektiData(julkinenProjekti.aloitusKuulutusJulkaisu?.aloituskuulutusSaamePDFt || {})
    );
    await takePublicS3Snapshot(
      oid,
      "Aloituskuulutusjulkaisu saamenkielisellä kuulutuksella ja ilmoituksella kansalaisille",
      ProjektiPaths.PATH_ALOITUSKUULUTUS
    );
  });
});
