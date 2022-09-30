// @ts-nocheck

import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase, testPublicAccessToProjekti } from "./tests";
import {
  HallintoOikeus,
  HyvaksymisPaatosVaiheTila,
  ProjektiKayttaja,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineisto,
  VelhoAineistoKategoria,
} from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";
import { api } from "../apiClient";
import { adaptAineistoToInput, expectToMatchSnapshot } from "./util";
import { apiTestFixture } from "../apiTestFixture";
import { cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps, cleanupHyvaksymisPaatosVaiheTimestamps } from "./cleanUpFunctions";
import dayjs from "dayjs";

export async function testHyvaksymisPaatosVaiheHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti.nahtavillaoloVaiheJulkaisut[0];
  // Päättymispäivä alle vuosi menneisyyteen, jottei projekti mene epäaktiiviseksi
  julkaisu.kuulutusVaihePaattyyPaiva = dayjs().add(-2, "day").format();
  await projektiDatabase.updateNahtavillaoloVaiheJulkaisu(dbProjekti, julkaisu);

  userFixture.loginAsAdmin();
  await api.tallennaProjekti({
    oid,
    kasittelynTila: {
      hyvaksymispaatos: { asianumero: "asianro123", paatoksenPvm: "2022-06-09" },
    },
  });

  userFixture.loginAs(UserFixture.mattiMeikalainen);
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
  velhoAineistoKategorias: VelhoAineistoKategoria[],
  projektiPaallikko: string
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
      kuulutusYhteystiedot: apiTestFixture.yhteystietoInputLista,
      kuulutusYhteysHenkilot: [projektiPaallikko],
      hallintoOikeus: HallintoOikeus.HAMEENLINNA,

      kuulutusPaiva: "2022-06-09",
      kuulutusVaihePaattyyPaiva: "2100-01-01",
    },
  });

  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  const hyvaksymisPaatosVaihe = projekti.hyvaksymisPaatosVaihe;
  const kasittelynTila = projekti.kasittelynTila;
  expectToMatchSnapshot("testImportHyvaksymisPaatosAineistot", {
    hyvaksymisPaatosVaihe,
    kasittelynTila,
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
    toiminto: TilasiirtymaToiminto.HYVAKSY,
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAfterApproval", {
    hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe),
    hyvaksymisPaatosVaiheJulkaisut: projekti.hyvaksymisPaatosVaiheJulkaisut.map(cleanupHyvaksymisPaatosVaiheTimestamps),
  });

  // Move hyvaksymisPaatosVaiheJulkaisu into the past
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti.hyvaksymisPaatosVaiheJulkaisut[0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-06-08";
  await projektiDatabase.updateHyvaksymisPaatosVaiheJulkaisu(dbProjekti, julkaisu);

  await testPublicAccessToProjekti(
    oid,
    Status.HYVAKSYTTY,
    userFixture,
    "HyvaksymisPaatosVaiheJulkinenAfterApproval",
    (projektiJulkinen) =>
      (projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
        projektiJulkinen.hyvaksymisPaatosVaihe
      ))
  );
}
