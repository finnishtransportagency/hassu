import { describe, it } from "mocha";
import * as sinon from "sinon";
import { KuulutusJulkaisuTila, Projekti, Status, TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { fileService } from "../../src/files/fileService";
import { FixtureName, useProjektiTestFixture } from "../api/testFixtureRecorder";
import { addLogoFilesToProjekti, defaultMocks, mockSaveProjektiToVelho } from "../api/testUtil/util";
import { deleteProjekti, testPublicAccessToProjekti, testYllapitoAccessToProjekti } from "../api/testUtil/tests";
import assert from "assert";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { assertIsDefined } from "../../src/util/assertions";
import { testProjektiDatabase } from "../../src/database/testProjektiDatabase";
import { uudelleenkuulutaAloitusKuulutus } from "./uudelleenkuulutaAloitusKuulutus";

const { expect } = require("chai");

describe("AloitusKuulutuksen uudelleenkuuluttaminen", () => {
  const userFixture = new UserFixture(userService);
  let publishProjektiFileStub: sinon.SinonStub;
  let oid: string;
  const { schedulerMock, emailClientStub, importAineistoMock, awsCloudfrontInvalidationStub, pdfGeneratorStub } = defaultMocks();

  before(async () => {
    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    publishProjektiFileStub.resolves();
    mockSaveProjektiToVelho();

    oid = await useProjektiTestFixture(FixtureName.ALOITUSKUULUTUS);
    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (ignored) {
      // ignored
    }
    await addLogoFilesToProjekti(oid);
  });

  beforeEach(async () => {
    oid = await useProjektiTestFixture(FixtureName.ALOITUSKUULUTUS);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should create uudelleenkuulutus for aloituskuulutus successfully", async function () {
    userFixture.loginAs(UserFixture.hassuAdmin);

    const initialProjekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(initialProjekti?.aloitusKuulutusJulkaisut?.[0]);
    // Aloituskuulutusjulkaisu on varmasti julkinen
    const kuulutusPaiva = "2000-01-01";
    const uudelleenKuulutusPaiva = "2031-01-01";
    initialProjekti.aloitusKuulutusJulkaisut[0].kuulutusPaiva = kuulutusPaiva;
    initialProjekti.aloitusKuulutusJulkaisut[0].siirtyySuunnitteluVaiheeseen = "2222-01-01";
    await testProjektiDatabase.saveProjekti({
      oid,
      aloitusKuulutusJulkaisut: initialProjekti.aloitusKuulutusJulkaisut,
    });

    // Aktivoi uudelleenkuulutus julkaistulle aloituskuulutukselle
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.UUDELLEENKUULUTA,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await testYllapitoAccessToProjekti(oid, Status.SUUNNITTELU, " aloituskuulutus uudelleenkuulutus avattu", (projekti) => {
      const { aloitusKuulutus } = projekti;
      return { uudelleenKuulutus: aloitusKuulutus?.uudelleenKuulutus };
    });

    // Lisätään uudelleenkuulutukseen selitystekstit
    await uudelleenkuulutaAloitusKuulutus(oid, uudelleenKuulutusPaiva);
    await testYllapitoAccessToProjekti(
      oid,
      Status.SUUNNITTELU,
      " aloituskuulutus uudelleenkuulutuksen selitystekstit täytetty",
      (projekti: Projekti) => {
        const { aloitusKuulutus } = projekti;
        return { uudelleenKuulutus: aloitusKuulutus?.uudelleenKuulutus };
      }
    );

    // Hyväksytään uudelleenkuulutus
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });

    userFixture.loginAs(UserFixture.projari112);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });

    await testYllapitoAccessToProjekti(oid, Status.SUUNNITTELU, "aloituskuulutus uudelleenkuulutus hyväksytty", (projekti: Projekti) => {
      const { aloitusKuulutus, aloitusKuulutusJulkaisu } = projekti;
      return {
        aloitusKuulutusJulkaisu: { tila: aloitusKuulutusJulkaisu?.tila, uudelleenKuulutus: aloitusKuulutusJulkaisu?.uudelleenKuulutus },
        uudelleenKuulutus: aloitusKuulutus?.uudelleenKuulutus,
      };
    });

    const resultProjekti = await projektiDatabase.loadProjektiByOid(oid);
    assert(resultProjekti);
    assert(resultProjekti.aloitusKuulutusJulkaisut);
    expect(resultProjekti.aloitusKuulutusJulkaisut).to.have.length(2);

    const alkuperainenJulkaisu = resultProjekti.aloitusKuulutusJulkaisut[0];
    expect(alkuperainenJulkaisu.id).to.eq(1);
    expect(alkuperainenJulkaisu.tila).to.eq(KuulutusJulkaisuTila.HYVAKSYTTY);
    expect(alkuperainenJulkaisu.kuulutusPaiva).to.eq(kuulutusPaiva);

    const uudelleenKuulutusJulkaisu = resultProjekti.aloitusKuulutusJulkaisut[1];
    expect(uudelleenKuulutusJulkaisu.id).to.eq(2);
    expect(uudelleenKuulutusJulkaisu.tila).to.eq(KuulutusJulkaisuTila.HYVAKSYTTY);
    expect(uudelleenKuulutusJulkaisu.kuulutusPaiva).to.eq(uudelleenKuulutusPaiva);

    emailClientStub.verifyEmailsSent();
    pdfGeneratorStub.verifyAllPDFContents();
    await importAineistoMock.processQueue();

    uudelleenKuulutusJulkaisu.kuulutusPaiva = "2000-01-01"; // Simuloidaan ajan kulumista asettamalla kuulutuspäivä varmasti menneisyyteen, jotta julkaisu on julkinen
    await testProjektiDatabase.aloitusKuulutusJulkaisut.update(resultProjekti, uudelleenKuulutusJulkaisu);
    await schedulerMock.verifyAndRunSchedule();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();

    await testPublicAccessToProjekti(oid, Status.ALOITUSKUULUTUS, userFixture, " uudelleenkuulutuksen jälkeen", (julkinen) => {
      return julkinen.aloitusKuulutusJulkaisu;
    });
  });
});
