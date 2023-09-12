import { asetaAika, loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase, testPublicAccessToProjekti } from "./tests";
import {
  HallintoOikeus,
  Kieli,
  KuulutusJulkaisuTila,
  Projekti,
  ProjektiJulkinen,
  ProjektiKayttaja,
  Status,
  TallennaProjektiInput,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  VelhoAineisto,
  VelhoToimeksianto,
} from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";
import { api } from "../apiClient";
import { adaptAineistoToInput, expectToMatchSnapshot, takePublicS3Snapshot, takeYllapitoS3Snapshot } from "./util";
import { apiTestFixture } from "../apiTestFixture";
import { cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps, cleanupHyvaksymisPaatosVaiheTimestamps } from "./cleanUpFunctions";
import capitalize from "lodash/capitalize";
import { ImportAineistoMock } from "./importAineistoMock";
import { dateToString, parseDate } from "../../../src/util/dateUtil";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";
import { tilaHandler } from "../../../src/handler/tila/tilaHandler";
import { assertIsDefined } from "../../../src/util/assertions";

export async function testHyvaksymismenettelyssa(oid: string, userFixture: UserFixture): Promise<void> {
  userFixture.loginAs(UserFixture.mattiMeikalainen);
  await loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT); // Verify status in yllapito

  // Verify status in public
  const publicProjekti = await loadProjektiJulkinenFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA);
  expect(publicProjekti.nahtavillaoloVaihe).not.to.be.undefined;
  expect(publicProjekti.nahtavillaoloVaihe!.aineistoNahtavilla).to.be.undefined;
  userFixture.loginAs(UserFixture.mattiMeikalainen);
}

export async function testHyvaksymisPaatosVaihe(oid: string, userFixture: UserFixture): Promise<Projekti> {
  userFixture.loginAsAdmin();
  const versio = (await api.lataaProjekti(oid)).versio;
  await api.tallennaProjekti({
    oid,
    versio,
    kasittelynTila: {
      hyvaksymispaatos: { asianumero: "asianro123", paatoksenPvm: "2022-06-09" },
    },
  });

  userFixture.loginAs(UserFixture.mattiMeikalainen);
  return loadProjektiFromDatabase(oid, Status.HYVAKSYMISMENETTELYSSA_AINEISTOT); // Verify status in yllapito
}

export async function testCreateHyvaksymisPaatosWithAineistot(
  oid: string,
  vaihe: keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">,
  velhoToimeksiannot: VelhoToimeksianto[],
  projektiPaallikko: string,
  expectedStatus: Status,
  kuulutusPaiva: string
): Promise<Projekti> {
  const lisaAineisto = velhoToimeksiannot
    .reduce((documents, toimeksianto) => {
      toimeksianto.aineistot.forEach((aineisto) => documents.push(aineisto));
      return documents;
    }, [] as VelhoAineisto[])
    .sort((a, b) => a.oid.localeCompare(b.oid));

  const aineistoWithSpecialChars = lisaAineisto.find((value) => value.tiedosto == "RaS_hyväksymispäätös,_Leksvall.pdf");
  const hyvaksymisPaatos = [lisaAineisto[0]];
  if (aineistoWithSpecialChars) {
    hyvaksymisPaatos.push(aineistoWithSpecialChars);
  }
  const vaiheContents = {
    hyvaksymisPaatos: adaptAineistoToInput(hyvaksymisPaatos),
    aineistoNahtavilla: adaptAineistoToInput([lisaAineisto[0]]).map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })),

    ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: {
      yhteysTiedot: apiTestFixture.yhteystietoInputLista,
      yhteysHenkilot: [projektiPaallikko],
    },
    hallintoOikeus: HallintoOikeus.HAMEENLINNA,

    kuulutusPaiva,
    kuulutusVaihePaattyyPaiva: dateToString(parseDate(kuulutusPaiva).add(1, "month")),
  };
  const versio = (await api.lataaProjekti(oid)).versio;
  const input: TallennaProjektiInput = {
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
  return projekti;
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
}

export async function testHyvaksymisPaatosVaiheKuulutusVaihePaattyyPaivaMenneisyydessa(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  // hyvaksymisPaatosVaiheJulkaisu kuulutusVaihePaattyyPaiva menneisyydessä
  asetaAika("2025-02-02");

  await testPublicAccessToProjekti(
    oid,
    Status.HYVAKSYTTY,
    userFixture,
    "HyvaksymisPaatosVaiheJulkinen kuulutusVaihePaattyyPaiva menneisyydessä",
    (projektiJulkinen) => {
      assertIsDefined(projektiJulkinen.hyvaksymisPaatosVaihe);
      projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheJulkaisuJulkinenTimestamps(
        projektiJulkinen.hyvaksymisPaatosVaihe
      );
      return projektiJulkinen.hyvaksymisPaatosVaihe;
    }
  );
}

export async function tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(
  oid: string,
  julkaisuFieldName: "hyvaksymisPaatosVaiheJulkaisu" | "jatkoPaatos1VaiheJulkaisu" | "jatkoPaatos2VaiheJulkaisu",
  s3YllapitoPath: string,
  publicFieldName: "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe"
) {
  const projekti = await api.lataaProjekti(oid);
  expectToMatchSnapshot(
    julkaisuFieldName + " saamenkielisellä kuulutuksella ja ilmoituksella",
    cleanupAnyProjektiData(projekti[julkaisuFieldName]?.hyvaksymisPaatosVaiheSaamePDFt || {})
  );
  await takeYllapitoS3Snapshot(oid, julkaisuFieldName + " saamenkielisellä kuulutuksella ja ilmoituksella ylläpidossa", s3YllapitoPath);
  const julkinenProjekti = await api.lataaProjektiJulkinen(oid, Kieli.SUOMI);
  expectToMatchSnapshot("Julkisen " + publicFieldName + "en saamenkieliset PDFt", {
    kuulutusPDF: cleanupAnyProjektiData(julkinenProjekti[publicFieldName]?.kuulutusPDF || {}),
    hyvaksymisPaatosVaiheSaamePDFt: cleanupAnyProjektiData(julkinenProjekti[publicFieldName]?.hyvaksymisPaatosVaiheSaamePDFt || {}),
  });
  await takePublicS3Snapshot(oid, julkaisuFieldName + " saamenkielisellä kuulutuksella ja ilmoituksella kansalaisille", s3YllapitoPath);
  return projekti;
}

export async function doTestApproveAndPublishHyvaksymisPaatos(
  tyyppi: TilasiirtymaTyyppi,
  s3YllapitoPath: string,
  publicFieldName: keyof Pick<ProjektiJulkinen, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">,
  julkaisuFieldName: keyof Pick<Projekti, "hyvaksymisPaatosVaiheJulkaisu" | "jatkoPaatos1VaiheJulkaisu" | "jatkoPaatos2VaiheJulkaisu">,
  oid: string,
  userFixture: UserFixture,
  importAineistoMock: ImportAineistoMock
): Promise<Projekti> {
  await tilaHandler.siirraTila({
    oid,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    tyyppi,
  });
  userFixture.loginAs(UserFixture.hassuATunnus1);
  await tilaHandler.siirraTila({
    oid,
    toiminto: TilasiirtymaToiminto.HYVAKSY,
    tyyppi,
  });
  await importAineistoMock.processQueue();
  return await tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(oid, julkaisuFieldName, s3YllapitoPath, publicFieldName);
}
