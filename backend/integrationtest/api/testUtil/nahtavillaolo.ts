import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import {
  LisaAineistoParametrit,
  NahtavillaoloVaihe,
  NahtavillaoloVaiheTila,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineisto,
  VelhoAineistoKategoria,
} from "../../../../common/graphql/apiModel";
import { expectToMatchSnapshot } from "./util";
import { loadProjektiFromDatabase, testPublicAccessToProjekti } from "./tests";
import { UserFixture } from "../../../test/fixture/userFixture";
import { cleanupNahtavillaoloJulkaisuJulkinenTimestamps, cleanupNahtavillaoloTimestamps } from "./cleanUpFunctions";
import cloneDeep from "lodash/cloneDeep";
import axios from "axios";

const { expect } = require("chai"); //

export async function testNahtavillaolo(oid: string, projektiPaallikko: string): Promise<void> {
  await api.tallennaProjekti({
    oid,
    nahtavillaoloVaihe: apiTestFixture.nahtavillaoloVaihe([projektiPaallikko]),
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloPerustiedot", cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe));
}

export async function testNahtavillaoloApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisut).to.have.length(1);
  expect(projektiHyvaksyttavaksi.nahtavillaoloVaiheJulkaisut[0].tila).to.eq(NahtavillaoloVaiheTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({ oid, tyyppi: TilasiirtymaTyyppi.NAHTAVILLAOLO, toiminto: TilasiirtymaToiminto.HYVAKSY });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloAfterApproval", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(projekti.nahtavillaoloVaihe),
    nahtavillaoloVaiheJulkaisut: projekti.nahtavillaoloVaiheJulkaisut.map(cleanupNahtavillaoloTimestamps),
  });

  await testPublicAccessToProjekti(
    oid,
    Status.NAHTAVILLAOLO,
    userFixture,
    "NahtavillaOloJulkinenAfterApproval",
    (projektiJulkinen) =>
      projektiJulkinen.nahtavillaoloVaiheJulkaisut.map(cleanupNahtavillaoloJulkaisuJulkinenTimestamps)
  );
}

function adaptAineistoToInput(t2xx: VelhoAineisto[]) {
  return t2xx
    .map((aineisto, index) => {
      const { oid: dokumenttiOid, tiedosto: nimi, kategoriaId } = aineisto;
      return { kategoriaId, jarjestys: index + 1, nimi, dokumenttiOid };
    })
    .slice(0, 5); // Optimization: don't copy all files
}

export async function testImportNahtavillaoloAineistot(
  oid: string,
  velhoAineistoKategorias: VelhoAineistoKategoria[]
): Promise<NahtavillaoloVaihe> {
  const t2xx = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot
        .filter((aineisto) => aineisto.kategoriaId == "T2xx")
        .forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  const lisaAineisto = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot
        .filter((aineisto) => aineisto.tiedosto.indexOf("tokatiedosto") >= 0)
        .forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  await api.tallennaProjekti({
    oid,
    nahtavillaoloVaihe: {
      aineistoNahtavilla: adaptAineistoToInput(t2xx),
      lisaAineisto: adaptAineistoToInput(lisaAineisto),
    },
  });

  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  const nahtavillaoloVaihe = cloneDeep(projekti.nahtavillaoloVaihe);
  expect(nahtavillaoloVaihe.lisaAineistoParametrit).not.to.be.undefined;
  expectToMatchSnapshot("testImportNahtavillaoloAineistot", {
    nahtavillaoloVaihe: cleanupNahtavillaoloTimestamps(nahtavillaoloVaihe),
  });
  return projekti.nahtavillaoloVaihe;
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

export async function testNahtavillaoloLisaAineisto(
  oid: string,
  lisaAineistoParametrit: LisaAineistoParametrit
): Promise<void> {
  expect(lisaAineistoParametrit).to.not.be.empty;
  const lisaAineistot = await api.listaaLisaAineisto(oid, lisaAineistoParametrit);
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
  await validateFileIsDownloadable(lisaAineistot.aineistot[0].linkki);
  await validateFileIsDownloadable(lisaAineistot.lisaAineistot[0].linkki);
}
