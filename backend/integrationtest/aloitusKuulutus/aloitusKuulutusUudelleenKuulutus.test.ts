import { describe, it } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as sinon from "sinon";
import {
  KuulutusJulkaisuTila,
  Projekti,
  Status,
  TilasiirtymaToiminto,
  TilasiirtymaTyyppi,
  UudelleenKuulutusInput,
} from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { fileService } from "../../src/files/fileService";
import { FixtureName, useProjektiTestFixture } from "../api/testFixtureRecorder";
import { CloudFrontStub, EmailClientStub, PDFGeneratorStub, SchedulerMock } from "../api/testUtil/util";
import { testPublicAccessToProjekti, testYllapitoAccessToProjekti } from "../api/testUtil/tests";
import { api } from "../api/apiClient";
import assert from "assert";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { assertIsDefined } from "../../src/util/assertions";
import { testProjektiDatabase } from "../../src/database/testProjektiDatabase";
import { ImportAineistoMock } from "../api/testUtil/importAineistoMock";
import fs from "fs";
import { ProjektiPaths } from "../../src/files/ProjektiPath";

const { expect } = require("chai");

describe("AloitusKuulutuksen uudelleenkuuluttaminen", () => {
  let userFixture: UserFixture;
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let publishProjektiFileStub: sinon.SinonStub;
  let oid: string;
  const emailClientStub = new EmailClientStub();
  const pdfGeneratorStub = new PDFGeneratorStub();
  let importAineistoMock: ImportAineistoMock;
  let schedulerMock: SchedulerMock;
  let awsCloudfrontInvalidationStub: CloudFrontStub;

  before(async () => {
    schedulerMock = new SchedulerMock();
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    publishProjektiFileStub.resolves();

    pdfGeneratorStub.init();
    emailClientStub.init();
    importAineistoMock = new ImportAineistoMock();
    awsCloudfrontInvalidationStub = new CloudFrontStub();
  });

  beforeEach(async () => {
    await setupLocalDatabase();
    userFixture = new UserFixture(userService);
    oid = await useProjektiTestFixture(FixtureName.ALOITUSKUULUTUS);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
    sinon.restore();
  });

  it("should create uudelleenkuulutus for aloituskuulutus successfully", async function () {
    await fileService.createFileToProjekti({
      oid,
      fileName: "suunnittelusopimus/logo.png",
      path: new ProjektiPaths(oid),
      contentType: "image/png",
      contents: fs.readFileSync(__dirname + "/../files/logo.png"),
    });

    userFixture.loginAs(UserFixture.hassuAdmin);

    const initialProjekti = await projektiDatabase.loadProjektiByOid(oid);
    assertIsDefined(initialProjekti?.aloitusKuulutusJulkaisut?.[0]);
    // Aloituskuulutusjulkaisu on varmasti julkinen
    let kuulutusPaiva = "2000-01-01";
    let uudelleenKuulutusPaiva = "2031-01-01";
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
    const projekti = await testYllapitoAccessToProjekti(oid, Status.SUUNNITTELU, "aloituskuulutus uudelleenkuulutus avattu", (projekti) => {
      const { aloitusKuulutus } = projekti;
      return { uudelleenKuulutus: aloitusKuulutus?.uudelleenKuulutus };
    });

    // Lisätään uudelleenkuulutukseen selitystekstit
    assert(projekti.aloitusKuulutus?.uudelleenKuulutus);
    const uudelleenKuulutusInput: UudelleenKuulutusInput = {
      selosteKuulutukselle: {
        SUOMI: "Suomiseloste uudelleenkuulutukselle",
        RUOTSI: "Ruotsiseloste uudelleenkuulutukselle",
      },
      selosteLahetekirjeeseen: {
        SUOMI: "Suomiseloste uudelleenkuulutuksen lähetekirjeeseen",
        RUOTSI: "Ruotsiseloste uudelleenkuulutuksen lähetekirjeeseen",
      },
    };
    const { muokkausTila: _, ...rest } = projekti.aloitusKuulutus;
    await api.tallennaProjekti({
      oid,
      versio: projekti.versio,
      aloitusKuulutus: { ...rest, kuulutusPaiva: uudelleenKuulutusPaiva, uudelleenKuulutus: uudelleenKuulutusInput },
    });
    await testYllapitoAccessToProjekti(
      oid,
      Status.SUUNNITTELU,
      "aloituskuulutus uudelleenkuulutuksen selitystekstit täytetty",
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

    let alkuperainenJulkaisu = resultProjekti.aloitusKuulutusJulkaisut[0];
    expect(alkuperainenJulkaisu.id).to.eq(1);
    expect(alkuperainenJulkaisu.tila).to.eq(KuulutusJulkaisuTila.HYVAKSYTTY);
    expect(alkuperainenJulkaisu.kuulutusPaiva).to.eq(kuulutusPaiva);

    let uudelleenKuulutusJulkaisu = resultProjekti.aloitusKuulutusJulkaisut[1];
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
