import { describe, it } from "mocha";
import { Kieli, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanProjektiS3Files } from "../util/s3Util";
import {
  asetaAika,
  deleteProjekti,
  findProjektiPaallikko,
  julkaiseSuunnitteluvaihe,
  listDocumentsToImport,
  loadProjektiFromDatabase,
  peruVerkkoVuorovaikutusTilaisuudet,
  readProjektiFromVelho,
  sendEmailDigests,
  siirraVuorovaikutusKierrosMenneisyyteen,
  testAddSuunnitelmaluonnos,
  testAineistoProcessing,
  testAloituskuulutus,
  testAloituskuulutusApproval,
  testAloitusKuulutusEsikatselu,
  testImportAineistot,
  testListDocumentsToImport,
  testLuoUusiVuorovaikutusKierros,
  testNullifyProjektiField,
  testPaivitaPerustietoja,
  testPaivitaPerustietojaFail,
  testPoistaVuorovaikutuskierros,
  testProjektiHenkilot,
  testProjektinTiedot,
  testPublicAccessToProjekti,
  testSuunnitteluvaihePerustiedot,
  testSuunnitteluvaiheVuorovaikutus,
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
  testHyvaksymisPaatosVaiheKuulutusVaihePaattyyPaivaMenneisyydessa,
} from "./testUtil/hyvaksymisPaatosVaihe";
import { FixtureName, recordProjektiTestFixture, useProjektiTestFixture } from "./testFixtureRecorder";
import { api } from "./apiClient";
import { IllegalAineistoStateError } from "../../src/error/IllegalAineistoStateError";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";
import { assertIsDefined } from "../../src/util/assertions";

import { expect } from "chai";

const oid = "1.2.246.578.5.1.2978288874.2711575506";

describe("Api", () => {
  const userFixture = new UserFixture(userService);
  const { schedulerMock, emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub, parametersStub } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();
    parametersStub.asianhallintaEnabled = true;
  });

  after(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("aa, should search, load and save a project", async function () {
    this.timeout(120000);
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2020-01-01");
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    await deleteProjekti(oid);
    awsCloudfrontInvalidationStub.reset();
    const projekti = await readProjektiFromVelho();
    expect(oid).to.eq(projekti.oid);
    await cleanProjektiS3Files(oid);
    await expect(testProjektiHenkilot(projekti, oid, userFixture)).to.eventually.be.fulfilled;
    await expect(testProjektinTiedot(oid)).to.eventually.be.fulfilled;
    await recordProjektiTestFixture(FixtureName.PERUSTIEDOT, oid);
  });

  it("cc, hoitaa oikein aloituskuulutukseen liittyvät operaatiot", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2022-10-01");
    await useProjektiTestFixture(FixtureName.PERUSTIEDOT);
    const projekti = await testAloituskuulutus(oid);
    await testAloitusKuulutusEsikatselu(projekti);
    await testNullifyProjektiField(projekti);

    asetaAika(projekti.aloitusKuulutus?.kuulutusPaiva);
    const projektiPaallikko = findProjektiPaallikko(projekti);
    await testAloituskuulutusApproval(oid, projektiPaallikko, userFixture);

    const aloitusKuulutusProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
    expectToMatchSnapshot("Julkinen aloituskuulutus teksteineen", aloitusKuulutusProjekti.aloitusKuulutusJulkaisu);
    emailClientStub.verifyEmailsSent();
    await expect(verifyProjektiSchedule(oid, "Aloituskuulutus julkaistu")).to.eventually.be.fulfilled;
    await expect(schedulerMock.verifyAndRunSchedule()).to.eventually.be.fulfilled;
    assertIsDefined(projekti.aloitusKuulutus?.kuulutusPaiva);
    await recordProjektiTestFixture(FixtureName.ALOITUSKUULUTUS, oid);
  });

  it("dd, hoitaa aloituskuulutuksen uudelleenkuulutukseen liittyvät operaatiot", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2022-10-01");
    await useProjektiTestFixture(FixtureName.ALOITUSKUULUTUS);
    const projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    const projektiPaallikko = findProjektiPaallikko(projekti);
    const aloitusKuulutusKuulutusPaiva = projekti.aloitusKuulutus?.kuulutusPaiva;
    expect(aloitusKuulutusKuulutusPaiva).eql("2022-01-02");
    await expect(
      testUudelleenkuulutus(
        oid,
        UudelleelleenkuulutettavaVaihe.ALOITUSKUULUTUS,
        projektiPaallikko,
        UserFixture.mattiMeikalainen,
        userFixture,
        aloitusKuulutusKuulutusPaiva || "2022-01-02"
      )
    ).to.eventually.be.fulfilled;
    emailClientStub.verifyEmailsSent();
    await expect(verifyProjektiSchedule(oid, "Ajastukset kun aloituskuulutuksen uudelleenkuulutus on julkaistu")).to.eventually.be
      .fulfilled;
    await expect(schedulerMock.verifyAndRunSchedule()).to.eventually.be.fulfilled;
    await recordProjektiTestFixture(FixtureName.ALOITUSKUULUTUS_UUDELLEENKUULUTETTU, oid);
  });

  it("ee, hoitaa suunnitteluvaiheeseen liittyvät operaatiot", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2022-10-01");
    await useProjektiTestFixture(FixtureName.ALOITUSKUULUTUS_UUDELLEENKUULUTETTU);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    const projektiPaallikko = findProjektiPaallikko(projekti);

    /**
     * HUOM! Vuorovaikutuskierroksiin liittyvät testit on muuutettu muotoon,
     * jossa kaikki snapshotit otetaan kutsuttujen testien sisällä,
     * ja jokaiseen snapshotiin tulee kuvaus, joka annetaan kutsun yhteydessä.
     * Jos testin yhteydessä ei anneta kuvausta, sen sisällä ei oteta snapshotia.
     */

    await testSuunnitteluvaihePerustiedot(oid, 1, "Ensimmäinen vuorovaikutustallennus.", userFixture);
    const velhoToimeksiannot = await testListDocumentsToImport(oid); // testaa sitä kun käyttäjä avaa aineistodialogin ja valkkaa sieltä tiedostoja
    projekti = await testImportAineistot(
      oid,
      velhoToimeksiannot,
      importAineistoMock,
      "Ensimmäisen vuorovaikutuskierroksen aineistojen tallentaminen",
      userFixture
    ); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    await testSuunnitteluvaiheVuorovaikutus(
      projekti.oid,
      projekti.versio,
      projektiPaallikko.kayttajatunnus,
      1,
      "Ensimmäisen vuorovaikutuskierroksen aineistot on jo asetettu",
      userFixture
    );
    asetaAika("2022-02-03");
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
    await testSuunnitteluvaihePerustiedot(oid, 2, "Toinen kierros on juuri luotu.", userFixture);
    await testPoistaVuorovaikutuskierros(oid, "Poista vuorovaikutuskierros", userFixture);
    await testLuoUusiVuorovaikutusKierros(oid, "Luodaan toinen uudelleen", userFixture);
    await testSuunnitteluvaihePerustiedot(oid, 2, "Toinen kierros on juuri luotu ja perustiedot annetaan uudelleen.", userFixture);
    projekti = await testImportAineistot(
      oid,
      velhoToimeksiannot,
      importAineistoMock,
      "Ensimmäisen vuorovaikutuskierroksen aineistojen tallentaminen",
      userFixture
    ); // vastaa sitä kun käyttäjä on valinnut tiedostot ja tallentaa
    await testSuunnitteluvaiheVuorovaikutus(
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
    emailClientStub.verifyEmailsSent();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
    await expect(
      testAddSuunnitelmaluonnos(
        oid,
        velhoToimeksiannot,
        importAineistoMock,
        "Lisää ensimmäiseen vuorovaikutukseen julkaisun jälkeen uusia suunnitelmaluonnoksia",
        userFixture
      )
    ).to.eventually.be.fulfilled;

    await sendEmailDigests();
    emailClientStub.verifyEmailsSent();
    await recordProjektiTestFixture(FixtureName.NAHTAVILLAOLO, oid);
  });

  it("ff, hoitaa nähtävilläolovaiheeseen liittyvät operaatiot", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    await useProjektiTestFixture(FixtureName.NAHTAVILLAOLO);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    let projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);

    asetaAika("2024-01-01");
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projektiPaallikko = findProjektiPaallikko(projekti);
    projekti = await testNahtavillaolo(oid, projektiPaallikko.kayttajatunnus);
    const nahtavillaoloVaihe = await testImportNahtavillaoloAineistot(projekti, velhoToimeksiannot);
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    assertIsDefined(nahtavillaoloVaihe.lisaAineistoParametrit);
    await testNahtavillaoloLisaAineisto(oid, nahtavillaoloVaihe.lisaAineistoParametrit);
    await testNahtavillaoloApproval(oid, projektiPaallikko, userFixture);

    await verifyProjektiSchedule(oid, "Nähtävilläolo julkaistu");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Nähtävilläolo julkaistu. Vuorovaikutuksen aineistot pitäisi olla poistettu nyt kansalaispuolelta");
    emailClientStub.verifyEmailsSent();

    await expect(
      testUudelleenkuulutus(
        oid,
        UudelleelleenkuulutettavaVaihe.NAHTAVILLAOLO,
        projektiPaallikko,
        UserFixture.mattiMeikalainen,
        userFixture,
        "2024-06-01"
      )
    ).to.eventually.be.fulfilled;

    await verifyProjektiSchedule(oid, "Nähtävilläolo julkaistu");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takeS3Snapshot(oid, "Nähtävilläolo julkaistu. Vuorovaikutuksen aineistot pitäisi olla poistettu nyt kansalaispuolelta");
    emailClientStub.verifyEmailsSent();

    asetaAika("2025-01-01");
    await testHyvaksymismenettelyssa(oid, userFixture);
    await recordProjektiTestFixture(FixtureName.HYVAKSYMISPAATOSVAIHE, oid);
  });

  it("gg, hoitaa hyväksymispäätösvaiheeseen liittyvät operaatiot", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2025-01-01");
    await useProjektiTestFixture(FixtureName.HYVAKSYMISPAATOSVAIHE);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT);
    const projektiPaallikko = findProjektiPaallikko(projekti);

    await testHyvaksymisPaatosVaihe(oid, userFixture);
    const velhoToimeksiannot = await listDocumentsToImport(oid);
    await testCreateHyvaksymisPaatosWithAineistot(
      oid,
      "hyvaksymisPaatosVaihe",
      velhoToimeksiannot,
      projektiPaallikko.kayttajatunnus,
      Status.HYVAKSYTTY,
      "2025-01-01"
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
    await schedulerMock.verifyAndRunSchedule();
    // TODO: päätös kadonnut, päiväyksissä häikkää siis
    await recordProjektiTestFixture(FixtureName.HYVAKSYMISPAATOS_APPROVED, oid);
    await testHyvaksymisPaatosVaiheKuulutusVaihePaattyyPaivaMenneisyydessa(oid, projektiPaallikko, userFixture);
  });

  it("hh, hoitaa hyväksymispäätöksen uudelleenkuulutukseen liittyvät operaatiot", async function () {
    this.timeout(120000);
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    asetaAika("2025-01-01");
    const oid = await useProjektiTestFixture(FixtureName.HYVAKSYMISPAATOS_APPROVED);
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY);
    const projektiPaallikko = findProjektiPaallikko(projekti);
    asetaAika("2025-06-01");
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.HYVAKSYMISPAATOSVAIHE,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture,
      "2025-06-01"
    );
    await verifyProjektiSchedule(oid, "Hyväksymispäätös uudelleenkuulutus hyväksytty");
    await schedulerMock.verifyAndRunSchedule();
    await importAineistoMock.processQueue();
    await takePublicS3Snapshot(oid, "Hyväksymispäätös uudelleenkuulutus hyväksytty");
    emailClientStub.verifyEmailsSent();
    await schedulerMock.verifyAndRunSchedule();

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY);
    expect(projekti.hyvaksymisPaatosVaiheJulkaisu?.uudelleenKuulutus?.alkuperainenHyvaksymisPaiva).to.equal("2025-01-01");
    userFixture.logout();
  });
});
