import {
  AineistoInput,
  AsiakirjaTyyppi,
  KayttajaTyyppi,
  Kieli,
  Projekti,
  ProjektiJulkinen,
  ProjektiKayttaja,
  ProjektiKayttajaInput,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineistoKategoria,
  Vuorovaikutus,
} from "../../../../common/graphql/apiModel";
import { api } from "../apiClient";
import axios from "axios";
import { apiTestFixture } from "../apiTestFixture";
import fs from "fs";
import { UserFixture } from "../../../test/fixture/userFixture";
import { detailedDiff } from "deep-object-diff";
import { parseDate } from "../../../src/util/dateUtil";
import { cleanupVuorovaikutusTimestamps } from "./cleanUpFunctions";
import Sinon from "sinon";
import * as log from "loglevel";
import { fail } from "assert";
import { palauteEmailService } from "../../../src/palaute/palauteEmailService";
import { expectApiError, expectToMatchSnapshot } from "./util";
import { handleEvent } from "../../../src/aineisto/aineistoImporterLambda";
import { SQSEvent } from "aws-lambda/trigger/sqs";
import cloneDeep from "lodash/cloneDeep";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { fileService } from "../../../src/files/fileService";

const { expect } = require("chai");

export function verifyCloudfrontWasInvalidated(awsCloudfrontInvalidationStub: Sinon.SinonStub): void {
  expect(awsCloudfrontInvalidationStub.getCalls()).to.have.length(1, "verifyCloudfrontWasInvalidated");
  expect(awsCloudfrontInvalidationStub.getCalls()[0].args).to.have.length(2, "verifyCloudfrontWasInvalidated");
  const invalidationParams = awsCloudfrontInvalidationStub.getCalls()[0].args[0];
  invalidationParams.InvalidationBatch.CallerReference = "***unittest***";
  expect(invalidationParams).toMatchSnapshot();
  awsCloudfrontInvalidationStub.resetHistory();
}

export async function loadProjektiFromDatabase(oid: string, expectedStatus?: Status): Promise<Projekti> {
  const savedProjekti = await api.lataaProjekti(oid);
  expect(!savedProjekti.tallennettu || savedProjekti.tallennettu).to.be.true;
  if (expectedStatus) {
    expect(savedProjekti.status).to.be.eq(expectedStatus);
  }
  return savedProjekti;
}

export async function loadProjektiJulkinenFromDatabase(oid: string, expectedStatus?: Status): Promise<ProjektiJulkinen> {
  const savedProjekti = await api.lataaProjektiJulkinen(oid);
  if (expectedStatus) {
    expect(savedProjekti.status).to.be.eq(expectedStatus);
  }
  return savedProjekti;
}

export async function testProjektiHenkilot(projekti: Projekti, oid: string, userFixture: UserFixture): Promise<ProjektiKayttaja> {
  await api.tallennaProjekti({
    oid,
    kayttoOikeudet: projekti.kayttoOikeudet?.map((value) => {
      const input: ProjektiKayttajaInput = {
        kayttajatunnus: value.kayttajatunnus,
        // Emulate migration where the phone number may be empty
        puhelinnumero: undefined,
      };
      return input;
    }),
  });
  const p = await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);

  // Expect that projektipaallikko is found
  const projektiPaallikko = p.kayttoOikeudet
    ?.filter((kayttaja) => kayttaja.tyyppi === KayttajaTyyppi.PROJEKTIPAALLIKKO && kayttaja.email && kayttaja.muokattavissa === false)
    .pop();
  expect(projektiPaallikko).is.not.empty;

  // Expect that varahenkilo from Velho is found
  const varahenkilo = p.kayttoOikeudet
    ?.filter((kayttaja) => kayttaja.tyyppi == KayttajaTyyppi.VARAHENKILO && kayttaja.muokattavissa === false)
    .pop();
  expect(varahenkilo).is.not.empty;

  const kayttoOikeudet: ProjektiKayttajaInput[] = p.kayttoOikeudet?.map((value) => ({
    ...value,
    puhelinnumero: "123",
  }));

  kayttoOikeudet.push({ kayttajatunnus: UserFixture.testi1Kayttaja.uid, puhelinnumero: "123" });

  // Save and load projekti
  await api.tallennaProjekti({
    oid,
    kayttoOikeudet,
  });
  await loadProjektiFromDatabase(oid, Status.EI_JULKAISTU);

  // Verify only omistaja can modify varahenkilo-field
  try {
    userFixture.loginAs(UserFixture.testi1Kayttaja);
    const kayttoOikeudetWithVarahenkiloChanges = cloneDeep(kayttoOikeudet);
    kayttoOikeudetWithVarahenkiloChanges
      .filter((user) => user.kayttajatunnus == UserFixture.testi1Kayttaja.uid)
      .forEach((user) => (user.tyyppi = KayttajaTyyppi.VARAHENKILO));
    await api.tallennaProjekti({
      oid,
      kayttoOikeudet: kayttoOikeudetWithVarahenkiloChanges,
    });
    fail("Vain omistajan pitää pystyä muokkaamaan varahenkilöyttä");
  } catch (e) {
    expect(e.className).to.eq("IllegalAccessError");
  }

  return { ...projektiPaallikko, puhelinnumero: "123" };
}

export async function tallennaLogo(): Promise<string> {
  const uploadProperties = await api.valmisteleTiedostonLataus("logo.png", "image/png");
  expect(uploadProperties).to.not.be.empty;
  expect(uploadProperties.latausLinkki).to.not.be.undefined;
  expect(uploadProperties.tiedostoPolku).to.not.be.undefined;
  const putResponse = await axios.put(uploadProperties.latausLinkki, fs.readFileSync(__dirname + "/../../files/logo.png"), {
    headers: { "content-type": "image/png" },
  });
  expect(putResponse.status).to.be.eq(200);
  return uploadProperties.tiedostoPolku;
}

export async function testProjektinTiedot(oid: string): Promise<void> {
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

export async function testAloitusKuulutusEsikatselu(oid: string): Promise<void> {
  // Generate Aloituskuulutus PDF
  const pdf = await api.esikatseleAsiakirjaPDF(oid, AsiakirjaTyyppi.ALOITUSKUULUTUS, Kieli.SUOMI, { oid });
  expect(pdf.nimi).to.include(".pdf");
  expect(pdf.sisalto).not.to.be.empty;
  expect(pdf.sisalto.length).to.be.greaterThan(50000);
  fs.mkdirSync(".report", { recursive: true });
  fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
}

export async function testNullifyProjektiField(oid: string): Promise<void> {
  // Test that fields can be removed as well
  await api.tallennaProjekti({
    oid,
    muistiinpano: null,
  });

  const projekti = await loadProjektiFromDatabase(oid, Status.ALOITUSKUULUTUS);
  expect(projekti.muistiinpano).to.be.undefined;
}

export async function testAloituskuulutusApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });
  await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS, toiminto: TilasiirtymaToiminto.HYVAKSY });
}

export async function testSuunnitteluvaihePerustiedot(oid: string): Promise<void> {
  await api.tallennaProjekti({
    oid,
    suunnitteluVaihe: {
      hankkeenKuvaus: apiTestFixture.hankkeenKuvausSuunnittelu,
      arvioSeuraavanVaiheenAlkamisesta: "huomenna",
      suunnittelunEteneminenJaKesto: "suunnitelma etenee aikataulussa ja valmistuu vuoden 2022 aikana",
      palautteidenVastaanottajat: [UserFixture.mattiMeikalainen.uid],
    },
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
  expectToMatchSnapshot("testSuunnitteluvaihePerustiedot", projekti.suunnitteluVaihe);
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

async function doTestSuunnitteluvaiheVuorovaikutusWithoutTilaisuus(
  oid: string,
  vuorovaikutusNumero: number,
  vuorovaikutusYhteysHenkilot: string[],
  julkinen?: boolean
) {
  const suunnitteluVaihe = apiTestFixture.suunnitteluVaihe(vuorovaikutusNumero, vuorovaikutusYhteysHenkilot, julkinen);
  suunnitteluVaihe.vuorovaikutus.vuorovaikutusTilaisuudet = undefined;
  try {
    await api.tallennaProjekti({
      oid,
      suunnitteluVaihe,
    });
    fail("There must be a validation to force at least one vuorovaikutustilaisuus per vuorovaikutus");
  } catch (e) {
    expectApiError(e, "Vuorovaikutuksella pitää olla ainakin yksi vuorovaikutustilaisuus");
  }
}

export async function testSuunnitteluvaiheVuorovaikutus(oid: string, projektiPaallikko: ProjektiKayttaja): Promise<void> {
  await doTestSuunnitteluvaiheVuorovaikutusWithoutTilaisuus(oid, 1, [projektiPaallikko.kayttajatunnus]);
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
  expectToMatchSnapshot("added " + UserFixture.mattiMeikalainen.uid + " to vuorovaikutus and vuorovaikutustilaisuus", difference);
}

export async function testListDocumentsToImport(oid: string): Promise<VelhoAineistoKategoria[]> {
  const velhoAineistoKategories = await api.listaaVelhoProjektiAineistot(oid);
  expect(velhoAineistoKategories).not.be.empty;
  const aineistot = velhoAineistoKategories[0].aineistot;
  expect(aineistot).not.be.empty;
  const link = await api.haeVelhoProjektiAineistoLinkki(oid, aineistot[0].oid);
  expect(link).to.contain("https://");
  return velhoAineistoKategories;
}

export async function saveAndVerifyAineistoSave(
  oid: string,
  esittelyaineistot: AineistoInput[],
  suunnitelmaluonnokset: AineistoInput[],
  originalVuorovaikutus: Vuorovaikutus,
  identifier?: string | number
): Promise<void> {
  await api.tallennaProjekti({
    oid,
    suunnitteluVaihe: {
      vuorovaikutus: {
        ...originalVuorovaikutus,
        esittelyaineistot,
        suunnitelmaluonnokset,
      },
    },
  });
  const vuorovaikutus = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe.vuorovaikutukset[0];
  const description = "saveAndVerifyAineistoSave" + (identifier !== undefined ? ` #${identifier}` : "");
  expectToMatchSnapshot(description, vuorovaikutus);
}

export async function testImportAineistot(oid: string, velhoAineistoKategorias: VelhoAineistoKategoria[]): Promise<void> {
  const originalVuorovaikutus = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe.vuorovaikutukset[0];

  const aineistot = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      return documents.concat(
        aineistoKategoria.aineistot.filter(
          (aineisto) => ["ekatiedosto_eka.pdf", "tokatiedosto_toka.pdf", "karttakuvalla_tiedosto.pdf"].indexOf(aineisto.tiedosto) >= 0
        )
      );
    }, [])
    .sort((a, b) => b.tiedosto.localeCompare(a.tiedosto));

  let index = 1;
  const esittelyaineistot = [aineistot[0], aineistot[2]].map((aineisto) => ({
    dokumenttiOid: aineisto.oid,
    kategoriaId: aineisto.kategoriaId,
    jarjestys: index++,
    nimi: aineisto.tiedosto,
  }));

  index = 1;
  const suunnitelmaluonnokset = [aineistot[1]].map((aineisto) => ({
    dokumenttiOid: aineisto.oid,
    kategoriaId: aineisto.kategoriaId,
    jarjestys: index++,
    nimi: aineisto.tiedosto,
  }));

  await saveAndVerifyAineistoSave(oid, esittelyaineistot, suunnitelmaluonnokset, originalVuorovaikutus, "initialSave");
  esittelyaineistot.forEach((aineisto) => {
    aineisto.nimi = "new " + aineisto.nimi;
    aineisto.jarjestys = aineisto.jarjestys + 10;
  });
  suunnitelmaluonnokset.forEach((aineisto) => {
    aineisto.nimi = "new " + aineisto.nimi;
    aineisto.jarjestys = aineisto.jarjestys + 10;
  });
  await saveAndVerifyAineistoSave(
    oid,
    cloneDeep(esittelyaineistot),
    cloneDeep(suunnitelmaluonnokset),
    originalVuorovaikutus,
    "updateNimiAndJarjestys"
  );

  const esittelyaineistotWithoutFirst = esittelyaineistot.slice(1);
  await saveAndVerifyAineistoSave(
    oid,
    esittelyaineistotWithoutFirst,
    suunnitelmaluonnokset,
    originalVuorovaikutus,
    "esittelyAineistotWithoutFirst"
  );
}

export async function testUpdatePublishDateAndDeleteAineisto(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const vuorovaikutus = (await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO)).suunnitteluVaihe.vuorovaikutukset[0];
  vuorovaikutus.suunnitelmaluonnokset?.pop();
  const updatedVuorovaikutusJulkaisuPaiva = parseDate(vuorovaikutus.vuorovaikutusJulkaisuPaiva).add(1, "day").format("YYYY-MM-DD");
  const input = {
    oid,
    suunnitteluVaihe: {
      vuorovaikutus: {
        ...vuorovaikutus,
        vuorovaikutusJulkaisuPaiva: updatedVuorovaikutusJulkaisuPaiva,
      },
    },
  };
  await api.tallennaProjekti(input);
}

export async function verifyVuorovaikutusSnapshot(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const suunnitteluVaihe = (await loadProjektiFromDatabase(oid)).suunnitteluVaihe;
  const vuorovaikutus = suunnitteluVaihe.vuorovaikutukset[0];
  cleanupVuorovaikutusTimestamps([vuorovaikutus]);
  expect(vuorovaikutus).toMatchSnapshot();
}

export async function julkaiseSuunnitteluvaihe(oid: string): Promise<void> {
  const projekti = await loadProjektiFromDatabase(oid, Status.SUUNNITTELU);
  await api.tallennaProjekti({
    oid,
    suunnitteluVaihe: {
      ...projekti.suunnitteluVaihe,
      julkinen: true,
    },
  });
}

export async function julkaiseVuorovaikutus(oid: string, userFixture: UserFixture): Promise<void> {
  const unpublishedVuorovaikutusProjekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  await api.tallennaProjekti({
    oid,
    suunnitteluVaihe: {
      vuorovaikutus: { ...unpublishedVuorovaikutusProjekti.suunnitteluVaihe.vuorovaikutukset[0], julkinen: true },
    },
  });
  userFixture.logout();
  const suunnitteluVaihe = (await loadProjektiFromDatabase(oid, Status.SUUNNITTELU)).suunnitteluVaihe;
  cleanupVuorovaikutusTimestamps(suunnitteluVaihe.vuorovaikutukset);
  expectToMatchSnapshot("publicProjekti" + (" suunnitteluvaihe" || ""), suunnitteluVaihe);
}

export async function testPublicAccessToProjekti(
  oid: string,
  expectedStatus: Status,
  userFixture: UserFixture,
  description?: string,
  projektiDataExtractor?: (projekti: ProjektiJulkinen) => unknown
): Promise<void> {
  userFixture.logout();
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, expectedStatus);
  publicProjekti.paivitetty = "***unit test***";

  let actual: unknown = publicProjekti;
  if (projektiDataExtractor) {
    actual = projektiDataExtractor(publicProjekti);
  }
  expectToMatchSnapshot("publicProjekti" + (description || ""), actual);
}

export async function searchProjectsFromVelhoAndPickFirst(): Promise<string> {
  const searchResult = await api.getVelhoSuunnitelmasByName("HASSU AUTOMAATTITESTIPROJEKTI1");
  // tslint:disable-next-line:no-unused-expression
  expect(searchResult).not.to.be.empty;

  const oid = searchResult.pop()?.oid;
  if (!oid) {
    fail("No suitable projekti found from Velho");
  }
  return oid;
}

export async function readProjektiFromVelho(): Promise<Projekti> {
  const oid = await searchProjectsFromVelhoAndPickFirst();
  const projekti = await api.lataaProjekti(oid);
  await expect(projekti.tallennettu).to.be.false;
  log.info({ projekti });
  return projekti;
}

export async function sendEmailDigests(): Promise<void> {
  await palauteEmailService.sendNewFeedbackDigest();
}

export function verifyEmailsSent(emailClientStub: sinon.SinonStub<any[], any>): void {
  if (emailClientStub.getCalls().length > 0) {
    expect(
      emailClientStub.getCalls().map((call) => {
        const arg = call.args[0];
        if (arg.attachments) {
          arg.attachments = arg.attachments.map((attachment) => {
            // Remove unnecessary data from snapshot
            delete attachment.content;
            delete attachment.contentDisposition;
            return attachment;
          });
        }
        return arg;
      })
    ).toMatchSnapshot();
    emailClientStub.reset();
  }
}

export async function processQueue(fakeAineistoImportQueue: SQSEvent[]): Promise<void> {
  for (const event of fakeAineistoImportQueue) {
    await handleEvent(event, null, null);
  }
  fakeAineistoImportQueue.splice(0, fakeAineistoImportQueue.length); // Clear the queue
}

export async function deleteProjekti(oid: string): Promise<void> {
  await projektiDatabase.deleteProjektiByOid(oid);

  await fileService.deleteProjekti(oid);
}
