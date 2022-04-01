import { describe, it } from "mocha";
import { api } from "./apiClient";
import { replaceAWSDynamoDBWithLocalstack, setupLocalDatabase } from "../util/databaseUtil";
import * as log from "loglevel";
import {
  AineistoInput,
  AsiakirjaTyyppi,
  Kieli,
  Projekti,
  ProjektiKayttaja,
  ProjektiRooli,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineistoKategoria,
} from "../../../common/graphql/apiModel";
import fs from "fs";
import axios from "axios";
import * as sinon from "sinon";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { openSearchClient } from "../../src/projektiSearch/openSearchClient";
import { projektiArchive } from "../../src/archive/projektiArchiveService";
import { fail } from "assert";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { apiTestFixture } from "./apiTestFixture";
import diffDefault from "jest-diff";
import os from "os";
import { aineistoImporterClient } from "../../src/aineisto/aineistoImporterClient";
import { handleEvent } from "../../src/aineisto/aineistoImporterLambda";
import { SQSEvent, SQSRecord } from "aws-lambda/trigger/sqs";

const { expect } = require("chai");
const sandbox = sinon.createSandbox();

function expectToMatchSnapshot(description: string, obj: unknown) {
  expect({ description, obj }).toMatchSnapshot();
}

describe("Api", () => {
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let importAineistoStub: sinon.SinonStub;
  let userFixture: UserFixture;
  let oid: string = undefined;

  after(() => {
    userFixture.logout();
    sandbox.restore();
    sinon.restore();
  });

  before("Initialize test database!", async () => await setupLocalDatabase());

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
  });

  async function testProjektiHenkilot(projekti: Projekti, oid: string) {
    // Expect that projektipaallikko is found
    const projektiPaallikko = projekti.kayttoOikeudet
      ?.filter((kayttaja) => kayttaja.rooli === ProjektiRooli.PROJEKTIPAALLIKKO && kayttaja.email)
      .pop();
    expect(projektiPaallikko).is.not.empty;

    const kayttoOikeudet = projekti.kayttoOikeudet?.map((value) => ({
      rooli: value.rooli,
      kayttajatunnus: value.kayttajatunnus,
      puhelinnumero: "123",
    }));

    // Save and load projekti
    await api.tallennaProjekti({
      oid,
      kayttoOikeudet,
    });
    await loadProjektiFromDatabase(oid);
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
    const updatedProjekti = await loadProjektiFromDatabase(oid);
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

    const projekti = await loadProjektiFromDatabase(oid);
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
      },
    });
    const projekti = await loadProjektiFromDatabase(oid);
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
      "FOO123",
    ]);
    const difference = diffDefault(suunnitteluVaihe2, suunnitteluVaihe3, {
      omitAnnotationLines: true,
      commonColor: () => null,
      aColor: (a) => a,
      bColor: (b) => b,
    }).replace(new RegExp("[" + os.EOL + "]+", "g"), os.EOL);
    expectToMatchSnapshot("modified testSuunnitteluvaiheVuorovaikutus", difference);
  }

  async function doTestSuunnitteluvaiheVuorovaikutus(
    oid: string,
    vuorovaikutusNumero: number,
    vuorovaikutusYhteysHenkilot: string[]
  ) {
    await api.tallennaProjekti({
      oid,
      suunnitteluVaihe: apiTestFixture.suunnitteluVaihe(vuorovaikutusNumero, vuorovaikutusYhteysHenkilot),
    });
    return (await loadProjektiFromDatabase(oid)).suunnitteluVaihe;
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
    const originalVuorovaikutus = (await loadProjektiFromDatabase(oid)).suunnitteluVaihe.vuorovaikutukset[0];

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
      const vuorovaikutus = (await loadProjektiFromDatabase(oid)).suunnitteluVaihe.vuorovaikutukset[0];
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

  async function testPublicAccessToProjekti(oid: string) {
    userFixture.logout();
    const publicProjekti = await loadProjektiFromDatabase(oid);
    expectToMatchSnapshot("publicProjekti", publicProjekti);
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
    const projektiPaallikko = await testProjektiHenkilot(projekti, oid);
    await testProjektinTiedot(oid);
    await testAloitusKuulutusEsikatselu(oid);
    await testNullifyProjektiField(oid);
    await testAloituskuulutusApproval(oid, projektiPaallikko);
    await testSuunnitteluvaihePerustiedot(oid);
    await testSuunnitteluvaiheVuorovaikutus(oid, projektiPaallikko);
    const velhoAineistoKategorias = await testListDocumentsToImport(oid);
    await testImportAineistot(oid, velhoAineistoKategorias);
    await testPublicAccessToProjekti(oid);
  });

  it("should import files from Velho using background queue", async function () {
    if (process.env.SKIP_VELHO_TESTS == "true") {
      this.skip();
    }
    replaceAWSDynamoDBWithLocalstack();
    expect(fakeAineistoImportQueue).toMatchSnapshot();
    for (const event of fakeAineistoImportQueue) {
      await handleEvent(event, null, null);
    }
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const vuorovaikutus = (await loadProjektiFromDatabase(oid)).suunnitteluVaihe.vuorovaikutukset[0];
    vuorovaikutus.aineistot?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
    expect(vuorovaikutus).toMatchSnapshot();
  });

  it("should archive projekti", async function () {
    replaceAWSDynamoDBWithLocalstack();
    await archiveProjekti(oid);
  });

  async function readProjektiFromVelho() {
    const oid = await searchProjectsFromVelhoAndPickFirst();
    const projekti = await api.lataaProjekti(oid);
    await expect(projekti.tallennettu).to.be.false;
    log.info(JSON.stringify(projekti, null, 2));
    return projekti;
  }

  async function loadProjektiFromDatabase(oid: string) {
    const savedProjekti = await api.lataaProjekti(oid);
    expect(!savedProjekti.tallennettu || savedProjekti.tallennettu).to.be.true;
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
    const uploadProperties = await api.valmisteleTiedostonLataus("logo.png");
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
