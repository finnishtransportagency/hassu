import { describe, it } from "mocha";
import * as sinon from "sinon";
import { Kieli, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanupAnyProjektiData } from "./testFixtureRecorder";
import {
  defaultMocks,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  takePublicS3Snapshot,
  takeYllapitoS3Snapshot,
} from "./testUtil/util";
import { tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { tilaHandler } from "../../src/handler/tila/tilaHandler";

describe("Nähtävilläolovaihe", () => {
  const userFixture = new UserFixture(userService);
  const { importAineistoMock } = defaultMocks();

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

  it("suorita nähtävilläolovaihe saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.NAHTAVILLAOLO);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const nahtavillaoloVaihe = p.nahtavillaoloVaihe;
    assertIsDefined(nahtavillaoloVaihe);

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      nahtavillaoloVaihe: {
        ...nahtavillaoloVaihe,
        aineistoNahtavilla: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044" }],
        nahtavillaoloSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Nähtävilläolovaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.nahtavillaoloVaihe?.nahtavillaoloSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Nähtävilläolovaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      ProjektiPaths.PATH_NAHTAVILLAOLO
    );
    await importAineistoMock.processQueue();

    //
    // Hyväksyntä
    //
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await tilaHandler.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    });
    userFixture.loginAs(UserFixture.pekkaProjari);
    await tilaHandler.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    });
    await importAineistoMock.processQueue();

    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Nähtävilläolovaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.nahtavillaoloVaiheJulkaisu?.nahtavillaoloSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Nähtävilläolovaihejulkaisu saamenkielisellä kuulutuksella ja ilmoituksella ylläpidossa",
      ProjektiPaths.PATH_NAHTAVILLAOLO
    );
    const julkinenProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
    expectToMatchSnapshot(
      "Julkisen nähtävilläolovaiheen saamenkieliset PDFt",
      cleanupAnyProjektiData(julkinenProjekti.nahtavillaoloVaihe?.nahtavillaoloSaamePDFt || {})
    );
    await takePublicS3Snapshot(
      oid,
      "Nähtävilläolovaihejulkaisu saamenkielisellä kuulutuksella ja ilmoituksella kansalaisille",
      ProjektiPaths.PATH_NAHTAVILLAOLO
    );
  });
});
