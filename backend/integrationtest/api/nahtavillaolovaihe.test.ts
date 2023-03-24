import { describe, it } from "mocha";
import * as sinon from "sinon";
import { Status } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanupAnyProjektiData } from "./testFixtureRecorder";
import { defaultMocks, expectToMatchSnapshot, mockSaveProjektiToVelho, takeYllapitoS3Snapshot } from "./testUtil/util";
import { tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";

describe("Nähtävilläolovaihe", () => {
  const userFixture = new UserFixture(userService);
  defaultMocks();

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
        aineistoNahtavilla: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1" }],
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
  });
});
