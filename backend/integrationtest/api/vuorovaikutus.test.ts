import { describe, it } from "mocha";
import * as sinon from "sinon";
import { Kieli, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "hassu-common/graphql/apiModel";
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
import { asetaAika, tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { tilaHandler } from "../../src/handler/tila/tilaHandler";

describe("Vuorovaikutus", () => {
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

  it("suorita suunnitteluvaihe saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.SUUNNITTELU);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const vuorovaikutusKierros = p.vuorovaikutusKierros;
    delete vuorovaikutusKierros?.suunnitelmaluonnokset;
    delete vuorovaikutusKierros?.esittelyaineistot;
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

    //
    // Hyväksyntä
    //
    asetaAika(p.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva);
    userFixture.loginAs(UserFixture.hassuATunnus1);
    await tilaHandler.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
    });
    await eventSqsClientMock.processQueue();

    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Vuorovaikutuskierroksen kutsu saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.vuorovaikutusKierrosJulkaisut?.[0]?.vuorovaikutusSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Vuorovaikutuskierrosjulkaisu saamenkielisellä kutsulla ylläpidossa",
      ProjektiPaths.PATH_SUUNNITTELUVAIHE
    );
    const julkinenProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
    expectToMatchSnapshot(
      "Julkisen vuorovaikutuksen saamenkielinen kutsu",
      cleanupAnyProjektiData(julkinenProjekti.vuorovaikutukset?.vuorovaikutusSaamePDFt || {})
    );
    await takePublicS3Snapshot(oid, "Julkisen vuorovaikutuksen tiedostot saamenkielisellä kutsulla", ProjektiPaths.PATH_SUUNNITTELUVAIHE);
  });
});
