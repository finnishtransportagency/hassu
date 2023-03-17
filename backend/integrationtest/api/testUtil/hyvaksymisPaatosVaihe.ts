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
  VelhoToimeksianto,
} from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";
import { api } from "../apiClient";
import { adaptAineistoToInput, expectToMatchSnapshot, takePublicS3Snapshot } from "./util";
import { apiTestFixture } from "../apiTestFixture";
import { cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps, cleanupHyvaksymisPaatosVaiheTimestamps } from "./cleanUpFunctions";
import capitalize from "lodash/capitalize";
import { parseDate } from "../../../src/util/dateUtil";
import { assertIsDefined } from "../../../src/util/assertions";
import { ImportAineistoMock } from "./importAineistoMock";

export async function testHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const promises = dbProjekti!.nahtavillaoloVaiheJulkaisut!.map(async (julkaisu) => {
    assertIsDefined(julkaisu.kuulutusVaihePaattyyPaiva);
    julkaisu.kuulutusVaihePaattyyPaiva = parseDate(julkaisu.kuulutusVaihePaattyyPaiva).subtract(20, "years").format();
    return await projektiDatabase.nahtavillaoloVaiheJulkaisut.update(dbProjekti!, julkaisu);
  });

  await Promise.all(promises);
  // Päättymispäivä alle vuosi menneisyyteen, jottei projekti mene epäaktiiviseksi

  await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT); // Verify status in yllapito

  // Verify status in public
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expect(publicProjekti.nahtavillaoloVaihe).not.to.be.undefined;
  expect(publicProjekti.nahtavillaoloVaihe!.aineistoNahtavilla).to.be.undefined;
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export async function testHyvaksymisPaatosVaihe(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAsAdmin();
  let versio = (await api.lataaProjekti(oid)).versio;
  await api.tallennaProjekti({
    oid,
    versio,
    kasittelynTila: {
      hyvaksymispaatos: { asianumero: "asianro123", paatoksenPvm: "2022-06-09" },
    },
  });

  userFixture.loginAs(UserFixture.mattiMeikalainen);
  await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT); // Verify status in yllapito
}

export async function testCreateHyvaksymisPaatosWithAineistot(
  oid: string,
  vaihe: keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">,
  velhoToimeksiannot: VelhoToimeksianto[],
  projektiPaallikko: string,
  expectedStatus: Status
): Promise<void> {
  const lisaAineisto = velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      toimeksianto.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  let aineistoWithSpecialChars = lisaAineisto.find((value) => value.tiedosto == "RaS_hyväksymispäätös,_Leksvall.pdf");
  let hyvaksymisPaatos = [lisaAineisto[0]];
  if (aineistoWithSpecialChars) {
    hyvaksymisPaatos.push(aineistoWithSpecialChars);
  }
  let vaiheContents = {
    hyvaksymisPaatos: adaptAineistoToInput(hyvaksymisPaatos),
    aineistoNahtavilla: adaptAineistoToInput([lisaAineisto[0]]).map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })),

    ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: {
      yhteysTiedot: apiTestFixture.yhteystietoInputLista,
      yhteysHenkilot: [projektiPaallikko],
    },
    hallintoOikeus: HallintoOikeus.HAMEENLINNA,

    kuulutusPaiva: "2022-06-09",
    kuulutusVaihePaattyyPaiva: "2100-01-01",
  };
  let versio = (await api.lataaProjekti(oid)).versio;
  let input: TallennaProjektiInput = {
    oid,
    versio,
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
  userFixture: UserFixture,
  importAineistoMock: ImportAineistoMock
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

  await importAineistoMock.processQueue();
  await testPublicAccessToProjekti(
    oid,
    Status.HYVAKSYTTY,
    userFixture,
    "HyvaksymisPaatosVaiheJulkinen kuulutusVaihePaattyyPaiva tulevaisuudessa",
    (projektiJulkinen) =>
      (projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
        projektiJulkinen.hyvaksymisPaatosVaihe!
      ))
  );

  await takePublicS3Snapshot(oid, "Hyvaksymispaatos", "hyvaksymispaatos/paatos");
  // Move hyvaksymisPaatosVaiheJulkaisu into the past
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  const julkaisu = dbProjekti!.hyvaksymisPaatosVaiheJulkaisut![0];
  julkaisu.kuulutusVaihePaattyyPaiva = "2022-06-10";
  await projektiDatabase.hyvaksymisPaatosVaiheJulkaisut.update(dbProjekti!, julkaisu);

  await testPublicAccessToProjekti(
    oid,
    Status.HYVAKSYTTY,
    userFixture,
    "HyvaksymisPaatosVaiheJulkinen kuulutusVaihePaattyyPaiva menneisyydessä",
    (projektiJulkinen) => {
      projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
        projektiJulkinen.hyvaksymisPaatosVaihe!
      );
      return projektiJulkinen.hyvaksymisPaatosVaihe;
    }
  );
}
