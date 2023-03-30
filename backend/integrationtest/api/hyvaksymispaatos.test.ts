import { describe, it } from "mocha";
import * as sinon from "sinon";
import { Kieli, Projekti, ProjektiJulkinen, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { cleanupAnyProjektiData } from "./testFixtureRecorder";
import {
  defaultMocks,
  expectToMatchSnapshot,
  mockSaveProjektiToVelho,
  takePublicS3Snapshot,
  takeYllapitoS3Snapshot,
} from "./testUtil/util";
import { findProjektiPaallikko, tallennaEULogo } from "./testUtil/tests";
import { assertIsDefined } from "../../src/util/assertions";
import { api } from "./apiClient";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import { createSaameProjektiToVaihe } from "./testUtil/saameUtil";
import { tilaHandler } from "../../src/handler/tila/tilaHandler";
import { ImportAineistoMock } from "./testUtil/importAineistoMock";
import { testUudelleenkuulutus, UudelleelleenkuulutettavaVaihe } from "./testUtil/uudelleenkuulutus";

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

describe("Hyväksymispäätös", () => {
  const userFixture = new UserFixture(userService);
  const { importAineistoMock } = defaultMocks();

  before(async () => {
    mockSaveProjektiToVelho();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("suorita hyväksymispäätösvaihe saamen kielellä onnistuneesti", async function () {
    const dbProjekti = await createSaameProjektiToVaihe(Status.HYVAKSYMISMENETTELYSSA);
    const { oid } = dbProjekti;

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let p = await api.lataaProjekti(oid);
    const hyvaksymisPaatosVaihe = p.hyvaksymisPaatosVaihe;
    assertIsDefined(hyvaksymisPaatosVaihe);

    // Lataa kuulutus- ja ilmoitustiedostot palveluun. Käytetään olemassa olevaa testitiedostoa, vaikkei se pdf olekaan
    const uploadedIlmoitus = await tallennaEULogo("saameilmoitus.pdf");
    const uploadedKuulutus = await tallennaEULogo("saamekuulutus.pdf");
    await api.tallennaProjekti({
      oid,
      versio: p.versio,
      hyvaksymisPaatosVaihe: {
        ...hyvaksymisPaatosVaihe,
        hyvaksymisPaatos: [{ kategoriaId: "FOO", nimi: "foo.pdf", dokumenttiOid: "1.2.246.578.5.100.2147637429.4251089044" }],
        hyvaksymisPaatosVaiheSaamePDFt: {
          POHJOISSAAME: { kuulutusPDFPath: uploadedKuulutus, kuulutusIlmoitusPDFPath: uploadedIlmoitus },
        },
      },
    });
    p = await api.lataaProjekti(oid);
    expectToMatchSnapshot(
      "Hyväksymispäätösvaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      cleanupAnyProjektiData(p.hyvaksymisPaatosVaihe?.hyvaksymisPaatosVaiheSaamePDFt || {})
    );
    await takeYllapitoS3Snapshot(
      oid,
      "Hyväksymispäätösvaihe saamenkielisellä kuulutuksella ja ilmoituksella",
      ProjektiPaths.PATH_HYVAKSYMISPAATOS
    );
    await importAineistoMock.processQueue();

    //
    // Hyväksyntä
    //
    await doTestApproveAndPublishHyvaksymisPaatos(
      TilasiirtymaTyyppi.HYVAKSYMISPAATOSVAIHE,
      ProjektiPaths.PATH_HYVAKSYMISPAATOS,
      "hyvaksymisPaatosVaihe",
      "hyvaksymisPaatosVaiheJulkaisu",
      oid,
      userFixture,
      importAineistoMock
    );

    //
    // Uudelleenkuulutus
    //
    const projektiPaallikko = findProjektiPaallikko(p);
    assertIsDefined(projektiPaallikko);
    await testUudelleenkuulutus(
      oid,
      UudelleelleenkuulutettavaVaihe.HYVAKSYMISPAATOSVAIHE,
      projektiPaallikko,
      UserFixture.mattiMeikalainen,
      userFixture
    );
    await importAineistoMock.processQueue();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await tarkistaHyvaksymispaatoksenTilaTietokannassaJaS3ssa(
      oid,
      "hyvaksymisPaatosVaiheJulkaisu",
      ProjektiPaths.PATH_HYVAKSYMISPAATOS,
      "hyvaksymisPaatosVaihe"
    );
  });
});
