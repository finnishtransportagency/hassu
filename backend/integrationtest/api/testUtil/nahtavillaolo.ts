import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import {
  Aineisto,
  AineistoInput,
  KuulutusJulkaisuTila,
  Projekti,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineisto,
  VelhoToimeksianto,
} from "hassu-common/graphql/apiModel";
import { SchedulerMock, adaptAineistoToInput, expectToMatchSnapshot, adaptAPIAineistoToInput, removeTiedosto } from "./util";
import { loadProjektiFromDatabase, testPublicAccessToProjekti } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import { cleanupNahtavillaoloTimestamps } from "../../../commonTestUtil/cleanUpFunctions";
import cloneDeep from "lodash/cloneDeep";
import assert from "assert";
import { assertIsDefined } from "../../../src/util/assertions";
import { expect } from "chai";
import { removeTypeName } from "../../../src/projekti/adapter/adaptToDB";
import { EventSqsClientMock } from "./eventSqsClientMock";
import { projektiDatabase } from "../../../src/database/projektiDatabase";

export async function testNahtavillaolo(oid: string, projektiPaallikko: string): Promise<Projekti> {
  let p = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO_AINEISTOT);
  await api.tallennaProjekti({
    oid,
    versio: p.versio,
    nahtavillaoloVaihe: apiTestFixture.nahtavillaoloVaiheAineisto(),
  });
  p = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  await api.tallennaProjekti({
    oid,
    versio: p.versio,
    nahtavillaoloVaihe: apiTestFixture.nahtavillaoloVaihe([projektiPaallikko]),
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloPerustiedot", cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe));
  return projekti;
}

export async function testNahtavillaoloApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture,
  expectedPublicStatus: Status,
  desc: string
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  let dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  assertIsDefined(dbProjekti);
  const julkaisutLengthBeginning = dbProjekti?.nahtavillaoloVaiheJulkaisut?.length ?? 0;

  await api.tallennaJaSiirraTilaa(
    {
      oid: dbProjekti.oid,
      versio: dbProjekti.versio,
      nahtavillaoloVaihe: {
        aineistoNahtavilla: dbProjekti.nahtavillaoloVaihe?.aineistoNahtavilla?.map((item) => removeTiedosto(item)) as AineistoInput[],
        kuulutusPaiva: dbProjekti.nahtavillaoloVaihe?.kuulutusPaiva,
        kuulutusVaihePaattyyPaiva: dbProjekti.nahtavillaoloVaihe?.kuulutusVaihePaattyyPaiva,
        muistutusoikeusPaattyyPaiva: dbProjekti.nahtavillaoloVaihe?.muistutusoikeusPaattyyPaiva,
        hankkeenKuvaus: {
          SUOMI: dbProjekti.nahtavillaoloVaihe?.hankkeenKuvaus?.SUOMI ?? "",
          RUOTSI: dbProjekti.nahtavillaoloVaihe?.hankkeenKuvaus?.RUOTSI,
        },
        kuulutusYhteystiedot: {
          yhteysHenkilot: dbProjekti.nahtavillaoloVaihe?.kuulutusYhteystiedot?.yhteysHenkilot,
          yhteysTiedot: dbProjekti.nahtavillaoloVaihe?.kuulutusYhteystiedot?.yhteysTiedot,
        },
        ilmoituksenVastaanottajat: {
          kunnat: dbProjekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.kunnat,
          viranomaiset: dbProjekti.nahtavillaoloVaihe?.ilmoituksenVastaanottajat?.viranomaiset,
        },
      },
    },
    {
      oid: dbProjekti.oid,
      tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    }
  );

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(dbProjekti.oid, Status.NAHTAVILLAOLO);
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisu).to.be.an("object");
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  expect(dbProjekti?.nahtavillaoloVaihe?.aineistopaketti).to.exist;
  expect(dbProjekti?.nahtavillaoloVaiheJulkaisut?.[dbProjekti.nahtavillaoloVaiheJulkaisut.length - 1].aineistopaketti).to.exist;
  await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO, toiminto: TilasiirtymaToiminto.HYVAKSY });
  dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  expect(dbProjekti?.nahtavillaoloVaiheJulkaisut?.[dbProjekti.nahtavillaoloVaiheJulkaisut.length - 1].aineistopaketti).to.exist;
  expect(dbProjekti?.nahtavillaoloVaiheJulkaisut?.length).to.eql(julkaisutLengthBeginning + 1);
  expect(dbProjekti?.nahtavillaoloVaiheJulkaisut?.[julkaisutLengthBeginning].tila).to.eql(KuulutusJulkaisuTila.HYVAKSYTTY);
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloAfterApproval", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe),
    nahtavillaoloVaiheJulkaisu: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaiheJulkaisu),
  });
  await testPublicAccessToProjekti(projekti.oid, expectedPublicStatus, userFixture, desc, (projektiJulkinen) => {
    projektiJulkinen.nahtavillaoloVaihe = cleanupNahtavillaoloTimestamps(projektiJulkinen.nahtavillaoloVaihe);
    projektiJulkinen.nahtavillaoloVaihe = cleanupNahtavillaoloTimestamps(projektiJulkinen.nahtavillaoloVaihe);
    return projektiJulkinen.nahtavillaoloVaihe;
  });
}

export async function testNahtavillaoloAineistoSendForApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<Projekti> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloAfterSendAineistoMuokkausForApproval", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe),
    nahtavillaoloVaiheJulkaisu: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaiheJulkaisu),
  });
  return projekti;
}

export async function testLisaaMuistutusIncrement(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture,
  initialMuistutusMaara: number | null | undefined
) {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  let projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  userFixture.logout();
  expect(projekti.muistutusMaara).to.equal(initialMuistutusMaara);
  await api.lisaaMuistutus(oid, {
    katuosoite: "Katuosoite 123",
    muistutus: "Muistutus " + ((initialMuistutusMaara ?? 0) + 1),
    postinumero: "03132",
    postitoimipaikka: "Postitoimipaikka",
    sahkoposti: "etunimi.sukunimi@org.fi",
    maa: "246",
    liitteet: [],
  });
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  userFixture.logout();
  expect(projekti.muistutusMaara).to.equal((initialMuistutusMaara ?? 0) + 1);
}

export async function testImportNahtavillaoloAineistot(projekti: Projekti, velhoToimeksiannot: VelhoToimeksianto[]): Promise<Projekti> {
  const { oid, versio } = projekti;
  const osaA = velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      toimeksianto.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  const aineistoNahtavilla = [
    ...adaptAPIAineistoToInput(projekti.nahtavillaoloVaihe?.aineistoNahtavilla ?? []),
    ...adaptAineistoToInput(osaA, "uusi").map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })),
  ];
  await api.tallennaProjekti({
    oid,
    versio,
    nahtavillaoloVaihe: {
      aineistoNahtavilla,
    },
  });

  const p = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  const nahtavillaoloVaihe = cloneDeep(p.nahtavillaoloVaihe);
  expectToMatchSnapshot("testImportNahtavillaoloAineistot", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(nahtavillaoloVaihe),
  });
  assert(p.nahtavillaoloVaihe);
  return p;
}

export async function testMuokkaaAineistojaNahtavillaolo(
  projekti: Projekti,
  velhoToimeksiannot: VelhoToimeksianto[],
  schedulerMock: SchedulerMock,
  eventSqsClientMock: EventSqsClientMock
): Promise<Projekti> {
  const uudetAineistot = velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      toimeksianto.aineistot
        .filter((aineisto) => {
          return aineisto.tiedosto.indexOf("1400-73Y-6710-4_Pituusleikkaus_Y4.pdf") >= 0;
        })
        .forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  const nykyinenAineisto: Aineisto[] = projekti.nahtavillaoloVaihe?.aineistoNahtavilla as Aineisto[];
  const aineistoInput: AineistoInput[] = nykyinenAineisto
    .map((aineisto) => removeTiedosto(removeTypeName(aineisto)) as AineistoInput)
    .concat(adaptAineistoToInput(uudetAineistot, "uusi").map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })));

  await api.tallennaProjekti({
    oid: projekti.oid,
    versio: projekti.versio,
    nahtavillaoloVaihe: {
      aineistoNahtavilla: aineistoInput,
    },
  });

  let dbprojekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
  expect(dbprojekti?.nahtavillaoloVaihe?.aineistoMuokkaus).to.not.be.null;
  expectToMatchSnapshot("testNahtavillaoloAineistomuokkaus ennen scheduleria ja sqs-jononkäsittelyä", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(dbprojekti?.nahtavillaoloVaihe),
  });
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.NAHTAVILLAOLO);

  await schedulerMock.verifyAndRunSchedule();
  await eventSqsClientMock.processQueue();
  dbprojekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
  expect(dbprojekti?.nahtavillaoloVaihe?.aineistoMuokkaus).to.not.be.null;
  expectToMatchSnapshot("testNahtavillaoloAineistomuokkaus schedulerin ja sqs-jononkäsittelyn jälkeen", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(dbprojekti?.nahtavillaoloVaihe),
  });
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaoloAineistoMuokkausAfterImport", cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe));

  assert(projekti.nahtavillaoloVaihe);
  return projekti;
}
