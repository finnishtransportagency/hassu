import { api } from "../apiClient";
import { apiTestFixture } from "../apiTestFixture";
import {
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

const { expect } = require("chai"); //

export async function testNahtavillaOlo(oid: string, projektiPaallikko: string): Promise<void> {
  await api.tallennaProjekti({
    oid,
    nahtavillaoloVaihe: apiTestFixture.nahtavillaoloVaihe([projektiPaallikko]),
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  expectToMatchSnapshot("testNahtavillaOloPerustiedot", projekti.nahtavillaoloVaihe);
}

export async function testNahtavillaOloApproval(
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
  return t2xx.map((aineisto, index) => {
    const { oid: dokumenttiOid, tiedosto: nimi, kategoriaId } = aineisto;
    return { kategoriaId, jarjestys: index + 1, nimi, dokumenttiOid };
  });
}

export async function testImportNahtavillaoloAineistot(
  oid: string,
  velhoAineistoKategorias: VelhoAineistoKategoria[]
): Promise<void> {
  const projekti = await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO);
  const t2xx = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot
        .filter((aineisto) => aineisto.kategoriaId == "T2xx")
        .forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));
  console.log(t2xx);

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
      ...projekti.nahtavillaoloVaihe,
      aineistoNahtavilla: adaptAineistoToInput(t2xx),
      lisaAineisto: adaptAineistoToInput(lisaAineisto),
    },
  });

  const nahtavillaoloVaihe = (await loadProjektiFromDatabase(oid, Status.NAHTAVILLAOLO)).nahtavillaoloVaihe;
  expectToMatchSnapshot("testImportNahtavillaoloAineistot", {
    aineistoNahtavilla: nahtavillaoloVaihe.aineistoNahtavilla,
    lisaAineisto: nahtavillaoloVaihe.lisaAineisto,
  });
}
