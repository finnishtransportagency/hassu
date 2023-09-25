import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import {
  Aineisto,
  AineistoInput,
  KuulutusJulkaisuTila,
  LisaAineistoParametrit,
  NahtavillaoloVaihe,
  Projekti,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineisto,
  VelhoToimeksianto,
} from "hassu-common/graphql/apiModel";
import { SchedulerMock, adaptAineistoToInput, expectToMatchSnapshot } from "./util";
import { loadProjektiFromDatabase, testPublicAccessToProjekti } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import {
  cleanupNahtavillaoloJulkaisuJulkinenNahtavillaUrls,
  cleanupNahtavillaoloJulkaisuJulkinenTimestamps,
  cleanupNahtavillaoloTimestamps,
} from "./cleanUpFunctions";
import cloneDeep from "lodash/cloneDeep";
import axios from "axios";
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

export async function testNahtavillaoloApproval(oid: string, projektiPaallikko: ProjektiKayttaja, userFixture: UserFixture): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisu).to.be.an("object");
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO, toiminto: TilasiirtymaToiminto.HYVAKSY });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloAfterApproval", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe),
    nahtavillaoloVaiheJulkaisu: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaiheJulkaisu),
  });
  await testPublicAccessToProjekti(
    oid,
    Status.SUUNNITTELU,
    userFixture,
    "NahtavillaOloJulkinenAfterApprovalButNotPublic",
    (projektiJulkinen) => {
      projektiJulkinen.nahtavillaoloVaihe = cleanupNahtavillaoloJulkaisuJulkinenTimestamps(projektiJulkinen.nahtavillaoloVaihe);
      projektiJulkinen.nahtavillaoloVaihe = cleanupNahtavillaoloJulkaisuJulkinenNahtavillaUrls(projektiJulkinen.nahtavillaoloVaihe);
      return projektiJulkinen.nahtavillaoloVaihe;
    }
  );
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
    etunimi: "Etunimi",
    sukunimi: "Sukunimi",
    katuosoite: "Katuosoite 123",
    muistutus: "Muistutus " + ((initialMuistutusMaara || 0) + 1),
    postinumeroJaPostitoimipaikka: "03132 Postitoimipaikka",
    puhelinnumero: "1234567890",
    sahkoposti: "etunimi.sukunimi@org.fi",
  });
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  userFixture.logout();
  expect(projekti.muistutusMaara).to.equal((initialMuistutusMaara || 0) + 1);
}

export async function testImportNahtavillaoloAineistot(
  projekti: Projekti,
  velhoToimeksiannot: VelhoToimeksianto[]
): Promise<NahtavillaoloVaihe> {
  const { oid, versio } = projekti;
  const osaB = velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      toimeksianto.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  const lisaAineisto = velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      toimeksianto.aineistot
        .filter((aineisto) => {
          return aineisto.tiedosto.indexOf("Yksityistie_lunastukset.pdf") >= 0;
        })
        .forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  await api.tallennaProjekti({
    oid,
    versio,
    nahtavillaoloVaihe: {
      aineistoNahtavilla: adaptAineistoToInput(osaB).map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })),
      lisaAineisto: adaptAineistoToInput(lisaAineisto),
    },
  });

  const p = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  const nahtavillaoloVaihe = cloneDeep(p.nahtavillaoloVaihe);
  expect(nahtavillaoloVaihe?.lisaAineistoParametrit).not.to.be.undefined;
  expectToMatchSnapshot("testImportNahtavillaoloAineistot", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(nahtavillaoloVaihe),
  });
  assert(p.nahtavillaoloVaihe);
  return p.nahtavillaoloVaihe;
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
    .map((aineisto) => removeTypeName(aineisto) as AineistoInput)
    .concat(adaptAineistoToInput(uudetAineistot).map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })));

  await api.tallennaProjekti({
    oid: projekti.oid,
    versio: projekti.versio,
    nahtavillaoloVaihe: {
      aineistoNahtavilla: aineistoInput,
    },
  });

  const dbprojekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
  expect(dbprojekti?.nahtavillaoloVaihe?.aineistoMuokkaus).to.not.be.null;
  expectToMatchSnapshot("testNahtavillaoloAineistomuokkaus", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(dbprojekti?.nahtavillaoloVaihe),
  });
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.NAHTAVILLAOLO);
  const nahtavillaoloVaihe = cloneDeep(projekti.nahtavillaoloVaihe);
  expect(nahtavillaoloVaihe?.lisaAineistoParametrit).not.to.be.undefined;

  await schedulerMock.verifyAndRunSchedule();
  await eventSqsClientMock.processQueue();
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaoloAineistoMuokkausAfterImport", cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe));

  assert(projekti.nahtavillaoloVaihe);
  return projekti;
}

async function validateFileIsDownloadable(aineistoURL: string) {
  try {
    const getResponse = await axios.get(aineistoURL);
    expect(getResponse.status).to.be.eq(200);
  } catch (e) {
    console.log(e);
    expect.fail("Could not download lisäaineisto from url:" + aineistoURL);
  }
}

export async function testNahtavillaoloLisaAineisto(oid: string, lisaAineistoParametrit: LisaAineistoParametrit): Promise<void> {
  expect(lisaAineistoParametrit).to.not.be.empty;
  const lisaAineistot = await api.listaaLisaAineisto(oid, lisaAineistoParametrit);
  assertIsDefined(lisaAineistot.aineistot, "lisaAineistot.aineistot");
  assertIsDefined(lisaAineistot.lisaAineistot, "lisaAineistot.lisaAineistot");
  expectToMatchSnapshot("lisaAineisto", {
    aineistot: lisaAineistot.aineistot.map((aineisto) => {
      const a = cloneDeep(aineisto);
      a.linkki = "***unittest***";
      return a;
    }),
    lisaAineistot: lisaAineistot.lisaAineistot.map((aineisto) => {
      const a = cloneDeep(aineisto);
      a.linkki = "***unittest***";
      return a;
    }),
  });
  assertIsDefined(lisaAineistot.aineistot[0].linkki, "lisaAineistot.aineistot[0].linkki");
  assertIsDefined(lisaAineistot.lisaAineistot[0].linkki, "lisaAineistot.lisaAineistot[0].linkki");
  await validateFileIsDownloadable(lisaAineistot.aineistot[0].linkki);
  await validateFileIsDownloadable(lisaAineistot.lisaAineistot[0].linkki);
}
