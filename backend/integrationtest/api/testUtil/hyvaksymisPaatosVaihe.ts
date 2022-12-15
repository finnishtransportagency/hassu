import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase, testPublicAccessToProjekti } from "./tests";
import {
  HallintoOikeus,
  KuulutusJulkaisuTila,
  ProjektiKayttaja,
  Status,
  TallennaProjektiInput,
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
import capitalize from "lodash/capitalize";

export async function testHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti!.nahtavillaoloVaiheJulkaisut![0];
  // Päättymispäivä alle vuosi menneisyyteen, jottei projekti mene epäaktiiviseksi
  julkaisu.kuulutusVaihePaattyyPaiva = dayjs().add(-2, "day").format();
  await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(dbProjekti!, julkaisu);

  await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA); // Verify status in yllapito

  // Verify status in public
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expect(publicProjekti.nahtavillaoloVaihe).not.to.be.undefined;
  expect(publicProjekti.nahtavillaoloVaihe!.aineistoNahtavilla).to.be.undefined;
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export async function testHyvaksymisPaatosVaihe(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAsAdmin();
  await api.tallennaProjekti({
    oid,
    kasittelynTila: {
      hyvaksymispaatos: { asianumero: "asianro123", paatoksenPvm: "2022-06-09" },
    },
  });

  userFixture.loginAs(UserFixture.mattiMeikalainen);
  await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY); // Verify status in yllapito
}

export async function testCreateHyvaksymisPaatosWithAineistot(
  oid: string,
  vaihe: keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">,
  velhoAineistoKategorias: VelhoAineistoKategoria[],
  projektiPaallikko: string,
  expectedStatus: Status
): Promise<void> {
  const lisaAineisto = velhoAineistoKategorias
    .reduce((documents, aineistoKategoria) => {
      aineistoKategoria.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  let vaiheContents = {
    hyvaksymisPaatos: adaptAineistoToInput([lisaAineisto[0]]),
    aineistoNahtavilla: adaptAineistoToInput(lisaAineisto.slice(2, 3)),

    ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: {
      yhteysTiedot: apiTestFixture.yhteystietoInputLista,
      yhteysHenkilot: [projektiPaallikko],
    },
    hallintoOikeus: HallintoOikeus.HAMEENLINNA,

    kuulutusPaiva: "2022-06-09",
    kuulutusVaihePaattyyPaiva: "2100-01-01",
  };
  let input: TallennaProjektiInput = {
    oid,
  };
  input[vaihe] = vaiheContents;
  await api.tallennaProjekti(input);

  const projekti = await loadProjektiFromDatabase(oid, expectedStatus);
  const hyvaksymisPaatosVaihe = projekti[vaihe];
  const kasittelynTila = projekti.kasittelynTila;
  expectToMatchSnapshot("testImport" + capitalize(vaihe) + "Aineistot", {
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

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY);
  expect(projektiHyvaksyttavaksi.hyvaksymisPaatosVaiheJulkaisu).to.not.be.undefined;
  expect(projektiHyvaksyttavaksi.hyvaksymisPaatosVaiheJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    toiminto: TilasiirtymaToiminto.HYVAKSY,
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY);
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAfterApproval", {
    hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe!),
    hyvaksymisPaatosVaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaiheJulkaisu!),
  });

  // Move hyvaksymisPaatosVaiheJulkaisu into the past
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti!.hyvaksymisPaatosVaiheJulkaisut![0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-06-08";
  await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti!, julkaisu);

  await testPublicAccessToProjekti(
    oid,
    Status.HYVAKSYTTY,
    userFixture,
    "HyvaksymisPaatosVaiheJulkinenAfterApproval",
    (projektiJulkinen) =>
      (projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
        projektiJulkinen.hyvaksymisPaatosVaihe!
      ))
  );
}
