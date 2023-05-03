import { describe, it } from "mocha";
import { KayttajaTyyppi, ProjektiKayttaja, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanProjektiS3Files } from "../util/s3Util";
import {
  deleteProjekti,
  julkaiseSuunnitteluvaihe,
  loadProjektiFromDatabase,
  peruVerkkoVuorovaikutusTilaisuudet,
  sendEmailDigests,
  setUpProject,
  siirraVuorovaikutusKierrosMenneisyyteen,
  testAddSuunnitelmaluonnos,
  testAineistoProcessing,
  testAloituskuulutusApproval,
  testAloitusKuulutusEsikatselu,
  testImportAineistot,
  testListDocumentsToImport,
  testLuoUusiVuorovaikutusKierros,
  testNullifyProjektiField,
  testPaivitaPerustietoja,
  testPaivitaPerustietojaFail,
  testProjektiHenkilot,
  testProjektinTiedot,
  testPublicAccessToProjekti,
  testSuunnitteluvaihePerustiedot,
  testSuunnitteluvaiheVuorovaikutus,
} from "./testUtil/tests";
import {
  defaultMocks,
  mockSaveProjektiToVelho,
  mockSearchVelho,
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
import { FixtureName, recordProjektiAndS3s, recordProjektiTestFixture } from "./testFixtureRecorder";
import { api } from "./apiClient";
import { IllegalAineistoStateError } from "../../src/error/IllegalAineistoStateError";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";

const { expect } = require("chai");

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  const userFixture = new UserFixture(userService);
  const { schedulerMock, emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub } = defaultMocks();
  const projektiPaallikko: ProjektiKayttaja = {
    __typename: "ProjektiKayttaja",
    yleinenYhteystieto: true,
    kayttajatunnus: "A000112",
    organisaatio: "CGI Suomi Oy",
    tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
    etunimi: "A-tunnus1",
    sukunimi: "Hassu",
    email: "mikko.haapamki@cgi.com",
    muokattavissa: false,
    puhelinnumero: "123",
  };
  let changingRecordName = "rename_me_before_every_write";

  before(async () => {
    mockSaveProjektiToVelho();
    mockSearchVelho();
    await cleanProjektiS3Files(oid);
    try {
      awsCloudfrontInvalidationStub.reset();
    } catch (ignored) {
      // ignored
    }
  });

  afterEach(async () => {
    try {
      await deleteProjekti(oid);
    } catch (ignored) {
      // ignored
    }
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should find project from velho", async function () {
    this.timeout(120000);
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const projektit = await api.getVelhoSuunnitelmasByName("HASSU AUTOMAATTITESTIPROJEKTI1");
    expect(projektit).not.to.be.empty;
    const foundProjectOid = projektit.pop()?.oid;
    expect(oid).to.eq(foundProjectOid);
  });

  it("shoud save kayttoOikeudet", async function () {
    const projekti = await api.lataaProjekti(oid);
    await testProjektiHenkilot(projekti, oid, userFixture);
    changingRecordName = "After_saving_projektin_henkilot";
    await recordProjektiAndS3s(changingRecordName, oid);
  });

  it("shoud save aloituskuulutus", async function () {
    await setUpProject(changingRecordName);
    await testProjektinTiedot(oid);
    changingRecordName = "After_saving_project_basic_info";
    await recordProjektiAndS3s(changingRecordName, oid);
  });

  it.skip("shoud do the rest", async function () {
    let projekti = await setUpProject(changingRecordName);
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

    /**
     * HUOM! Vuorovaikutuskierroksiin liittyvät testit on muuutettu muotoon,
     * jossa kaikki snapshotit otetaan kutsuttujen testien sisällä,
     * ja jokaiseen snapshotiin tulee kuvaus, joka annetaan kutsun yhteydessä.
     * Jos testin yhteydessä ei anneta kuvausta, sen sisällä ei oteta snapshotia.
     */

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    projekti = await testSuunnitteluvaihePerustiedot(oid, 1, "Ensimmäinen vuorovaikutustallennus.", userFixture);
    const velhoToimeksiannot = await testListDocumentsToImport(oid); // testaa sitä kun käyttäjä avaa aineistodialogin ja valkkaa sieltä tiedostoja
    projekti = await testImportAineistot(
      oid,
      velhoToimeksiannot,
      importAineistoMock,
      "Ensimmäisen vuorovaikutuskierroksen aineistojen tallentaminen",
      userFixture
    ); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    projekti = await testSuunnitteluvaiheVuorovaikutus(
      projekti.oid,
      projekti.versio,
      projektiPaallikko.kayttajatunnus,
      1,
      "Ensimmäisen vuorovaikutuskierroksen aineistot on jo asetettu",
      userFixture
    );
    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, "Ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid, "Ensimmäisen vuorovaikutuskierroksen julkaisun jälkeen", userFixture);

    await peruVerkkoVuorovaikutusTilaisuudet(oid, "Verkkotilaisuuksien perumisen jälkeen", userFixture);
    emailClientStub.verifyEmailsSent();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
    await testAineistoProcessing(
      oid,
      importAineistoMock,
      "Ensimmäinen vuorovaikutus on julkaistu ja verkkotilaisuudet on peruttu",
      userFixture
    );

    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await testPaivitaPerustietoja(oid, 1, "Perustietoja päivitetään verkkotilaisuuksien perumisen jälkeen", userFixture);

    await siirraVuorovaikutusKierrosMenneisyyteen(oid);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await testLuoUusiVuorovaikutusKierros(oid, "Luodaan toinen vuorovaikutuskierros", userFixture);

    await testPaivitaPerustietojaFail(oid, 1);
    await testPaivitaPerustietojaFail(oid, 2);
    projekti = await testSuunnitteluvaihePerustiedot(oid, 2, "Toinen kierros on juuri luotu.", userFixture);
    projekti = await testImportAineistot(
      oid,
      velhoToimeksiannot,
      importAineistoMock,
      "Ensimmäisen vuorovaikutuskierroksen aineistojen tallentaminen",
      userFixture
    ); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    projekti = await testSuunnitteluvaiheVuorovaikutus(
      projekti.oid,
      projekti.versio,
      projektiPaallikko.kayttajatunnus,
      2,
      "Toisen vuorovaikutuskierroksen aineistot on jo asetettu",
      userFixture
    );
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid, "Toisen vuorovaikutuskierroksen julkaisun jälkeen", userFixture);
    await schedulerMock.verifyAndRunSchedule();
    await testAineistoProcessing(oid, importAineistoMock, "Uusien vuorovaikutustilaisuuksien julkaisun jälkeen, 1. kierros.", userFixture);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
    await recordProjektiTestFixture(FixtureName.NAHTAVILLAOLO, oid);
    emailClientStub.verifyEmailsSent();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();

    await testAddSuunnitelmaluonnos(
      oid,
      velhoToimeksiannot,
      importAineistoMock,
      "Lisää ensimmäiseen vuorovaikutukseen julkaisun jälkeen uusia suunnitelmaluonnoksia",
      userFixture
    );

    await sendEmailDigests();
    emailClientStub.verifyEmailsSent();

    // Tähän loppuu suunnitteluvaiheen integraatiotestit

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
