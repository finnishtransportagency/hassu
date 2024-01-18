import { asetaAika, loadProjektiFromDatabase, loadProjektiJulkinenFromDatabase, testPublicAccessToProjekti } from "./tests";
import {
  Aineisto,
  AineistoInput,
  HallintoOikeus,
  HyvaksymisPaatosVaiheInput,
  Kieli,
  KuntaVastaanottajaInput,
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
  ViranomaisVastaanottajaInput,
  YhteystietoInput,
} from "hassu-common/graphql/apiModel";
import { UserFixture } from "../../../test/fixture/userFixture";
import { expect } from "chai";
import { api } from "../apiClient";
import {
  SchedulerMock,
  adaptAineistoToInput,
  expectToMatchSnapshot,
  removeTiedosto,
  takePublicS3Snapshot,
  takeYllapitoS3Snapshot,
} from "./util";
import { apiTestFixture } from "../apiTestFixture";
import { cleanupHyvaksymisPaatosVaiheTimestamps, cleanupNahtavillaoloTimestamps } from "../../../commonTestUtil/cleanUpFunctions";
import capitalize from "lodash/capitalize";
import { EventSqsClientMock } from "./eventSqsClientMock";
import { dateToString, parseDate } from "../../../src/util/dateUtil";
import { cleanupAnyProjektiData } from "../testFixtureRecorder";
import { tilaHandler } from "../../../src/handler/tila/tilaHandler";
import { assertIsDefined } from "../../../src/util/assertions";
import { removeTypeName } from "../../../src/projekti/adapter/adaptToDB";
import { projektiDatabase } from "../../../src/database/projektiDatabase";

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

export async function testHyvaksymisPaatosAineistoSendForApproval(
  oid: string,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture
): Promise<Projekti> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY);
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAfterSendAineistoMuokkausForApproval", {
    hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe),
    hyvaksymisPaatosVaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaiheJulkaisu),
  });
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  expect(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut?.length).to.eql(2);
  expect(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut?.[1].tila).to.eql(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);
  return projekti;
}

export async function testMuokkaaAineistojaHyvaksymisPaatosVaihe(
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

  const nykyinenAineisto: Aineisto[] = projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla as Aineisto[];
  const aineistoInput: AineistoInput[] = nykyinenAineisto
    .map((aineisto) => removeTiedosto(removeTypeName(aineisto)) as AineistoInput)
    .concat(adaptAineistoToInput(uudetAineistot, "uusi").map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })));

  await api.tallennaProjekti({
    oid: projekti.oid,
    versio: projekti.versio,
    hyvaksymisPaatosVaihe: {
      aineistoNahtavilla: aineistoInput,
    },
  });

  let dbprojekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
  expect(dbprojekti?.hyvaksymisPaatosVaihe?.aineistoMuokkaus).to.not.be.null;
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAineistomuokkaus ennen scheduleria ja sqs-jononkäsittelyä", {
    hyvaksymisPaatosVaihe: cleanupNahtavillaoloTimestamps(dbprojekti?.hyvaksymisPaatosVaihe),
  });
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.HYVAKSYTTY);

  await schedulerMock.verifyAndRunSchedule();
  await eventSqsClientMock.processQueue();
  dbprojekti = await projektiDatabase.loadProjektiByOid(projekti.oid);
  expect(dbprojekti?.hyvaksymisPaatosVaihe?.aineistoMuokkaus).to.not.be.null;
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAineistomuokkaus schedulerin ja sqs-jononkäsittelyn jälkeen", {
    hyvaksymisPaatosVaihe: cleanupNahtavillaoloTimestamps(dbprojekti?.hyvaksymisPaatosVaihe),
  });
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.HYVAKSYTTY);
  expectToMatchSnapshot(
    "testHyvaksymisPaatosVaiheAineistoMuokkausAfterImport",
    cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe)
  );
  return projekti;
}

export async function testCreateHyvaksymisPaatosWithAineistot(
  oid: string,
  vaihe: keyof Pick<TallennaProjektiInput, "hyvaksymisPaatosVaihe" | "jatkoPaatos1Vaihe" | "jatkoPaatos2Vaihe">,
  velhoToimeksiannot: VelhoToimeksianto[],
  projektiPaallikko: string,
  expectedStatus: Status,
  kuulutusPaiva: string,
  viimeinenVoimassaolovuosi?: string
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
  const vaiheContents: HyvaksymisPaatosVaiheInput = {
    hyvaksymisPaatos: adaptAineistoToInput(hyvaksymisPaatos),
    aineistoNahtavilla: adaptAineistoToInput([lisaAineisto[0]]).map((aineisto) => ({ ...aineisto, kategoriaId: "osa_a" })),

    ilmoituksenVastaanottajat: apiTestFixture.ilmoituksenVastaanottajat,
    kuulutusYhteystiedot: {
      yhteysTiedot: apiTestFixture.yhteystietoInputLista,
      yhteysHenkilot: [projektiPaallikko],
    },
    hallintoOikeus: HallintoOikeus.HAMEENLINNA,
    viimeinenVoimassaolovuosi,
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

export async function testHyvaksymisPaatosVaiheAineistoMuokkausApproval(
  oid: string,
  userFixture: UserFixture,
  eventSqsClientMock: EventSqsClientMock,
  schedulerMock: SchedulerMock
): Promise<void> {
  await api.siirraTila({
    oid,
    tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    toiminto: TilasiirtymaToiminto.HYVAKSY,
  });
  const projekti = await loadProjektiFromDatabase(oid, Status.HYVAKSYTTY);
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAfterAineistoMuokkausApproval", {
    hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe!),
    hyvaksymisPaatosVaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaiheJulkaisu!),
  });

  await eventSqsClientMock.processQueue();
  await schedulerMock.verifyAndRunSchedule();
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  expect(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut?.length).to.eql(2);
  expect(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut?.[1].tila).to.eql(KuulutusJulkaisuTila.HYVAKSYTTY);
  expect(dbProjekti?.hyvaksymisPaatosVaiheJulkaisut?.[1].aineistoMuokkaus).to.not.be.null;
  expect(dbProjekti?.hyvaksymisPaatosVaihe?.aineistoMuokkaus).to.be.null;
  await testPublicAccessToProjekti(
    oid,
    Status.HYVAKSYMISMENETTELYSSA,
    userFixture,
    "HyvaksymisPaatosVaihe aineistomuokkaus hyväksytty mutta ei julkinen, kuulutusVaihePaattyyPaiva tulevaisuudessa",
    (projektiJulkinen) =>
      (projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheTimestamps(projektiJulkinen.hyvaksymisPaatosVaihe!))
  );

  await takePublicS3Snapshot(oid, "Hyvaksymispaatos", "hyvaksymispaatos/paatos");
}

export function sendHyvaksymisPaatosForApproval(projekti: Projekti): Promise<string> {
  return api.tallennaJaSiirraTilaa(
    {
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisPaatosVaihe: {
        hyvaksymisPaatos: projekti.hyvaksymisPaatosVaihe?.hyvaksymisPaatos?.map(
          (aineisto) => removeTiedosto(removeTypeName(aineisto)) as AineistoInput
        ),
        aineistoNahtavilla: projekti.hyvaksymisPaatosVaihe?.aineistoNahtavilla?.map(
          (aineisto) => removeTiedosto(removeTypeName(aineisto)) as AineistoInput
        ),
        kuulutusYhteystiedot: {
          yhteysHenkilot: projekti.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysHenkilot,
          yhteysTiedot: projekti.hyvaksymisPaatosVaihe?.kuulutusYhteystiedot?.yhteysTiedot?.map(
            (tieto) => removeTypeName<YhteystietoInput>(tieto) as YhteystietoInput
          ),
        },
        ilmoituksenVastaanottajat: {
          kunnat: projekti.hyvaksymisPaatosVaihe?.ilmoituksenVastaanottajat?.kunnat?.map(
            (tieto) => removeTypeName<KuntaVastaanottajaInput>(tieto) as KuntaVastaanottajaInput
          ),
          viranomaiset: projekti.hyvaksymisPaatosVaihe?.ilmoituksenVastaanottajat?.viranomaiset?.map(
            (tieto) => removeTypeName<ViranomaisVastaanottajaInput>(tieto) as ViranomaisVastaanottajaInput
          ),
        },
        hallintoOikeus: projekti.hyvaksymisPaatosVaihe?.hallintoOikeus,
        kuulutusPaiva: projekti.hyvaksymisPaatosVaihe?.kuulutusPaiva,
        kuulutusVaihePaattyyPaiva: projekti.hyvaksymisPaatosVaihe?.kuulutusVaihePaattyyPaiva,
      },
    },
    {
      oid: projekti.oid,
      tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
    }
  );
}

export async function testHyvaksymisPaatosVaiheApproval(
  projekti: Projekti,
  projektiPaallikko: ProjektiKayttaja,
  userFixture: UserFixture,
  eventSqsClientMock: EventSqsClientMock,
  expectedStatusAfterApproval: Status
): Promise<void> {
  userFixture.loginAsProjektiKayttaja(projektiPaallikko);
  await sendHyvaksymisPaatosForApproval(projekti);

  const projektiHyvaksyttavaksi = await loadProjektiFromDatabase(projekti.oid, Status.HYVAKSYTTY);
  expect(projektiHyvaksyttavaksi.hyvaksymisPaatosVaiheJulkaisu).to.not.be.undefined;
  expect(projektiHyvaksyttavaksi.hyvaksymisPaatosVaiheJulkaisu?.tila).to.eq(KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA);

  await api.siirraTila({
    oid: projekti.oid,
    tyyppi: TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
    toiminto: TilasiirtymaToiminto.HYVAKSY,
  });
  projekti = await loadProjektiFromDatabase(projekti.oid, Status.HYVAKSYTTY);
  expectToMatchSnapshot("testHyvaksymisPaatosVaiheAfterApproval", {
    hyvaksymisPaatosVaihe: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaihe!),
    hyvaksymisPaatosVaiheJulkaisu: cleanupHyvaksymisPaatosVaiheTimestamps(projekti.hyvaksymisPaatosVaiheJulkaisu!),
  });

  await eventSqsClientMock.processQueue();
  await testPublicAccessToProjekti(
    projekti.oid,
    expectedStatusAfterApproval,
    userFixture,
    "HyvaksymisPaatosVaihe hyväksytty mutta ei julkinen, kuulutusVaihePaattyyPaiva tulevaisuudessa",
    (projektiJulkinen) =>
      (projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheTimestamps(projektiJulkinen.hyvaksymisPaatosVaihe!))
  );

  await takePublicS3Snapshot(projekti.oid, "Hyvaksymispaatos", "hyvaksymispaatos/paatos");
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
      projektiJulkinen.hyvaksymisPaatosVaihe = cleanupHyvaksymisPaatosVaiheTimestamps(projektiJulkinen.hyvaksymisPaatosVaihe);
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
  eventSqsClientMock: EventSqsClientMock
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
  await eventSqsClientMock.processQueue();
  return await tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(oid, julkaisuFieldName, s3YllapitoPath, publicFieldName);
}
