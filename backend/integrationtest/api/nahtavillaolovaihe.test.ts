import { describe, it } from "mocha";
import * as sinon from "sinon";
import {
  Aineisto,
  AineistoInput,
  AineistoTila,
  Kieli,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
} from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanupAnyProjektiData } from "./testFixtureRecorder";
import {
  defaultMocks,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  removeTiedosto,
  takePublicS3Snapshot,
  takeYllapitoS3Snapshot,
} from "./testUtil/util";
import { asetaAika, findProjektiPaallikko, tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { tilaHandler } from "../../src/handler/tila/tilaHandler";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";

describe("Nähtävilläolovaihe", () => {
  const userFixture = new UserFixture(userService);
  const { eventSqsClientMock } = defaultMocks();

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

    asetaAika("2040-01-01");

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    const aineistoNahtavillaVanha = dbProjekti.nahtavillaoloVaihe?.aineistoNahtavilla;
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      nahtavillaoloVaihe: {
        ...nahtavillaoloVaihe,
        aineistoNahtavilla: (
          (aineistoNahtavillaVanha
            ? aineistoNahtavillaVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
            : []) as AineistoInput[]
        ).concat([
          {
            kategoriaId: "FOO",
            nimi: "foo.pdf",
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            tila: AineistoTila.ODOTTAA_TUONTIA,
            uuid: "jotain",
          },
        ]),
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
    await eventSqsClientMock.processQueue();

    //
    // Hyväksyntä
    //
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await tilaHandler.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    });
    userFixture.loginAs(UserFixture.hassuATunnus1);
    await tilaHandler.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    });
    await eventSqsClientMock.processQueue();

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

    //
    // Uudelleenkuulutus
    //
    const projektiPaallikko = findProjektiPaallikko(p);
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.NAHTAVILLAOLO,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture,
      "2040-06-01",
      "nahtavillaoloSaamePDFt"
    );
    await eventSqsClientMock.processQueue();
  });
});
