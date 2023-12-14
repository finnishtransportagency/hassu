import * as API from "hassu-common/graphql/apiModel";
import { AineistoTila, Kieli, Projekti, VelhoToimeksianto } from "hassu-common/graphql/apiModel";
import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import fs from "fs";
import { UserFixture } from "../../../test/fixture/userFixture";
import {
  cleanupNahtavillaoloTimestamps,
  cleanupVaiheTimestamps,
  cleanupVuorovaikutusKierrosTimestamps,
} from "../../../commonTestUtil/cleanUpFunctions";
import * as log from "loglevel";
import { fail } from "assert";
import { palauteEmailService } from "../../../src/palaute/palauteEmailService";
import { expectToMatchSnapshot, PATH_EU_LOGO, takeS3Snapshot, verifyProjektiSchedule } from "./util";
import cloneDeep from "lodash/cloneDeep";
import { fileService } from "../../../src/files/fileService";
import { testProjektiDatabase } from "../../../src/database/testProjektiDatabase";
import { loadProjektiYllapito } from "../../../src/projekti/projektiHandler";
import { EventSqsClientMock } from "./eventSqsClientMock";
import { assertIsDefined } from "../../../src/util/assertions";
import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { projektiSchedulerService } from "../../../src/sqsEvents/projektiSchedulerService";
import { DBProjekti } from "../../../src/database/model";
import { adaptStandardiYhteystiedotToSave, removeTypeName } from "../../../src/projekti/adapter/adaptToDB";
import MockDate from "mockdate";
import { parseDate } from "../../../src/util/dateUtil";
import { uploadFile } from "../../util/s3Util";

import { expect } from "chai";
import { haeKategorianAineistot, VuorovaikutusAineistoKategoria } from "hassu-common/vuorovaikutusAineistoKategoria";

export async function testAineistoProcessing(
  oid: string,
  eventSqsClientMock: EventSqsClientMock,
  description: string,
  userFixture: UserFixture
): Promise<void> {
  await eventSqsClientMock.processQueue();
  await takeS3Snapshot(oid, description);
  await verifyVuorovaikutusSnapshot(oid, userFixture, description + ", ja aineistot on prosessoitu");
}

export async function loadProjektiFromDatabase(oid: string, expectedStatus?: API.Status): Promise<API.Projekti> {
  const savedProjekti = await api.lataaProjekti(oid);
  expect(!savedProjekti.tallennettu || savedProjekti.tallennettu).to.be.true;
  if (expectedStatus) {
    expect(savedProjekti.status).to.be.eq(expectedStatus);
  }
  return savedProjekti;
}

export function asetaAika(date: string | undefined | null): void {
  assertIsDefined(date, "Ei voi asettaa ajaksi tuntematonta!");
  MockDate.set(parseDate(date).add(1, "second").toDate()); //Lisätään sekunti keskiyön jälkeen, jotta isBefore-kutsut menisivät samana päivänä läpi oikein
}

export async function siirraVuorovaikutusKierrosMenneisyyteen(oid: string, eventSqsClientMock: EventSqsClientMock): Promise<void> {
  asetaAika("2022-10-01");
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  if (!dbProjekti?.vuorovaikutusKierrosJulkaisut) {
    return;
  }
  for (const julkaisu of dbProjekti.vuorovaikutusKierrosJulkaisut) {
    julkaisu.vuorovaikutusTilaisuudet?.forEach((tilaisuus) => {
      tilaisuus.paivamaara = "2022-01-01";
    });
    await projektiDatabase.vuorovaikutusKierrosJulkaisut.update(dbProjekti, julkaisu);
  }
  await projektiSchedulerService.synchronizeProjektiFiles(oid);
  await eventSqsClientMock.processQueue();
}

export async function loadProjektiJulkinenFromDatabase(oid: string, expectedStatus?: API.Status): Promise<API.ProjektiJulkinen> {
  const savedProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
  if (expectedStatus) {
    expect(savedProjekti.status).to.be.eq(expectedStatus);
  }
  return savedProjekti;
}

export function findProjektiPaallikko(p: API.Projekti): API.ProjektiKayttaja {
  const projektiPaallikko = p.kayttoOikeudet
    ?.filter((kayttaja) => kayttaja.tyyppi === API.KayttajaTyyppi.PROJEKTIPAALLIKKO && kayttaja.email && kayttaja.muokattavissa === false)
    .pop();
  assertIsDefined(projektiPaallikko, "Projektipaallikköä ei löydy!");
  return projektiPaallikko;
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
    tyyppi: value.tyyppi,
    kayttajatunnus: value.kayttajatunnus,
    puhelinnumero: "123",
    yleinenYhteystieto: value.yleinenYhteystieto,
    elyOrganisaatio: value.elyOrganisaatio,
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

async function tallennaLogoInternal(tiedostoNimi: string, contentType: string, path: string): Promise<string> {
  const uploadProperties = await api.valmisteleTiedostonLataus(tiedostoNimi, contentType);
  await uploadFile(uploadProperties, fs.readFileSync(path));
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
    suunnitteluSopimus: apiTestFixture.createSuunnitteluSopimusInput(uploadedFile, UserFixture.testi1Kayttaja.uid!),
    kielitiedot: apiTestFixture.kielitiedotInput,
    vahainenMenettely: false,
    euRahoitus: true,
    euRahoitusLogot: {
      SUOMI: await tallennaEULogo("logofi.png"),
      RUOTSI: await tallennaEULogo("logosv.png"),
    },
    asianhallinta: { inaktiivinen: false },
  });

  // Check that the saved projekti is what it is supposed to be
  const updatedProjekti = await loadProjektiFromDatabase(oid, API.Status.ALOITUSKUULUTUS);
  expect(updatedProjekti.muistiinpano).to.be.equal(apiTestFixture.newNote);
  expect(updatedProjekti.suunnitteluSopimus).include(apiTestFixture.suunnitteluSopimus);
  expect(updatedProjekti.suunnitteluSopimus?.logo?.SUOMI).contain("/suunnittelusopimus/logo.png");
  expect(updatedProjekti.kielitiedot).eql(apiTestFixture.kielitiedot);
  expect(updatedProjekti.euRahoitus).to.be.true;
  expect(updatedProjekti.vahainenMenettely).to.be.false;
  return updatedProjekti;
}

export async function testAloituskuulutus(oid: string): Promise<Projekti> {
  const versio = (await api.lataaProjekti(oid)).versio;
  await api.tallennaProjekti({
    oid,
    versio,
    aloitusKuulutus: apiTestFixture.aloitusKuulutusInput,
  });
  // Check that the saved projekti is what it is supposed to be
  const updatedProjekti = await loadProjektiFromDatabase(oid, API.Status.ALOITUSKUULUTUS);
  expect(updatedProjekti.aloitusKuulutus).eql(apiTestFixture.aloitusKuulutus);
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

export async function testNullifyProjektiField(projekti: Projekti): Promise<Projekti> {
  // Test that fields can be removed as well
  const oid = projekti.oid;
  await api.tallennaProjekti({
    oid,
    versio: projekti.versio,
    muistiinpano: null,
  });

  const projekti2 = await loadProjektiFromDatabase(oid, API.Status.ALOITUSKUULUTUS);
  expect(projekti2.muistiinpano).to.be.undefined;
  return projekti2;
}

export async function testAloituskuulutusApproval(
  projekti: Projekti,
  projektiPaallikko: API.ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.tallennaJaSiirraTilaa(
    {
      oid: projekti.oid,
      versio: projekti.versio,
      aloitusKuulutus: {
        kuulutusPaiva: projekti.aloitusKuulutus?.kuulutusPaiva,
        siirtyySuunnitteluVaiheeseen: projekti.aloitusKuulutus?.siirtyySuunnitteluVaiheeseen,
        hankkeenKuvaus: {
          SUOMI: projekti.aloitusKuulutus?.hankkeenKuvaus?.SUOMI as string,
          RUOTSI: projekti.aloitusKuulutus?.hankkeenKuvaus?.RUOTSI,
        },
        kuulutusYhteystiedot: {
          yhteysHenkilot: projekti.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysHenkilot,
          yhteysTiedot: projekti.aloitusKuulutus?.kuulutusYhteystiedot?.yhteysTiedot?.map(
            (tieto) => removeTypeName<API.YhteystietoInput>(tieto) as API.YhteystietoInput
          ),
        },
        ilmoituksenVastaanottajat: {
          kunnat: projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.kunnat?.map(
            (tieto) => removeTypeName<API.KuntaVastaanottajaInput>(tieto) as API.KuntaVastaanottajaInput
          ),
          viranomaiset: projekti.aloitusKuulutus?.ilmoituksenVastaanottajat?.viranomaiset?.map(
            (tieto) => removeTypeName<API.ViranomaisVastaanottajaInput>(tieto) as API.ViranomaisVastaanottajaInput
          ),
        },
      },
    },
    {
      oid: projekti.oid,
      tyyppi: API.TilasiirtymaTyyppi.ALOITUSKUULUTUS,
      toiminto: API.TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    }
  );
  await api.siirraTila({ oid: projekti.oid, tyyppi: API.TilasiirtymaTyyppi.ALOITUSKUULUTUS, toiminto: API.TilasiirtymaToiminto.HYVAKSY });
}

export async function testSuunnitteluvaihePerustiedot(
  oid: string,
  vuorovaikutusKierrosNro: number,
  description: string,
  userFixture: UserFixture
): Promise<Projekti> {
  const versio = (await api.lataaProjekti(oid)).versio;
  await api.tallennaProjekti({
    oid,
    versio,
    vuorovaikutusKierros: {
      vuorovaikutusNumero: vuorovaikutusKierrosNro,
      hankkeenKuvaus: apiTestFixture.hankkeenKuvausSuunnittelu,
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "huomenna",
      },
      suunnittelunEteneminenJaKesto: {
        SUOMI: "suunnitelma etenee aikataulussa ja valmistuu vuoden 2022 aikana",
      },
      palautteidenVastaanottajat: [UserFixture.mattiMeikalainen.uid!],
      esittelyaineistot: [],
      suunnitelmaluonnokset: [],
      kysymyksetJaPalautteetViimeistaan: "2023-01-01",
    },
  });
  return await verifyVuorovaikutusSnapshot(
    oid,
    userFixture,
    description + " Normaalin suunnitteluvaiheen perustietojen tallentamisen jälkeen, krs. " + vuorovaikutusKierrosNro
  );
}

export async function testPoistaVuorovaikutuskierros(oid: string, description: string, userFixture: UserFixture): Promise<Projekti> {
  await api.siirraTila({
    oid,
    tyyppi: API.TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
    toiminto: API.TilasiirtymaToiminto.HYLKAA,
    syy: "Pitää korjata aiemman kierroksen tietoa",
  });
  return await verifyVuorovaikutusSnapshot(oid, userFixture, description);
}

export async function testPaivitaPerustietoja(
  oid: string,
  kierrosNumero: number,
  description: string,
  userFixture: UserFixture
): Promise<void> {
  const versio = (await api.lataaProjekti(oid)).versio;
  await api.paivitaPerustiedot({
    oid,
    versio,
    vuorovaikutusKierros: {
      vuorovaikutusNumero: kierrosNumero,
      hankkeenKuvaus: {
        SUOMI: "Uusi hankkeen kuvaus, nro " + kierrosNumero,
      },
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "Uusi arvio seuraavan vaihen alkamisesta, nro " + kierrosNumero,
      },
      suunnittelunEteneminenJaKesto: {
        SUOMI: "Uusi suunnittelun eteneminen ja kesto, nro " + kierrosNumero,
      },
      kysymyksetJaPalautteetViimeistaan: "2023-01-01",
    },
  });
  await verifyVuorovaikutusSnapshot(oid, userFixture, description + ", api.paivitaPerustiedot krs. " + kierrosNumero);
}

export async function testPaivitaPerustietojaFail(oid: string, kierrosNumero: number): Promise<void> {
  const versio = (await api.lataaProjekti(oid)).versio;
  const paivitys = api.paivitaPerustiedot({
    oid,
    versio,
    vuorovaikutusKierros: {
      vuorovaikutusNumero: kierrosNumero,
      hankkeenKuvaus: {
        SUOMI: "Uusi hankkeen kuvaus, nro " + kierrosNumero,
      },
      arvioSeuraavanVaiheenAlkamisesta: {
        SUOMI: "Uusi arvio seuraavan vaihen alkamisesta, nro " + kierrosNumero,
      },
      suunnittelunEteneminenJaKesto: {
        SUOMI: "Uusi suunnittelun eteneminen ja kesto, nro " + kierrosNumero,
      },
      kysymyksetJaPalautteetViimeistaan: "2023-01-01",
    },
  });
  expect(paivitys).to.eventually.rejectedWith("IllegalArgumentError");
}

export async function testSuunnitteluvaiheVuorovaikutus(
  oid: string,
  versio: number,
  kayttajatunnus: string,
  vuorovaikutusKierrosNro: number,
  description: string,
  userFixture: UserFixture
): Promise<Projekti> {
  await api.tallennaProjekti({
    oid,
    versio,
    vuorovaikutusKierros: apiTestFixture.vuorovaikutusKierroksenTiedot(vuorovaikutusKierrosNro, [kayttajatunnus]),
  });
  const suunnitteluVaihe1 = await loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
  assertIsDefined(suunnitteluVaihe1.vuorovaikutusKierros);
  await verifyVuorovaikutusSnapshot(
    oid,
    userFixture,
    description + ` Vuorovaikutuksen tietojen päivittämisen jälkeen, krs ${vuorovaikutusKierrosNro}`
  );
  return suunnitteluVaihe1;
}

export async function testAddSuunnitelmaluonnos(
  oid: string,
  velhoToimeksiannot: VelhoToimeksianto[],
  eventSqsClientMock: EventSqsClientMock,
  description: string,
  userFixture: UserFixture
): Promise<API.Projekti> {
  let projekti = await loadProjektiFromDatabase(oid, API.Status.NAHTAVILLAOLO_AINEISTOT);
  const suunnitelmaluonnoksiaKpl = projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset?.length || 0;
  assertIsDefined(projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset);

  await paivitaVuorovaikutusAineisto(projekti.oid, velhoToimeksiannot);

  await testAineistoProcessing(
    oid,
    eventSqsClientMock,
    description + " Uusi aineisto lisätty vuorovaikutuksen suunnitelmaluonnoksiin",
    userFixture
  );
  projekti = await loadProjektiFromDatabase(oid, API.Status.NAHTAVILLAOLO_AINEISTOT);
  const suunnitelmaluonnoksiaKplLisayksenJalkeen = projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset?.length;
  expect(suunnitelmaluonnoksiaKplLisayksenJalkeen).to.eq(suunnitelmaluonnoksiaKpl + 1);
  assertIsDefined(projekti?.vuorovaikutusKierrosJulkaisut?.[1]?.suunnitelmaluonnokset);
  return projekti;
}

async function paivitaVuorovaikutusAineisto(oid: string, velhoToimeksiannot: VelhoToimeksianto[]): Promise<void> {
  const projekti: DBProjekti | undefined = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(projekti);
  const { versio } = projekti;
  const kierros = projekti?.vuorovaikutusKierros;
  assertIsDefined(kierros);
  const { vuorovaikutusNumero, kysymyksetJaPalautteetViimeistaan, aineistot } = kierros;
  assertIsDefined(kysymyksetJaPalautteetViimeistaan);
  assertIsDefined(aineistot);
  const suunnitelmaluonnoksetInput: API.AineistoInput[] =
    haeKategorianAineistot(aineistot, VuorovaikutusAineistoKategoria.SUUNNITELMALUONNOS)?.map((aineisto) => {
      const { dokumenttiOid, nimi, kategoriaId, jarjestys } = aineisto;
      return { dokumenttiOid, nimi, kategoriaId, jarjestys };
    }) ?? [];

  const velhoAineistos = pickAineistotFromToimeksiannotByName(velhoToimeksiannot, "Radan risteämärekisteriote_1203.pdf");
  expect(velhoAineistos.length).to.be.greaterThan(0);
  const velhoAineisto = velhoAineistos[0];
  suunnitelmaluonnoksetInput.push({ dokumenttiOid: velhoAineisto.oid, nimi: velhoAineisto.tiedosto });
  await api.paivitaPerustiedot({
    oid,
    versio,
    vuorovaikutusKierros: {
      vuorovaikutusNumero,
      kysymyksetJaPalautteetViimeistaan,
      suunnitelmaluonnokset: suunnitelmaluonnoksetInput,
    },
  });
}

export async function testLuoUusiVuorovaikutusKierros(oid: string, description: string, userFixture: UserFixture): Promise<Projekti> {
  await api.siirraTila({ oid, tyyppi: API.TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS, toiminto: API.TilasiirtymaToiminto.LUO_UUSI_KIERROS });
  const projekti = loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
  await verifyVuorovaikutusSnapshot(oid, userFixture, description);
  const projektiJulkinen = await loadProjektiJulkinenFromDatabase(oid, API.Status.SUUNNITTELU);
  let vuorovaikutukset = projektiJulkinen.vuorovaikutukset;
  if (vuorovaikutukset) {
    vuorovaikutukset = cleanupVuorovaikutusKierrosTimestamps(vuorovaikutukset);
  }

  expectToMatchSnapshot(description + ", publicProjekti" + " vuorovaikutukset", vuorovaikutukset);
  return projekti;
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

async function saveAndVerifyAineistoSave(
  oid: string,
  versio: number,
  esittelyaineistot: API.AineistoInput[],
  suunnitelmaluonnokset: API.AineistoInput[],
  originalVuorovaikutus: API.VuorovaikutusKierros,
  identifier: string | number | undefined,
  eventSqsClientMock: EventSqsClientMock,
  userFixture: UserFixture
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
  await eventSqsClientMock.processQueue();
  const description = "saveAndVerifyAineistoSave" + (identifier !== undefined ? ` #${identifier}` : "");
  return await verifyVuorovaikutusSnapshot(oid, userFixture, description);
}

export function pickAineistotFromToimeksiannotByName(
  velhoToimeksiannot: VelhoToimeksianto[],
  ...tiedostoNimet: string[]
): API.VelhoAineisto[] {
  return velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      return documents.concat(toimeksianto.aineistot.filter((aineisto) => tiedostoNimet.indexOf(aineisto.tiedosto) >= 0));
    }, [] as API.VelhoAineisto[])
    .sort((a, b) => b.tiedosto.localeCompare(a.tiedosto));
}

export async function testImportAineistot(
  oid: string,
  velhoToimeksiannot: VelhoToimeksianto[],
  eventSqsClientMock: EventSqsClientMock,
  description: string,
  userFixture: UserFixture
): Promise<Projekti> {
  const p1 = await loadProjektiFromDatabase(oid, API.Status.SUUNNITTELU);
  const originalVuorovaikutus = p1.vuorovaikutusKierros;
  if (!originalVuorovaikutus) {
    throw new Error("testImportAineistot: originalVuorovaikutus määrittelemättä");
  }

  const aineistot = pickAineistotFromToimeksiannotByName(
    velhoToimeksiannot,
    "1400-72J-6708-2_Suunnitelmakartta_1.pdf",
    "1400-72J-6709-1_Johtokartta_1.pdf",
    "1400-73Y-6710-5_Pituusleikkaus_Y5.pdf"
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
    description + ", initialSave",
    eventSqsClientMock,
    userFixture
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
    description + ", updateNimiAndJarjestys",
    eventSqsClientMock,
    userFixture
  );

  const esittelyaineistotRemoveFirstOne = cloneDeep(esittelyaineistot);
  esittelyaineistotRemoveFirstOne[0].tila = AineistoTila.ODOTTAA_POISTOA;
  return await saveAndVerifyAineistoSave(
    oid,
    p3.versio,
    esittelyaineistotRemoveFirstOne,
    suunnitelmaluonnokset,
    originalVuorovaikutus,
    description + ", esittelyAineistotWithoutFirst",
    eventSqsClientMock,
    userFixture
  );
}

export async function verifyVuorovaikutusSnapshot(oid: string, userFixture: UserFixture, text: string): Promise<Projekti> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const projekti = await loadProjektiFromDatabase(oid);
  let vuorovaikutusKierros = projekti.vuorovaikutusKierros;
  if (vuorovaikutusKierros) {
    vuorovaikutusKierros = cleanupVuorovaikutusKierrosTimestamps(vuorovaikutusKierros);
  }
  let vuorovaikutusKierrosJulkaisut = projekti.vuorovaikutusKierrosJulkaisut;
  if (vuorovaikutusKierrosJulkaisut) {
    vuorovaikutusKierrosJulkaisut = vuorovaikutusKierrosJulkaisut.map((julkaisu) => cleanupVuorovaikutusKierrosTimestamps(julkaisu));
  }
  expectToMatchSnapshot(text + ", vuorovaikutuskierros", vuorovaikutusKierros);
  expectToMatchSnapshot(text + ", vuorovaikutusKierrosJulkaisut", vuorovaikutusKierrosJulkaisut);
  return projekti;
}

export async function julkaiseSuunnitteluvaihe(projekti: Projekti, description: string, userFixture: UserFixture): Promise<void> {
  await api.tallennaJaSiirraTilaa(
    {
      oid: projekti.oid,
      versio: projekti.versio,
      vuorovaikutusKierros: {
        vuorovaikutusNumero: projekti.vuorovaikutusKierros?.vuorovaikutusNumero as number,
        hankkeenKuvaus: removeTypeName(projekti.vuorovaikutusKierros?.hankkeenKuvaus),
        arvioSeuraavanVaiheenAlkamisesta: removeTypeName(projekti.vuorovaikutusKierros?.arvioSeuraavanVaiheenAlkamisesta),
        suunnittelunEteneminenJaKesto: removeTypeName(projekti.vuorovaikutusKierros?.suunnittelunEteneminenJaKesto),
        palautteidenVastaanottajat: projekti.vuorovaikutusKierros?.palautteidenVastaanottajat,
        vuorovaikutusJulkaisuPaiva: projekti.vuorovaikutusKierros?.vuorovaikutusJulkaisuPaiva,
        kysymyksetJaPalautteetViimeistaan: projekti.vuorovaikutusKierros?.kysymyksetJaPalautteetViimeistaan,
        vuorovaikutusTilaisuudet: projekti.vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.map((tilaisuus) => ({
          tyyppi: tilaisuus.tyyppi,
          nimi: removeTypeName(tilaisuus.nimi),
          paivamaara: tilaisuus.paivamaara,
          alkamisAika: tilaisuus.alkamisAika,
          paattymisAika: tilaisuus.paattymisAika,
          kaytettavaPalvelu: tilaisuus.kaytettavaPalvelu,
          linkki: tilaisuus.linkki,
          paikka: removeTypeName(tilaisuus.paikka),
          osoite: removeTypeName(tilaisuus.osoite),
          postinumero: tilaisuus.postinumero,
          postitoimipaikka: removeTypeName(tilaisuus.postitoimipaikka),
          lisatiedot: removeTypeName(tilaisuus.lisatiedot),
          esitettavatYhteystiedot: {
            yhteysHenkilot: tilaisuus.esitettavatYhteystiedot?.yhteysHenkilot,
            yhteysTiedot: tilaisuus.esitettavatYhteystiedot?.yhteysTiedot?.map(
              (tieto) => removeTypeName<API.YhteystietoInput>(tieto) as API.YhteystietoInput
            ),
          },
          peruttu: tilaisuus.peruttu,
        })),
        esittelyaineistot: projekti.vuorovaikutusKierros?.esittelyaineistot?.map(
          (aineisto) => removeTypeName(aineisto) as API.AineistoInput
        ),
        suunnitelmaluonnokset: projekti.vuorovaikutusKierros?.suunnitelmaluonnokset?.map(
          (aineisto) => removeTypeName(aineisto) as API.AineistoInput
        ),
        videot: projekti.vuorovaikutusKierros?.videot?.map((video) => ({
          SUOMI: removeTypeName(video.SUOMI) as API.LinkkiInput,
          RUOTSI: removeTypeName(video.RUOTSI),
        })),
        suunnittelumateriaali: projekti.vuorovaikutusKierros?.suunnittelumateriaali?.map((video) => ({
          SUOMI: removeTypeName(video.SUOMI) as API.LinkkiInput,
          RUOTSI: removeTypeName(video.RUOTSI),
        })),
        esitettavatYhteystiedot: {
          yhteysHenkilot: projekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysHenkilot,
          yhteysTiedot: projekti.vuorovaikutusKierros?.esitettavatYhteystiedot?.yhteysTiedot?.map(
            (tieto) => removeTypeName<API.YhteystietoInput>(tieto) as API.YhteystietoInput
          ),
        },
        ilmoituksenVastaanottajat: {
          kunnat: projekti.vuorovaikutusKierros?.ilmoituksenVastaanottajat?.kunnat?.map(
            (tieto) => removeTypeName<API.KuntaVastaanottajaInput>(tieto) as API.KuntaVastaanottajaInput
          ),
          viranomaiset: projekti.vuorovaikutusKierros?.ilmoituksenVastaanottajat?.viranomaiset?.map(
            (tieto) => removeTypeName<API.ViranomaisVastaanottajaInput>(tieto) as API.ViranomaisVastaanottajaInput
          ),
        },
        selosteVuorovaikutuskierrokselle: projekti.vuorovaikutusKierros?.selosteVuorovaikutuskierrokselle,
      },
    },
    {
      oid: projekti.oid,
      toiminto: API.TilasiirtymaToiminto.HYVAKSY,
      tyyppi: API.TilasiirtymaTyyppi.VUOROVAIKUTUSKIERROS,
    }
  );
  userFixture.logout();
  const projektiJulkinen = await loadProjektiJulkinenFromDatabase(projekti.oid, API.Status.SUUNNITTELU);
  let vuorovaikutukset = projektiJulkinen.vuorovaikutukset;
  if (vuorovaikutukset) {
    vuorovaikutukset = cleanupVuorovaikutusKierrosTimestamps(vuorovaikutukset);
  }

  expectToMatchSnapshot(description + ", publicProjekti" + " vuorovaikutukset", vuorovaikutukset);
  await verifyVuorovaikutusSnapshot(projekti.oid, userFixture, description);
  await verifyProjektiSchedule(projekti.oid, description);
}

export async function peruVerkkoVuorovaikutusTilaisuudet(oid: string, description: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const { versio, vuorovaikutusKierros } = await loadProjektiYllapito(oid);
  const tilaisuusInputWithPeruttu = vuorovaikutusKierros?.vuorovaikutusTilaisuudet?.map<API.VuorovaikutusTilaisuusPaivitysInput>(
    ({ esitettavatYhteystiedot, kaytettavaPalvelu, linkki, nimi, peruttu, lisatiedot, tyyppi }) => ({
      esitettavatYhteystiedot: adaptStandardiYhteystiedotToSave(esitettavatYhteystiedot),
      kaytettavaPalvelu,
      linkki,
      nimi,
      peruttu: tyyppi === API.VuorovaikutusTilaisuusTyyppi.VERKOSSA ? true : peruttu,
      lisatiedot,
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

  expectToMatchSnapshot(
    description + ", publicProjekti" + " perutut tilaisuudet",
    projektiJulkinen.vuorovaikutukset?.vuorovaikutusTilaisuudet
  );
  await verifyVuorovaikutusSnapshot(oid, userFixture, description);
  await verifyProjektiSchedule(oid, description);
}

export async function testPublicAccessToProjekti(
  oid: string,
  expectedStatus: API.Status,
  userFixture: UserFixture,
  description?: string,
  projektiDataExtractor?: (projekti: API.ProjektiJulkinen) => unknown
): Promise<unknown> {
  userFixture.logout();
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, expectedStatus);
  publicProjekti.paivitetty = "***unittest***";
  publicProjekti?.nahtavillaoloVaihe?.aineistoNahtavilla?.forEach((aineisto) => (aineisto.tuotu = "***unittest***"));
  if (publicProjekti?.nahtavillaoloVaihe) {
    publicProjekti.nahtavillaoloVaihe = cleanupNahtavillaoloTimestamps(publicProjekti.nahtavillaoloVaihe);
  }

  [
    publicProjekti.aloitusKuulutusJulkaisu,
    publicProjekti.nahtavillaoloVaihe,
    publicProjekti.hyvaksymisPaatosVaihe,
    publicProjekti.jatkoPaatos1Vaihe,
    publicProjekti.jatkoPaatos2Vaihe,
  ].forEach((vaihe) => {
    cleanupVaiheTimestamps(vaihe);
  });
  if (publicProjekti.vuorovaikutukset) {
    publicProjekti.vuorovaikutukset = cleanupVuorovaikutusKierrosTimestamps(publicProjekti.vuorovaikutukset);
  }

  let actual: unknown = publicProjekti;
  if (projektiDataExtractor) {
    actual = projektiDataExtractor(publicProjekti);
  }
  expectToMatchSnapshot("publicProjekti " + (description || ""), actual);
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
