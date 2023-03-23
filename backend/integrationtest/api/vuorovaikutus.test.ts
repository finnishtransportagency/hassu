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

describe("Vuorovaikutus", () => {
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

  it("suorita suunnitteluvaihe saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.SUUNNITTELU);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const vuorovaikutusKierros = p.vuorovaikutusKierros;
    assertIsDefined(vuorovaikutusKierros);

    // Lataa kutsutiedosto palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedKutsu = await tallennaEULogo("saamekutsu.pdf");
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      vuorovaikutusKierros: {
        ...vuorovaikutusKierros,
        vuorovaikutusSaamePDFt: {
          POHJOISSAAME: uploadedKutsu,
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Vuorovaikutuskierros saamenkielisellä kutsulla",
      cleanupAnyProjektiData(p.vuorovaikutusKierros?.vuorovaikutusSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(oid, "Vuorovaikutuskierros saamenkielisellä kutsulla", ProjektiPaths.PATH_SUUNNITTELUVAIHE);
  });
});
