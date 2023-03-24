import { describe, it } from "mocha";
import * as sinon from "sinon";
import { Status } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanupAnyProjektiData } from "./testFixtureRecorder";
import { defaultMocks, expectToMatchSnapshot, mockSaveProjektiToVelho, PDFGeneratorStub, takeYllapitoS3Snapshot } from "./testUtil/util";
import { tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";

describe("Hyväksymispäätös", () => {
  const userFixture = new UserFixture(userService);
  const pdfGeneratorStub = new PDFGeneratorStub();
  defaultMocks();

  before(async () => {
    pdfGeneratorStub.init();
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

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      hyvaksymisPaatosVaihe: {
        ...hyvaksymisPaatosVaihe,
        aineistoNahtavilla: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
        hyvaksymisPaatos: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
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
  });
});
