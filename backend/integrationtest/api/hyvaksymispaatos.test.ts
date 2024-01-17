import { describe, it } from "mocha";
import * as sinon from "sinon";
import { AineistoTila, Status, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanupAnyProjektiData } from "./testFixtureRecorder";
import { defaultMocks, expectToMatchSnapshot, mockSaveProjektiToVelho, removeTiedosto, takeYllapitoS3Snapshot } from "./testUtil/util";
import { asetaAika, findProjektiPaallikko, tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";
import {
  doTestApproveAndPublishHyvaksymisPaatos,
  tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa,
} from "./testUtil/hyvaksymisPaatosVaihe";
import { Aineisto } from "../../src/database/model";

describe("Hyväksymispäätös", () => {
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

  it("suorita hyväksymispäätösvaihe saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.HYVAKSYMISMENETTELYSSA);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const hyvaksymisPaatosVaihe = p.hyvaksymisPaatosVaihe;
    assertIsDefined(hyvaksymisPaatosVaihe);
    asetaAika(hyvaksymisPaatosVaihe.kuulutusPaiva);

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    const hyvaksymisPaatosVanha = dbProjekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos;
    const aineistotNahtavillaVanha = dbProjekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla;
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      hyvaksymisPaatosVaihe: {
        ...hyvaksymisPaatosVaihe,
        aineistoNahtavilla: aineistotNahtavillaVanha
          ? aineistotNahtavillaVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
          : [],
        hyvaksymisPaatos: (hyvaksymisPaatosVanha
          ? hyvaksymisPaatosVanha.map((item) => removeTiedosto(item) as Omit<Aineisto, "tiedosto">)
          : []
        ).concat([
          {
            kategoriaId: "FOO",
            nimi: "foo.pdf",
            dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044",
            uuid: "jotain",
            tila: AineistoTila.ODOTTAA_TUONTIA,
          },
        ]),
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Hyväksymispäätösvaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.hyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Hyväksymispäätösvaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      ProjektiPaths.PATH_HYVAKSYMISPAATOS
    );
    await eventSqsClientMock.processQueue();

    //
    // Hyväksyntä
    //
    await doTestApproveAndPublishHyvaksymisPaatos(
      TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      ProjektiPaths.PATH_HYVAKSYMISPAATOS,
      "hyvaksymisPaatosVaihe",
      "hyvaksymisPaatosVaiheJulkaisu",
      oid,
      userFixture,
      eventSqsClientMock
    );

    //
    // Uudelleenkuulutus
    //
    asetaAika("2039-01-02");
    const projektiPaallikko = findProjektiPaallikko(p);
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.HYVAKSYMISPAATOSVAIHE,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture,
      "2039-01-02"
    );
    await eventSqsClientMock.processQueue();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(
      oid,
      "hyvaksymisPaatosVaiheJulkaisu",
      ProjektiPaths.PATH_HYVAKSYMISPAATOS,
      "hyvaksymisPaatosVaihe"
    );
  });
});
