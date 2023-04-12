import { describe, it } from "mocha";
import { Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanProjektiS3Files } from "../util/s3Util";
import {
  deleteProjekti,
  julkaiseSuunnitteluvaihe,
  loadProjektiFromDatabase,
  peruVerkkoVuorovaikutusTilaisuudet,
  readProjektiFromVelho,
  sendEmailDigests,
  siirraVuorovaikutusKierrosMenneisyyteen,
  testAloituskuulutusApproval,
  testAloitusKuulutusEsikatselu,
  testImportAineistot,
  testListDocumentsToImport,
  testLuoUusiVuorovaikutusKierros,
  testNullifyProjektiField,
  testProjektiHenkilot,
  testProjektinTiedot,
  testPublicAccessToProjekti,
  testSuunnitteluvaihePerustiedot,
  testSuunnitteluvaiheVuorovaikutus,
  verifyVuorovaikutusSnapshot,
} from "./testUtil/tests";
import {
  defaultMocks,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  takePublicS3Snapshot,
  takeS3Snapshot,
  verifyProjektiSchedule,
} from "./testUtil/util";
import {
  testImportNahtavillaoloAineistot,
  testNahtavillaolo,
  testNahtavillaoloApproval,
  testNahtavillaoloLisaAineisto,
} from "./testUtil/nahtavillaolo";
import {
  testCreateHyvaksymisPaatosWithAineistot,
  testHyvaksymismenettelyssa,
  testHyvaksymisPaatosVaihe,
  testHyvaksymisPaatosVaiheApproval,
} from "./testUtil/hyvaksymisPaatosVaihe";
import { cleanupAnyProjektiData, FixtureName, recordProjektiTestFixture } from "./testFixtureRecorder";
import { api } from "./apiClient";
import { IllegalAineistoStateError } from "../../src/error/IllegalAineistoStateError";
import { paivitaVuorovaikutusAineisto } from "./testUtil/vuorovaikutus";
import { assertIsDefined } from "../../src/util/assertions";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";

const { expect } = require("chai");

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  const userFixture = new UserFixture(userService);
  const { schedulerMock, emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();

    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (ignored) {
      // ignored
    }
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    let projekti = await readProjektiFromVelho();
    expect(oid).to.eq(projekti.oid);
    await cleanProjektiS3Files(oid);
    const projektiPaallikko = await testProjektiHenkilot(projekti, oid, userFixture);
    projekti = await testProjektinTiedot(oid);
    await testAloitusKuulutusEsikatselu(projekti);
    await testNullifyProjektiField(projekti);
    await testAloituskuulutusApproval(oid, projektiPaallikko, userFixture);
    emailClientStub.verifyEmailsSent();
    await recordProjektiTestFixture(FixtureName.ALOITUSKUULUTUS, oid);
    await verifyProjektiSchedule(oid, "Aloituskuulutus julkaistu");
    await schedulerMock.verifyAndRunSchedule();
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.ALOITUSKUULUTUS,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture
    );
    emailClientStub.verifyEmailsSent();
    await verifyProjektiSchedule(oid, "Ajastukset kun aloituskuulutuksen uudelleenkuulutus on julkaistu");
    await schedulerMock.verifyAndRunSchedule();

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    projekti = await testSuunnitteluvaihePerustiedot(oid, 0);
    await testSuunnitteluvaiheVuorovaikutus(projekti, projektiPaallikko.kayttajatunnus, 0);
    const velhoToimeksiannot = await testListDocumentsToImport(oid); // testaa sitä kun käyttäjä avaa aineistodialogin ja valkkaa sieltä tiedostoja
    await testImportAineistot(oid, velhoToimeksiannot, importAineistoMock); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    await importAineistoMock.processQueue();
    await verifyVuorovaikutusSnapshot(oid, userFixture);

    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, " ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid, userFixture);
    await verifyProjektiSchedule(oid, "Suunnitteluvaihe julkaistu");
    await peruVerkkoVuorovaikutusTilaisuudet(oid, userFixture);
    emailClientStub.verifyEmailsSent();
    await verifyProjektiSchedule(oid, "Vuorovaikutustilaisuudet peruttu julkaistu");
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "just after first vuorovaikutus published");
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await siirraVuorovaikutusKierrosMenneisyyteen(oid);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await testLuoUusiVuorovaikutusKierros(oid);
    await testImportAineistot(oid, velhoToimeksiannot, importAineistoMock); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    projekti = await testSuunnitteluvaihePerustiedot(oid, 1);
    await importAineistoMock.processQueue();
    await verifyVuorovaikutusSnapshot(oid, userFixture);
    projekti = await testSuunnitteluvaiheVuorovaikutus(projekti, projektiPaallikko.kayttajatunnus, 1);
    await verifyVuorovaikutusSnapshot(oid, userFixture);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid, userFixture);
    await verifyProjektiSchedule(oid, "Uudet vuorovaikutustilaisuudet julkaistu");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    await recordProjektiTestFixture(FixtureName.NAHTAVILLAOLO, oid);
    await importAineistoMock.processQueue();
    emailClientStub.verifyEmailsSent();
    await takeS3Snapshot(oid, "just after second vuorovaikutus published");
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();

    projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    const suunnitelmaluonnoksiaKpl = projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset?.length || 0;
    assertIsDefined(projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset);
    expectToMatchSnapshot(
      "suunnitelmaLuonnoksetEnnenLisaysta",
      cleanupAnyProjektiData(projekti.vuorovaikutusKierrosJulkaisut[1].suunnitelmaluonnokset)
    );
    await paivitaVuorovaikutusAineisto(projekti, velhoToimeksiannot);
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Uusi aineisto lisätty vuorovaikutuksen suunnitelmaluonnoksiin");
    projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    const suunnitelmaluonnoksiaKplLisayksenJalkeen = projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset?.length;
    expect(suunnitelmaluonnoksiaKplLisayksenJalkeen).to.eq(suunnitelmaluonnoksiaKpl + 1);
    assertIsDefined(projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset);
    expectToMatchSnapshot(
      "suunnitelmaLuonnoksetLisayksenJalkeen",
      cleanupAnyProjektiData(projekti.vuorovaikutusKierrosJulkaisut[1].suunnitelmaluonnokset)
    );

    await sendEmailDigests();
    emailClientStub.verifyEmailsSent();

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    projekti = await testNahtavillaolo(oid, projektiPaallikko.kayttajatunnus);
    const nahtavillaoloVaihe = await testImportNahtavillaoloAineistot(projekti, velhoToimeksiannot);
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await testNahtavillaoloLisaAineisto(oid, nahtavillaoloVaihe.lisaAineistoParametrit!);
    await testNahtavillaoloApproval(oid, projektiPaallikko, userFixture);

    await verifyProjektiSchedule(oid, "Nähtävilläolo julkaistu");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Nähtävilläolo julkaistu. Vuorovaikutuksen aineistot pitäisi olla poistettu nyt kansalaispuolelta");
    emailClientStub.verifyEmailsSent();

    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.NAHTAVILLAOLO,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture
    );

    await verifyProjektiSchedule(oid, "Nähtävilläolo julkaistu");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Nähtävilläolo julkaistu. Vuorovaikutuksen aineistot pitäisi olla poistettu nyt kansalaispuolelta");
    emailClientStub.verifyEmailsSent();

    await testHyvaksymismenettelyssa(oid, userFixture);
    await testHyvaksymisPaatosVaihe(oid, userFixture);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "hyvaksymisPaatosVaihe",
      velhoToimeksiannot,
      projektiPaallikko.kayttajatunnus,
      Status.HYVAKSYTTY
    );

    // Yritä lähettää hyväksyttäväksi ennen kuin aineistot on tuotu (eli tässä importAineistoMock.processQueue() kutsuttu)
    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await expect(
      api.siirraTila({
        oid,
        tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
        toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      })
    ).to.eventually.be.rejectedWith(IllegalAineistoStateError);

    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Hyvaksymispaatos created", "hyvaksymispaatos");

    await testHyvaksymisPaatosVaiheApproval(oid, projektiPaallikko, userFixture, importAineistoMock);
    await verifyProjektiSchedule(oid, "Hyväksymispäätös hyväksytty");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takePublicS3Snapshot(oid, "Hyväksymispäätös hyväksytty");
    emailClientStub.verifyEmailsSent();

    await recordProjektiTestFixture(FixtureName.HYVAKSYMISPAATOS_APPROVED, oid);
    await schedulerMock.verifyAndRunSchedule();
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.HYVAKSYMISPAATOSVAIHE,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture
    );
    await verifyProjektiSchedule(oid, "Hyväksymispäätös uudelleenkuulutus hyväksytty");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takePublicS3Snapshot(oid, "Hyväksymispäätös uudelleenkuulutus hyväksytty");
    emailClientStub.verifyEmailsSent();
    await schedulerMock.verifyAndRunSchedule();
  });
});
