import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./tests";
import { Status, VelhoAineisto, VelhoAineistoKategoria } from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";
import { api } from "../apiClient";
import { adaptAineistoToInput, expectToMatchSnapshot } from "./util";

export async function testHyvaksyntaVaiheHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti.nahtavillaoloVaiheJulkaisut[0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-06-08";
  await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(dbProjekti, julkaisu);

  await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA); // Verify status in yllapito

  // Verify status in public
  userFixture.logout();
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expect(publicProjekti.nahtavillaoloVaihe).not.to.be.undefined;
  expect(publicProjekti.nahtavillaoloVaihe.aineistoNahtavilla).to.be.undefined;
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export async function testImportHyvaksymisPaatosAineistot(
  oid: string,
  velhoAineistoKategorias: VelhoAineistoKategoria[]
): Promise<void> {
  const lisaAineisto = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  await api.tallennaProjekti({
    oid,
    hyvaksymisVaihe: {
      hyvaksymisPaatos: adaptAineistoToInput([lisaAineisto[0]]),
      aineistoNahtavilla: adaptAineistoToInput(lisaAineisto.slice(2, 3))
    },
  });

  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  const hyvaksymisVaihe = projekti.hyvaksymisVaihe;
  expectToMatchSnapshot("testImportHyvaksymisPaatosAineistot", {
    hyvaksymisVaihe,
  });
}
