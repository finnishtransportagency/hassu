import * as API from "../../../../common/graphql/apiModel";
import { AineistoTila, Kieli, Projekti, VelhoToimeksianto } from "../../../../common/graphql/apiModel";
import { api } from "../apiClient";
import axios from "axios";
import { apiTestFixture } from "../apiTestFixture";
import fs from "fs";
import { UserFixture } from "../../../test/fixture/userFixture";
import {
  cleanupNahtavillaoloJulkaisuJulkinenNahtavillaUrls,
  cleanupUudelleenKuulutusTimestamps,
  cleanupVuorovaikutusKierrosTimestamps,
} from "./cleanUpFunctions";
import * as log from "loglevel";
import { fail } from "assert";
import { palauteEmailService } from "../../../src/palaute/palauteEmailService";
import { expectToMatchSnapshot, PATH_EU_LOGO } from "./util";
import cloneDeep from "lodash/cloneDeep";
import { fileService } from "../../../src/files/fileService";
import { testProjektiDatabase } from "../../../src/database/testProjektiDatabase";
import { loadProjektiYllapito } from "../../../src/projekti/projektiHandler";
import { ImportAineistoMock } from "./importAineistoMock";
import { assertIsDefined } from "../../../src/util/assertions";

const { expect } = require("chai");

export async function loadProjektiFromDatabase(oid: string, expectedStatus?: API.Status): Promise<API.Projekti> {
  const savedProjekti = await api.lataaProjekti(oid);
  expect(!savedProjekti.tallennettu || savedProjekti.tallennettu).to.be.true;
  if (expectedStatus) {
    expect(savedProjekti.status).to.be.eq(expectedStatus);
  }
  return savedProjekti;
}

export async function loadProjektiJulkinenFromDatabase(oid: string, expectedStatus?: API.Status): Promise<API.ProjektiJulkinen> {
  const savedProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
  if (expectedStatus) {
    expect(savedProjekti.status).to.be.eq(expectedStatus);
  }
  return savedProjekti;
}

export function findProjektiPaallikko(p: API.Projekti) {
  return p.kayttoOikeudet
    ?.filter((kayttaja) => kayttaja.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO && kayttaja.email && kayttaja.muokattavissa === false)
    .pop();
}

export async function testProjektiHenkilot(projekti: API.Projekti, oid: string, userFixture: UserFixture): Promise<API.ProjektiKayttaja> {
  await api.tallennaProjekti({
    oid,
    versio: projekti.versio,
    kayttoOikeudet: projekti.kayttoOikeudet?.map((value) => {
      const input: API.ProjektiKayttajaInput = {
        kayttajatunnus: value.kayttajatunnus,
        // Emulate migration where the phone number may be empty
        puhelinnumero: undefined!,
      };
      return input;
    }),
  });
  await testProjektiDatabase.saveProjekti({ oid, kasittelynTila: null }); // Resetoi tila, koska Velhosta voi tulla muita arvoja luonnin yhteydessä
  const p: API.Projekti = await loadProjektiFromDatabase(oid, API.Status.EI_JULKAISTU_PROJEKTIN_HENKILOT);

  // Expect that projektipaallikko is found
  const projektiPaallikko = findProjektiPaallikko(p);
  expect(projektiPaallikko).is.not.empty;

  // Expect that varahenkilo from Velho is found
  const varahenkilo = p.kayttoOikeudet
    ?.filter((kayttaja) => kayttaja.tyyppi == API.KayttajaTyyppi.VARAHENKILO && kayttaja.muokattavissa === false)
    .pop();
  expect(varahenkilo).is.not.empty;

  const kayttoOikeudet: API.ProjektiKayttajaInput[] | undefined = p.kayttoOikeudet?.map((value) => ({
    ...value,
    puhelinnumero: "123",
  }));
  assertIsDefined(kayttoOikeudet);

  kayttoOikeudet.push({ kayttajatunnus: UserFixture.testi1Kayttaja.uid!, puhelinnumero: "123", yleinenYhteystieto: true });

  // Save and load projekti
  await api.tallennaProjekti({
    oid,
    versio: p.versio,
    kayttoOikeudet,
  });
  const projekti1 = await loadProjektiFromDatabase(oid, API.Status.EI_JULKAISTU);

  // Verify only omistaja can modify varahenkilo-field
  userFixture.loginAs(UserFixture.testi1Kayttaja);
  const kayttoOikeudetWithVarahenkiloChanges = cloneDeep(kayttoOikeudet);
  kayttoOikeudetWithVarahenkiloChanges
    .filter((user) => user.kayttajatunnus == UserFixture.testi1Kayttaja.uid)
    .forEach((user) => (user.tyyppi = API.KayttajaTyyppi.VARAHENKILO));

  await expect(
    api.tallennaProjekti({
      oid,
      versio: projekti1.versio,
      kayttoOikeudet: kayttoOikeudetWithVarahenkiloChanges,
    })
  ).to.eventually.rejectedWith("IllegalAccessError");

  return { ...projektiPaallikko!, puhelinnumero: "123" };
}

export async function tallennaLogo(): Promise<string> {
  return tallennaLogoInternal("logo.png", "image/png", __dirname + "/../../files/logo.png");
}

export async function tallennaEULogo(fileName: string): Promise<string> {
  return tallennaLogoInternal(fileName, "image/png", PATH_EU_LOGO);
}

async function tallennaLogoInternal(tiedostoNimi: string, contentType: string, path: any): Promise<string> {
  const uploadProperties = await api.valmisteleTiedostonLataus(tiedostoNimi, contentType);
  expect(uploadProperties).to.not.be.empty;
  expect(uploadProperties.latausLinkki).to.not.be.undefined;
  expect(uploadProperties.tiedostoPolku).to.not.be.undefined;
  const putResponse = await axios.put(uploadProperties.latausLinkki, fs.readFileSync(path), {
    headers: { "content-type": contentType },
  });
  expect(putResponse.status).to.be.eq(200);
  return uploadProperties.tiedostoPolku;
}

export async function testProjektinTiedot(oid: string): Promise<Projekti> {
  // Fill in information to projekti, including a file
  const uploadedFile = await tallennaLogo();
  const versio = (await api.lataaProjekti(oid)).versio;
  await api.tallennaProjekti({
    oid,
    versio,
    muistiinpano: apiTestFixture.newNote,
    aloitusKuulutus: apiTestFixture.aloitusKuulutusInput,
    suunnitteluSopimus: apiTestFixture.createSuunnitteluSopimusInput(uploadedFile, UserFixture.testi1Kayttaja.uid!),
    kielitiedot: apiTestFixture.kielitiedotInput,
    vahainenMenettely: false,
    euRahoitus: true,
    euRahoitusLogot: {
      logoFI: await tallennaEULogo("logofi.png"),
      logoSV: await tallennaEULogo("logosv.png"),
    },
  });

  // Check that the saved projekti is what it is supposed to be
  const updatedProjekti = await loadProjektiFromDatabase(oid, API.Status.ALOITUSKUULUTUS);
  expect(updatedProjekti.muistiinpano).to.be.equal(apiTestFixture.newNote);
  expect(updatedProjekti.aloitusKuulutus).eql(apiTestFixture.aloitusKuulutus);
  expect(updatedProjekti.suunnitteluSopimus).include(apiTestFixture.suunnitteluSopimus);
  expect(updatedProjekti.suunnitteluSopimus?.logo).contain("/suunnittelusopimus/logo.png");
  expect(updatedProjekti.kielitiedot).eql(apiTestFixture.kielitiedot);
  expect(updatedProjekti.euRahoitus).to.be.true;
  expect(updatedProjekti.vahainenMenettely).to.be.false;
  return updatedProjekti;
}

export async function testAloitusKuulutusEsikatselu(projekti: Projekti): Promise<void> {
  // Generate Aloituskuulutus PDF
  const pdf = await api.esikatseleAsiakirjaPDF(projekti.oid, API.AsiakirjaTyyppi.ALOITUSKUULUTUS, API.Kieli.SUOMI, {
    oid: projekti.oid,
    versio: projekti.versio,
  });
  expect(pdf.nimi).to.include(".pdf");
  expect(pdf.sisalto).not.to.be.empty;
  expect(pdf.sisalto.length).to.be.greaterThan(30000);
  fs.mkdirSync(".report", { recursive: true });
  fs.writeFileSync(".report/" + pdf.nimi, Buffer.from(pdf.sisalto, "base64"));
}

export async function testNullifyProjektiField(projekti: Projekti): Promise<void> {
  // Test that fields can be removed as well
  const oid = projekti.oid;
  await api.tallennaProjekti({
    oid,
    versio: projekti.versio,
    muistiinpano: null,
  });

  const projekti2 = await loadProjektiFromDatabase(oid, API.Status.ALOITUSKUULUTUS);
  expect(projekti2.muistiinpano).to.be.undefined;
}

export async function testAloituskuulutusApproval(
  oid: string,
  projektiPaallikko: API.ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: API.TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    toiminto: API.TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });
  await api.siirraTila({ oid, tyyppi: API.TilasiirtymaTyyppi.ALOITUSKUULUTUS, toiminto: API.TilasiirtymaToiminto.HYVAKSY });

  const aloitusKuulutusProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
  expectToMatchSnapshot("Julkinen aloituskuulutus teksteineen", aloitusKuulutusProjekti.aloitusKuulutusJulkaisu);
}

export async function testSuunnitteluvaihePerustiedot(oid: string): Promise<Projekti> {
  const versio = (await api.lataaProjekti(oid)).versio;
  await api.tallennaProjekti({
    oid,
    versio,
    vuorovaikutusKierros: {
      vuorovaikutusNumero: 0,
      hankkeenKuvaus: apiTestFixture.hankkeenKuvausSuunnittelu,
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "huomenna",
      },
      suunnittelunEteneminenJaKesto: {
        SUOMI: "suunnitelma etenee aikataulussa ja valmistuu vuoden 2022 aikana",
      },
      palautteidenVastaanottajat: [UserFixture.mattiMeikalainen.uid!],
    },
  });
  const projekti = await loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
  expectToMatchSnapshot("testSuunnitteluvaihePerustiedot", projekti.vuorovaikutusKierros);
  return projekti;
}

export async function testSuunnitteluvaiheVuorovaikutus(
  projekti: Projekti,
  kayttajatunnus: string,
  vuorovaikutusKierrosNro: number
): Promise<void> {
  await api.tallennaProjekti({
    oid: projekti.oid,
    versio: projekti.versio,
    vuorovaikutusKierros: apiTestFixture.vuorovaikutusKierroksenTiedot(vuorovaikutusKierrosNro, [kayttajatunnus]),
  });
  const suunnitteluVaihe1 = await loadProjektiFromDatabase(projekti.oid, API.Status.SUUNNITTELU);
  expectToMatchSnapshot("testSuunnitteluvaiheVuorovaikutus", {
    vuorovaikutusKierros: suunnitteluVaihe1.vuorovaikutusKierros,
    vuorovaikutusKierrosJulkaisut: suunnitteluVaihe1.vuorovaikutusKierrosJulkaisut,
  });
}

export async function testLuoUusiVuorovaikutusKierros(oid: string): Promise<Projekti> {
  await api.siirraTila({ oid, tyyppi: API.TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS, toiminto: API.TilasiirtymaToiminto.LUO_UUSI_KIERROS });
  return loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
}

export async function testListDocumentsToImport(oid: string): Promise<API.VelhoToimeksianto[]> {
  const velhoToimeksiannot = await listDocumentsToImport(oid);
  const aineistot = velhoToimeksiannot[0].aineistot;
  const link = await api.haeVelhoProjektiAineistoLinkki(oid, aineistot[0].oid);
  expect(link).to.contain("https://");
  return velhoToimeksiannot;
}

export async function listDocumentsToImport(oid: string): Promise<API.VelhoToimeksianto[]> {
  const velhoToimeksiannot = await api.listaaVelhoProjektiAineistot(oid);
  expect(velhoToimeksiannot).not.be.empty;
  const aineistot = velhoToimeksiannot[0].aineistot;
  expect(aineistot).not.be.empty;
  return velhoToimeksiannot;
}

export async function saveAndVerifyAineistoSave(
  oid: string,
  versio: number,
  esittelyaineistot: API.AineistoInput[],
  suunnitelmaluonnokset: API.AineistoInput[],
  originalVuorovaikutus: API.VuorovaikutusKierros,
  identifier: string | number | undefined,
  importAineistoMock: ImportAineistoMock
): Promise<Projekti> {
  await api.tallennaProjekti({
    oid,
    versio,
    vuorovaikutusKierros: {
      ...originalVuorovaikutus,
      vuorovaikutusSaamePDFt: undefined,
      hankkeenKuvaus: originalVuorovaikutus.hankkeenKuvaus as API.LokalisoituTekstiInput,
      esittelyaineistot,
      suunnitelmaluonnokset,
    },
  });
  await importAineistoMock.processQueue();
  const projekti = await loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
  const vuorovaikutus = projekti.vuorovaikutusKierros;
  assertIsDefined(vuorovaikutus);
  const description = "saveAndVerifyAineistoSave" + (identifier !== undefined ? ` #${identifier}` : "");
  expectToMatchSnapshot(description, cleanupVuorovaikutusKierrosTimestamps(vuorovaikutus));
  return projekti;
}

export function pickAineistotFromToimeksiannotByName(velhoToimeksiannot: VelhoToimeksianto[], ...tiedostoNimet: string[]) {
  return velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      return documents.concat(toimeksianto.aineistot.filter((aineisto) => tiedostoNimet.indexOf(aineisto.tiedosto) >= 0));
    }, [] as API.VelhoAineisto[])
    .sort((a, b) => b.tiedosto.localeCompare(a.tiedosto));
}

export async function testImportAineistot(
  oid: string,
  velhoToimeksiannot: VelhoToimeksianto[],
  importAineistoMock: ImportAineistoMock
): Promise<void> {
  const p1 = await loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
  const originalVuorovaikutus = p1.vuorovaikutusKierros;
  if (!originalVuorovaikutus) {
    throw new Error("testImportAineistot: originalVuorovaikutus määrittelemättä");
  }

  const aineistot = pickAineistotFromToimeksiannotByName(
    velhoToimeksiannot,
    "ekatiedosto_eka.pdf",
    "tokatiedosto_toka.pdf",
    "karttakuvalla_tiedosto.pdf"
  );

  let index = 1;
  const esittelyaineistot: API.AineistoInput[] = [aineistot[0], aineistot[2]].map((aineisto) => ({
    dokumenttiOid: aineisto.oid,
    jarjestys: index++,
    nimi: aineisto.tiedosto,
  }));

  index = 1;
  const suunnitelmaluonnokset = [aineistot[1]].map((aineisto) => ({
    dokumenttiOid: aineisto.oid,
    jarjestys: index++,
    nimi: aineisto.tiedosto,
  }));

  const p2 = await saveAndVerifyAineistoSave(
    oid,
    p1.versio,
    esittelyaineistot,
    suunnitelmaluonnokset,
    originalVuorovaikutus,
    "initialSave",
    importAineistoMock
  );
  esittelyaineistot.forEach((aineisto) => {
    aineisto.nimi = "new " + aineisto.nimi;
    aineisto.jarjestys = (aineisto.jarjestys || 0) + 10;
  });
  suunnitelmaluonnokset.forEach((aineisto) => {
    aineisto.nimi = "new " + aineisto.nimi;
    aineisto.jarjestys = aineisto.jarjestys + 10;
  });
  const p3 = await saveAndVerifyAineistoSave(
    oid,
    p2.versio,
    cloneDeep(esittelyaineistot),
    cloneDeep(suunnitelmaluonnokset),
    originalVuorovaikutus,
    "updateNimiAndJarjestys",
    importAineistoMock
  );

  const esittelyaineistotRemoveFirstOne = cloneDeep(esittelyaineistot);
  esittelyaineistotRemoveFirstOne[0].tila = AineistoTila.ODOTTAA_POISTOA;
  await saveAndVerifyAineistoSave(
    oid,
    p3.versio,
    esittelyaineistotRemoveFirstOne,
    suunnitelmaluonnokset,
    originalVuorovaikutus,
    "esittelyAineistotWithoutFirst",
    importAineistoMock
  );
}

export async function verifyVuorovaikutusSnapshot(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const projekti = await loadProjektiFromDatabase(oid);
  const vuorovaikutusKierros = projekti.vuorovaikutusKierros;
  if (vuorovaikutusKierros) {
    cleanupVuorovaikutusKierrosTimestamps(vuorovaikutusKierros);
  }
  const vuorovaikutusKierrosJulkaisut = projekti.vuorovaikutusKierrosJulkaisut;
  if (vuorovaikutusKierrosJulkaisut) {
    vuorovaikutusKierrosJulkaisut.forEach((julkaisu) => cleanupVuorovaikutusKierrosTimestamps(julkaisu));
  }
  expect(vuorovaikutusKierros).toMatchSnapshot();
  expect(vuorovaikutusKierrosJulkaisut).toMatchSnapshot();
}

export async function julkaiseSuunnitteluvaihe(oid: string, userFixture: UserFixture): Promise<void> {
  await api.siirraTila({
    oid,
    toiminto: API.TilasiirtymaToiminto.HYVAKSY,
    tyyppi: API.TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
  });
  userFixture.logout();
  const projektiJulkinen = await loadProjektiJulkinenFromDatabase(oid, API.Status.SUUNNITTELU);
  const vuorovaikutusKierrosJulkaisut = projektiJulkinen.vuorovaikutusKierrokset;
  if (vuorovaikutusKierrosJulkaisut) {
    vuorovaikutusKierrosJulkaisut.forEach((julkaisu) => cleanupVuorovaikutusKierrosTimestamps(julkaisu));
  }

  expectToMatchSnapshot("publicProjekti" + " vuorovaikutusKierrosJulkaisut", vuorovaikutusKierrosJulkaisut);
}

export async function peruVerkkoVuorovaikutusTilaisuudet(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const { versio, vuorovaikutusKierros } = await loadProjektiYllapito(oid);
  const tilaisuusInputWithPeruttu = vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.map<API.VuorovaikutusTilaisuusPaivitysInput>(
    ({ esitettavatYhteystiedot, kaytettavaPalvelu, linkki, nimi, peruttu, Saapumisohjeet, tyyppi }) => ({
      esitettavatYhteystiedot,
      kaytettavaPalvelu,
      linkki,
      nimi,
      peruttu: tyyppi === API.VuorovaikutusTilaisuusTyyppi.VERKOSSA ? true : peruttu,
      Saapumisohjeet,
    })
  );

  assertIsDefined(vuorovaikutusKierros);

  await api.paivitaVuorovaikutusta({
    oid,
    versio,
    vuorovaikutusNumero: vuorovaikutusKierros.vuorovaikutusNumero,
    vuorovaikutusTilaisuudet: tilaisuusInputWithPeruttu!,
  });

  userFixture.logout();
  const projektiJulkinen = await loadProjektiJulkinenFromDatabase(oid, API.Status.SUUNNITTELU);

  expectToMatchSnapshot("publicProjekti" + " perutut tilaisuudet", projektiJulkinen.vuorovaikutusKierrokset?.[0]?.vuorovaikutusTilaisuudet);
}

export async function testPublicAccessToProjekti<T>(
  oid: string,
  expectedStatus: API.Status,
  userFixture: UserFixture,
  description?: string,
  projektiDataExtractor?: (projekti: API.ProjektiJulkinen) => unknown
): Promise<unknown> {
  userFixture.logout();
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, expectedStatus);
  publicProjekti.paivitetty = "***unit test***";
  publicProjekti?.nahtavillaoloVaihe?.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  if (publicProjekti?.nahtavillaoloVaihe) {
    publicProjekti.nahtavillaoloVaihe = cleanupNahtavillaoloJulkaisuJulkinenNahtavillaUrls(publicProjekti.nahtavillaoloVaihe);
  }

  [
    publicProjekti.aloitusKuulutusJulkaisu,
    publicProjekti.nahtavillaoloVaihe,
    publicProjekti.hyvaksymisPaatosVaihe,
    publicProjekti.jatkoPaatos1Vaihe,
    publicProjekti.jatkoPaatos2Vaihe,
  ].forEach((vaihe) => {
    cleanupUudelleenKuulutusTimestamps(vaihe);
  });

  let actual: unknown = publicProjekti;
  if (projektiDataExtractor) {
    actual = projektiDataExtractor(publicProjekti);
  }
  expectToMatchSnapshot("publicProjekti" + (description || ""), actual);
  return actual;
}

export async function testYllapitoAccessToProjekti(
  oid: string,
  expectedStatus: API.Status,
  description?: string,
  projektiDataExtractor?: (projekti: API.Projekti) => unknown
): Promise<API.Projekti> {
  const projekti = await loadProjektiFromDatabase(oid, expectedStatus);
  const snapshot = cloneDeep(projekti);
  snapshot.paivitetty = "***unit test***";

  let actual: unknown = snapshot;
  if (projektiDataExtractor) {
    actual = projektiDataExtractor(snapshot);
  }
  expectToMatchSnapshot("yllapitoProjekti" + (description || ""), actual);
  return projekti;
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

export async function readProjektiFromVelho(): Promise<API.Projekti> {
  const oid = await searchProjectsFromVelhoAndPickFirst();
  const projekti = await api.lataaProjekti(oid);
  await expect(projekti.tallennettu).to.be.false;
  log.info({ projekti });
  return projekti;
}

export async function sendEmailDigests(): Promise<void> {
  await palauteEmailService.sendNewFeedbackDigest();
}

export async function deleteProjekti(oid: string): Promise<void> {
  await testProjektiDatabase.deleteProjektiByOid(oid);

  await fileService.deleteProjekti(oid);
}
