import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import {
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
} from "../../../../common/graphql/apiModel";
import { adaptAineistoToInput, expectToMatchSnapshot } from "./util";
import { loadProjektiFromDatabase, testPublicAccessToProjekti } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import { cleanupNahtavillaoloJulkaisuJulkinenTimestamps, cleanupNahtavillaoloTimestamps } from "./cleanUpFunctions";
import cloneDeep from "lodash/cloneDeep";
import axios from "axios";
import assert from "assert";
import { assertIsDefined } from "../../../src/util/assertions";

const { expect } = require("chai"); //

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
    Status.NAHTAVILLAOLO,
    userFixture,
    "NahtavillaOloJulkinenAfterApproval",
    (projektiJulkinen) =>
      (projektiJulkinen.nahtavillaoloVaihe = cleanupNahtavillaoloJulkaisuJulkinenTimestamps(projektiJulkinen.nahtavillaoloVaihe))
  );
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
        .filter((aineisto) => aineisto.tiedosto.indexOf("tokatiedosto") >= 0)
        .forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  await api.tallennaProjekti({
    oid,
    versio,
    nahtavillaoloVaihe: {
      aineistoNahtavilla: adaptAineistoToInput(osaB),
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
