import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase } from "./tests";
import {
  HallintoOikeus,
  HyvaksymisPaatosVaiheTila,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineisto,
  VelhoAineistoKategoria
} from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";
import { api } from "../apiClient";
import { adaptAineistoToInput, expectToMatchSnapshot } from "./util";
import { apiTestFixture } from "../apiTestFixture";
import { cleanupHyvaksymisPaatosVaiheTimestamps } from "./cleanUpFunctions";

export async function testHyvaksymisPaatosVaiheHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
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
  velhoAineistoKategorias: VelhoAineistoKategoria[], projektiPaallikko: string
): Promise<void> {
  const lisaAineisto = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  await api.tallennaProjekti({
    oid,
    hyvaksymisPaatosVaihe: {
      hyvaksymisPaatos: adaptAineistoToInput([lisaAineisto[0]]),
      aineistoNahtavilla: adaptAineistoToInput(lisaAineisto.slice(2, 3)),

      ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
      kuulutusYhteystiedot: apiTestFixture.esitettavatYhteystiedotInput,
      kuulutusYhteysHenkilot: [projektiPaallikko],
      hallintoOikeus: HallintoOikeus.HAMEENLINNA
    },
  });

  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
  expectToMatchSnapshot("testImportHyvaksymisPaatosAineistot", {
    hyvaksymisPaatosVaihe,
  });
}

export async function testHyvaksymisPaatosVaiheApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expect(projektiHyvaksyttavaksi.hyvaksymisPaatosVaiheJulkaisut).to.have.length(1);
  expect(projektiHyvaksyttavaksi.hyvaksymisPaatosVaiheJulkaisut[0].tila).to.eq(HyvaksymisPaatosVaiheTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    toiminto: TilasiirtymaToiminto.HYVAKSY
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAfterApproval", {
    hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe),
    hyvaksymisPaatosVaiheJulkaisut: projekti.hyvaksymisPaatosVaiheJulkaisut.map(cleanupHyvaksymisPaatosVaiheTimestamps),
  });

  // TODO
  // await testPublicAccessToProjekti(
  //   oid,
  //   Status.HYVAKSYMISMENETTELYSSA,
  //   userFixture,
  //   "HyvaksymisPaatosVaiheJulkinenAfterApproval",
  //   (projektiJulkinen) =>
  //     (projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
  //       projektiJulkinen.hyvaksymisPaatosVaihe
  //     ))
  // );
}
