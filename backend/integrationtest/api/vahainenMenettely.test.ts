import { describe, it } from "mocha";
import { Kieli, Status } from "hassu-common/graphql/apiModel";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import {
  asetaAika,
  findProjektiPaallikko,
  listDocumentsToImport,
  loadProjektiFromDatabase,
  testAloituskuulutus,
  testAloituskuulutusApproval,
  testAloitusKuulutusEsikatselu,
  testNullifyProjektiField,
} from "./testUtil/tests";
import { defaultMocks, expectToMatchSnapshot, mockSaveProjektiToVelho, takeS3Snapshot, verifyProjektiSchedule } from "./testUtil/util";
import {
  testImportNahtavillaoloAineistot,
  testLisaaMuistutusIncrement,
  testNahtavillaolo,
  testNahtavillaoloApproval,
} from "./testUtil/nahtavillaolo";
import { testHyvaksymismenettelyssa } from "./testUtil/hyvaksymisPaatosVaihe";
import { FixtureName, recordProjektiTestFixture, useProjektiTestFixture } from "./testFixtureRecorder";
import { api } from "./apiClient";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";
import { assertIsDefined } from "../../src/util/assertions";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  const userFixture = new UserFixture(userService);
  const { schedulerMock, emailClientStub, eventSqsClientMock } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("bb, hoitaa oikein aloituskuulutukseen ja nähtävilläoloon liittyvät operaatiot, kun kyse on vähäisestä menettelystä", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2022-10-01");
    await useProjektiTestFixture(FixtureName.PERUSTIEDOT);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = await loadProjektiFromDatabase(oid, Status.ALOITUSKUULUTUS);
    await api.tallennaProjekti({
      oid,
      versio: projekti.versio,
      vahainenMenettely: true,
      suunnitteluSopimus: null,
    });
    projekti = await testAloituskuulutus(oid);
    await testAloitusKuulutusEsikatselu(projekti);
    projekti = await testNullifyProjektiField(projekti);

    asetaAika(projekti.aloitusKuulutus?.kuulutusPaiva);
    let projektiPaallikko = findProjektiPaallikko(projekti);
    await testAloituskuulutusApproval(projekti, projektiPaallikko, userFixture);

    const aloitusKuulutusProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
    expectToMatchSnapshot("Julkinen aloituskuulutus teksteineen, vähäinen menttely", aloitusKuulutusProjekti.aloitusKuulutusJulkaisu);
    emailClientStub.verifyEmailsSent();
    await verifyProjektiSchedule(oid, "Aloituskuulutus julkaistu, vähäinen menettely");
    await schedulerMock.verifyAndRunSchedule();
    assertIsDefined(projekti.aloitusKuulutus?.kuulutusPaiva);
    await recordProjektiTestFixture(FixtureName.ALOITUSKUULUTUS_VAHAINEN_MENETTELY, oid);

    // Mennään nähtävilläoloon

    await useProjektiTestFixture(FixtureName.ALOITUSKUULUTUS_VAHAINEN_MENETTELY);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);

    asetaAika("2024-01-01");
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    projektiPaallikko = findProjektiPaallikko(projekti);
    projekti = await testNahtavillaolo(oid, projektiPaallikko.kayttajatunnus);
    projekti = await testImportNahtavillaoloAineistot(projekti, velhoToimeksiannot);
    await schedulerMock.verifyAndRunSchedule();
    await eventSqsClientMock.processQueue();
    await testNahtavillaoloApproval(
      projekti.oid,
      projektiPaallikko,
      userFixture,
      Status.NAHTAVILLAOLO,
      "NahtavillaOloJulkinenAfterApproval"
    );

    await verifyProjektiSchedule(oid, "Nähtävilläolo julkaistu, vähäinen menettely");
    await schedulerMock.verifyAndRunSchedule();
    await eventSqsClientMock.processQueue();
    await takeS3Snapshot(
      oid,
      "Nähtävilläolo julkaistu, vähäinen menttely. Vuorovaikutuksen aineistot pitäisi olla poistettu nyt kansalaispuolelta"
    );
    await testLisaaMuistutusIncrement(oid, projektiPaallikko, userFixture, 0);
    await testLisaaMuistutusIncrement(oid, projektiPaallikko, userFixture, 1);
    emailClientStub.verifyEmailsSent();

    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.NAHTAVILLAOLO,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture,
      "2024-06-01"
    );

    await verifyProjektiSchedule(oid, "Nähtävilläolo julkaistu, vähäinen menettely");
    await schedulerMock.verifyAndRunSchedule();
    await eventSqsClientMock.processQueue();
    await takeS3Snapshot(
      oid,
      "Nähtävilläolo julkaistu, vähäinen menettely. Vuorovaikutuksen aineistot pitäisi olla poistettu nyt kansalaispuolelta"
    );
    emailClientStub.verifyEmailsSent();

    asetaAika("2025-01-01");
    await testHyvaksymismenettelyssa(oid, userFixture);
    await recordProjektiTestFixture(FixtureName.HYVAKSYMISPAATOSVAIHE_VAHAINEN_MENETTELY, oid);
  });
});
