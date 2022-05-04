import { describe, it } from "mocha";
import { api } from "./apiClient";
import { replaceAWSDynamoDBWithLocalstack, setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";
import {
  AineistoInput,
  AsiakirjaTyyppi,
  Kieli,
  Palaute,
  Projekti,
  ProjektiKayttaja,
  ProjektiKayttajaInput,
  ProjektiRooli,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineistoKategoria,
  Vuorovaikutus,
} from "../../../common/graphql/apiModel";
import fs from "fs";
import axios from "axios";
import * as sinon from "sinon";
import Sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { projektiArchive } from "../../src/archive/projektiArchiveService";
import { fail } from "assert";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { apiTestFixture } from "./apiTestFixture";
import { aineistoImporterClient } from "../../src/aineisto/aineistoImporterClient";
import { handleEvent } from "../../src/aineisto/aineistoImporterLambda";
import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";
import { fileService } from "../../src/files/fileService";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";
import { getCloudFront, produce } from "../../src/aws/client";
import { parseDate } from "../../src/util/dateUtil";
import { cleanProjektiS3Files } from "../util/s3Util";
import { detailedDiff } from "deep-object-diff";

const { expect } = require("chai");
const sandbox = sinon.createSandbox();

function expectToMatchSnapshot(description: string, obj: unknown) {
  expect({ description, obj }).toMatchSnapshot();
}

function cleanupVuorovaikutusTimestamps(vuorovaikutukset: Vuorovaikutus[]) {
  vuorovaikutukset.forEach((vuorovaikutus) =>
    vuorovaikutus.aineistot?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"))
  );
}

function cleanupGeneratedIdFromFeedbacks(feedbacks?: Palaute[]) {
  return feedbacks
    ? feedbacks.map((palaute) => {
        palaute.liite = palaute.liite.replace(palaute.id, "***unittest***");
        palaute.id = "***unittest***";
        return palaute;
      })
    : undefined;
}

function cleanupGeneratedIds(obj: unknown) {
  return Object.keys(obj).reduce((cleanObj, key) => {
    const cleanedUpKey = key.replace(/[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}/g, "***unittest***");
    cleanObj[cleanedUpKey] = obj[key];
    return cleanObj;
  }, {});
}

function verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub: Sinon.SinonStub) {
  expect(awsCloudfrontInvalidationStub.getCalls()).to.have.length(1);
  expect(awsCloudfrontInvalidationStub.getCalls()[0].args).to.have.length(2);
  const invalidationParams = awsCloudfrontInvalidationStub.getCalls()[0].args[0];
  invalidationParams.InvalidationBatch.CallerReference = "***unittest***";
  expect(invalidationParams).toMatchSnapshot();
  awsCloudfrontInvalidationStub.resetHistory();
}

async function takeS3Snapshot(oid: string, description: string) {
  expect({
    ["yllapito S3 files " + description]: cleanupGeneratedIds(await fileService.listYllapitoProjektiFiles(oid, "")),
  }).toMatchSnapshot(description);
  expect({
    ["public S3 files " + description]: cleanupGeneratedIds(await fileService.listPublicProjektiFiles(oid, "", true)),
  }).toMatchSnapshot(description);
}

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let importAineistoStub: sinon.SinonStub;
  let userFixture: UserFixture;
  let oid: string = undefined;
  let awsCloudfrontInvalidationStub: sinon.SinonStub;

  after(() => {
    userFixture.logout();
    sandbox.restore();
    sinon.restore();
    AWSMock.restore();
  });

  before("Initialize test database!", async () => {
    await setupLocalDatabase();
  });

  const fakeAineistoImportQueue: SQSEvent[] = [];

  before(async () => {
    userFixture = new UserFixture(userService);
    readUsersFromSearchUpdaterLambda = sandbox.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    sandbox.stub(openSearchClient, "query").resolves({ status: 200 });
    sandbox.stub(openSearchClient, "deleteProjekti");
    sandbox.stub(openSearchClient, "putProjekti");

    importAineistoStub = sandbox.stub(aineistoImporterClient, "importAineisto");
    importAineistoStub.callsFake(async (event) => {
      fakeAineistoImportQueue.push({ Records: [{ body: JSON.stringify(event) } as SQSRecord] });
    });

    awsCloudfrontInvalidationStub = sandbox.stub();
    awsCloudfrontInvalidationStub.resolves({});
    AWSMock.setSDKInstance(AWS);
    produce<AWS.CloudFront>("cloudfront", () => undefined, true);
    AWSMock.mock("CloudFront", "createInvalidation", awsCloudfrontInvalidationStub);
    getCloudFront();
  });

  async function testProjektiHenkilot(projekti: Projekti) {
    await api.tallennaProjekti({
      oid,
      kayttoOikeudet: projekti.kayttoOikeudet?.map(
        (value) =>
          ({
            rooli: value.rooli,
            kayttajatunnus: value.kayttajatunnus,
            // Emulate migration where the phone number may be empty
          } as ProjektiKayttajaInput)
      ),
    });
    const p = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);

    // Expect that projektipaallikko is found
    const projektiPaallikko = p.kayttoOikeudet
      ?.filter((kayttaja) => kayttaja.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && kayttaja.email)
      .pop();
    expect(projektiPaallikko).is.not.empty;

    const kayttoOikeudet = p.kayttoOikeudet?.map((value) => ({
      rooli: value.rooli,
      kayttajatunnus: value.kayttajatunnus,
      puhelinnumero: "123",
    }));

    // Save and load projekti
    await api.tallennaProjekti({
      oid,
      kayttoOikeudet,
    });
    await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU);

    return projektiPaallikko;
  }

  async function testProjektinTiedot(oid: string) {
    // Fill in information to projekti, including a file
    const uploadedFile = await tallennaLogo();
    await api.tallennaProjekti({
      oid,
      muistiinpano: apiTestFixture.newNote,
      aloitusKuulutus: apiTestFixture.aloitusKuulutus,
      suunnitteluSopimus: apiTestFixture.createSuunnitteluSopimusInput(uploadedFile),
      kielitiedot: apiTestFixture.kielitiedotInput,
      euRahoitus: false,
    });

    // Check that the saved projekti is what it is supposed to be
    const updatedProjekti = await loadProjektiFromDatabase(oid, Status.ALOITUSKUULUTUS);
    expect(updatedProjekti.muistiinpano).to.be.equal(apiTestFixture.newNote);
    expect(updatedProjekti.aloitusKuulutus).eql(apiTestFixture.aloitusKuulutus);
    expect(updatedProjekti.suunnitteluSopimus).include(apiTestFixture.suunnitteluSopimus);
    expect(updatedProjekti.suunnitteluSopimus?.logo).contain("/suunnittelusopimus/logo.png");
    expect(updatedProjekti.kielitiedot).eql(apiTestFixture.kielitiedot);
    expect(updatedProjekti.euRahoitus).to.be.false;
  }

  async function testAloitusKuulutusEsikatselu(oid: string) {
    // Generate Aloituskuulutus PDF
    const pdf = await api.esikatseleAsiakirjaPDF(oid, AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI);
    expect(pdf.nimi).to.include(".pdf");
    expect(pdf.sisalto).not.to.be.empty;
    expect(pdf.sisalto.length).to.be.greaterThan(50000);
    fs.mkdirSync(".report", { recursive: true });
    fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
  }

  async function testNullifyProjektiField(oid: string) {
    // Test that fields can be removed as well
    await api.tallennaProjekti({
      oid,
      muistiinpano: null,
    });

    const projekti = await loadProjektiFromDatabase(oid, Status.ALOITUSKUULUTUS);
    expect(projekti.muistiinpano).to.be.undefined;
  }

  async function testAloituskuulutusApproval(oid: string, projektiPaallikko: ProjektiKayttaja) {
    userFixture.loginAsProjektiKayttaja(projektiPaallikko);
    await api.siirraTila({
      oid,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    });
    await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS, toiminto: TilasiirtymaToiminto.HYVAKSY });
  }

  async function testSuunnitteluvaihePerustiedot(oid: string) {
    await api.tallennaProjekti({
      oid,
      suunnitteluVaihe: {
        hankkeenKuvaus: apiTestFixture.hankkeenKuvausSuunnittelu,
        arvioSeuraavanVaiheenAlkamisesta: "huomenna",
        suunnittelunEteneminenJaKesto: "suunnitelma etenee aikataulussa ja valmistuu vuoden 2022 aikana",
      },
    });
    const projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    expectToMatchSnapshot("testSuunnitteluvaihePerustiedot", projekti.suunnitteluVaihe);
  }

  async function testSuunnitteluvaiheVuorovaikutus(oid: string, projektiPaallikko: ProjektiKayttaja) {
    const suunnitteluVaihe1 = await doTestSuunnitteluvaiheVuorovaikutus(oid, 1, [projektiPaallikko.kayttajatunnus]);
    expect(suunnitteluVaihe1.vuorovaikutukset).to.have.length(1);
    const suunnitteluVaihe2 = await doTestSuunnitteluvaiheVuorovaikutus(oid, 2, [projektiPaallikko.kayttajatunnus]);
    expectToMatchSnapshot("testSuunnitteluvaiheVuorovaikutus", suunnitteluVaihe2);

    // Verify that it's possible to update one vuorovaikutus at the time
    const suunnitteluVaihe3 = await doTestSuunnitteluvaiheVuorovaikutus(oid, 2, [
      projektiPaallikko.kayttajatunnus,
      UserFixture.mattiMeikalainen.uid,
    ]);
    const difference = detailedDiff(suunnitteluVaihe2, suunnitteluVaihe3);
    expectToMatchSnapshot(
      "added " + UserFixture.mattiMeikalainen.uid + " to vuorovaikutus and vuorovaikutustilaisuus",
      difference
    );
  }

  async function doTestSuunnitteluvaiheVuorovaikutus(
    oid: string,
    vuorovaikutusNumero: number,
    vuorovaikutusYhteysHenkilot: string[],
    julkinen?: boolean
  ) {
    await api.tallennaProjekti({
      oid,
      suunnitteluVaihe: apiTestFixture.suunnitteluVaihe(vuorovaikutusNumero, vuorovaikutusYhteysHenkilot, julkinen),
    });
    return (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe;
  }

  async function testListDocumentsToImport(oid: string) {
    const velhoAineistoKategories = await api.listaaVelhoProjektiAineistot(oid);
    expect(velhoAineistoKategories).not.be.empty;
    const aineistot = velhoAineistoKategories[0].aineistot;
    expect(aineistot).not.be.empty;
    const link = await api.haeVelhoProjektiAineistoLinkki(oid, aineistot[0].oid);
    expect(link).to.contain("https://");
    return velhoAineistoKategories;
  }

  async function testImportAineistot(oid: string, velhoAineistoKategorias: VelhoAineistoKategoria[]) {
    const originalVuorovaikutus = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe
      .vuorovaikutukset[0];

    let order = 1;
    const aineistot = velhoAineistoKategorias.reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot.forEach((aineisto) => {
        documents.push({ dokumenttiOid: aineisto.oid, jarjestys: order++, kategoria: aineistoKategoria.kategoria });
      });
      return documents;
    }, [] as AineistoInput[]);

    async function saveAndVerifyAineistoSave(oid: string, aineistot: AineistoInput[]) {
      await api.tallennaProjekti({
        oid,
        suunnitteluVaihe: {
          vuorovaikutus: {
            ...originalVuorovaikutus,
            aineistot,
          },
        },
      });
      const vuorovaikutus = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe
        .vuorovaikutukset[0];
      expectToMatchSnapshot("saveAndVerifyAineistoSave", vuorovaikutus);
    }

    await saveAndVerifyAineistoSave(oid, aineistot);
    aineistot.map((aineisto) => {
      aineisto.kategoria = aineisto.kategoria + " new";
      aineisto.jarjestys = aineisto.jarjestys + 10;
    });
    await saveAndVerifyAineistoSave(oid, aineistot);

    const aineistotWithoutFirst = aineistot.slice(1);
    await saveAndVerifyAineistoSave(oid, aineistotWithoutFirst);
  }

  async function testUpdatePublishDateAndDeleteAineisto(oid: string) {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const vuorovaikutus = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe
      .vuorovaikutukset[0];
    vuorovaikutus.aineistot.pop();
    const input = {
      oid,
      suunnitteluVaihe: {
        vuorovaikutus: {
          ...vuorovaikutus,
          vuorovaikutusJulkaisuPaiva: parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva).add(1, "date").format(),
          aineistot: vuorovaikutus.aineistot,
        },
      },
    };
    await api.tallennaProjekti(input);
  }

  async function insertAndManageFeedback(oid: string) {
    const palauteId = await api.lisaaPalaute(oid, {
      etunimi: "Matti",
      sukunimi: "Meikalainen",
      puhelinnumero: "123456",
      sahkoposti: "test@vayla.fi",
      yhteydenottotapaPuhelin: true,
      yhteydenottotapaEmail: false,
      kysymysTaiPalaute: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
      liite: await tallennaLogo(),
    });

    const projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    const palautteet = projekti.suunnitteluVaihe.palautteet;

    expectToMatchSnapshot("projekti palaute lisätty", cleanupGeneratedIdFromFeedbacks(palautteet));

    await api.otaPalauteKasittelyyn(oid, palauteId);

    const projektiAfterFeedbackBeingHandled = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    const palautteetAfterFeedbackBeingHandled = projektiAfterFeedbackBeingHandled.suunnitteluVaihe.palautteet;
    expectToMatchSnapshot(
      "projekti palaute otettu käsittelyyn",
      cleanupGeneratedIdFromFeedbacks(palautteetAfterFeedbackBeingHandled)
    );
  }

  async function julkaiseSuunnitteluvaihe(oid: string) {
    const projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    await api.tallennaProjekti({
      oid,
      suunnitteluVaihe: {
        ...projekti.suunnitteluVaihe,
        julkinen: true,
      },
    });
  }

  async function julkaiseVuorovaikutus(oid: string) {
    const unpublishedVuorovaikutusProjekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    await api.tallennaProjekti({
      oid,
      suunnitteluVaihe: {
        vuorovaikutus: { ...unpublishedVuorovaikutusProjekti.suunnitteluVaihe.vuorovaikutukset[0], julkinen: true },
      },
    });
    userFixture.logout();
    const suunnitteluVaihe = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe;
    cleanupVuorovaikutusTimestamps(suunnitteluVaihe.vuorovaikutukset);
    await expectToMatchSnapshot("publicProjekti" + (" suunnitteluvaihe" || ""), suunnitteluVaihe);
  }

  async function testPublicAccessToProjekti(oid: string, expectedStatus: Status, description?: string) {
    userFixture.logout();
    const publicProjekti = await loadProjektiFromDatabase(oid, expectedStatus);
    expectToMatchSnapshot("publicProjekti" + (description || ""), publicProjekti);
  }

  async function archiveProjekti(oid: string) {
    // Finally delete the projekti
    const archiveResult = await projektiArchive.archiveProjekti(oid);
    expect(archiveResult.oid).to.be.equal(oid);
    expect(archiveResult.timestamp).to.not.be.empty;
  }

  it("should search, load and save a project", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);

    const projekti = await readProjektiFromVelho();
    oid = projekti.oid;
    await cleanProjektiS3Files(oid);
    const projektiPaallikko = await testProjektiHenkilot(projekti);
    await testProjektinTiedot(oid);
    await testAloitusKuulutusEsikatselu(oid);
    await testNullifyProjektiField(oid);
    await testAloituskuulutusApproval(oid, projektiPaallikko);
    await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(oid, projektiPaallikko);
    const velhoAineistoKategorias = await testListDocumentsToImport(oid);
    await testImportAineistot(oid, velhoAineistoKategorias);
    await processQueue();
    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, " ennen suunnitteluvaihetta");

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await julkaiseSuunnitteluvaihe(oid);
    await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
    await insertAndManageFeedback(oid);

    await julkaiseVuorovaikutus(oid);
    await takeS3Snapshot(oid, "just after vuorovaikutus published");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);

    await testUpdatePublishDateAndDeleteAineisto(oid);
    await takeS3Snapshot(oid, "vuorovaikutus publish date changed and last aineisto deleted");
    verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub);
  });

  async function processQueue() {
    expect(fakeAineistoImportQueue).toMatchSnapshot();
    for (const event of fakeAineistoImportQueue) {
      await handleEvent(event, null, null);
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const suunnitteluVaihe = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe;
    const vuorovaikutus = suunnitteluVaihe.vuorovaikutukset[0];
    cleanupVuorovaikutusTimestamps([vuorovaikutus]);
    expect(vuorovaikutus).toMatchSnapshot();
  }

  it("should archive projekti", async function () {
    replaceAWSDynamoDBWithLocalstack();
    await archiveProjekti(oid);
  });

  async function readProjektiFromVelho() {
    const oid = await searchProjectsFromVelhoAndPickFirst();
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.false;
    log.info({ projekti });
    return projekti;
  }

  async function loadProjektiFromDatabase(oid: string, expectedStatus?: Status) {
    const savedProjekti = await api.lataaProjekti(oid);
    expect(!savedProjekti.tallennettu || savedProjekti.tallennettu).to.be.true;
    if (expectedStatus) {
      expect(savedProjekti.status).to.be.eq(expectedStatus);
    }
    return savedProjekti;
  }

  async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
    const searchResult = await api.getVelhoSuunnitelmasByName("HASSU AUTOMAATTITESTIPROJEKTI1");
    // tslint:disable-next-line:no-unused-expression
    expect(searchResult).not.to.be.empty;

    const oid = searchResult.pop()?.oid;
    if (!oid) {
      fail("No suitable projekti found from Velho");
    }
    return oid;
  }

  async function tallennaLogo() {
    const uploadProperties = await api.valmisteleTiedostonLataus("logo.png", "image/png");
    expect(uploadProperties).to.not.be.empty;
    expect(uploadProperties.latausLinkki).to.not.be.undefined;
    expect(uploadProperties.tiedostoPolku).to.not.be.undefined;
    const putResponse = await axios.put(
      uploadProperties.latausLinkki,
      fs.readFileSync(__dirname + "/../files/logo.png"),
      {
        headers: { "content-type": "image/png" },
      }
    );
    expect(putResponse.status).to.be.eq(200);
    return uploadProperties.tiedostoPolku;
  }
});
