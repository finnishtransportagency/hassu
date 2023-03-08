import { describe, it } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { TilasiirtymaToiminto, TilasiirtymaTyyppi } from "../../../common/graphql/apiModel";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";
import { aloitusKuulutusTilaManager } from "../../src/handler/tila/aloitusKuulutusTilaManager";
import { fileService } from "../../src/files/fileService";
import { replaceFieldsByName } from "../api/testFixtureRecorder";
import { addLogoFilesToProjekti, defaultMocks, mockSaveProjektiToVelho, PDFGeneratorStub } from "../api/testUtil/util";
import { ImportAineistoMock } from "../api/testUtil/importAineistoMock";
import { ProjektiPaths } from "../../src/files/ProjektiPath";
import fs from "fs";
import { deleteProjekti } from "../api/testUtil/tests";

const { expect } = require("chai");

async function takeSnapshot(oid: string) {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  let objs = {
    aloitusKuulutus: dbProjekti?.aloitusKuulutus,
    aloitusKuulutusJulkaisut: dbProjekti?.aloitusKuulutusJulkaisut,
  };
  replaceFieldsByName(objs, "2022-11-04", "hyvaksymisPaiva");
  expect(objs).toMatchSnapshot();
}

describe("AloitusKuulutus", () => {
  let userFixture: UserFixture;
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;
  let publishProjektiFileStub: sinon.SinonStub;
  let importAineistoMock: ImportAineistoMock;
  const pdfGeneratorStub = new PDFGeneratorStub();
  const { emailClientStub, awsCloudfrontInvalidationStub } = defaultMocks();

  before(async () => {
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    publishProjektiFileStub.resolves();

    pdfGeneratorStub.init();
    importAineistoMock = new ImportAineistoMock();
    const oid = new ProjektiFixture().dbProjekti1().oid;
    try {
      await deleteProjekti(oid);
      awsCloudfrontInvalidationStub.reset();
    } catch (ignored) {
      // ignored
    }
    await addLogoFilesToProjekti(oid);
  });

  beforeEach(async () => {
    await setupLocalDatabase();
    mockSaveProjektiToVelho();
    userFixture = new UserFixture(userService);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
  });

  it("should create and manipulate projekti successfully", async function () {
    const projekti = new ProjektiFixture().dbProjekti1();
    const oid = projekti.oid;
    await fileService.createFileToProjekti({
      oid,
      fileName: "suunnittelusopimus/logo.png",
      path: new ProjektiPaths(oid),
      contentType: "image/png",
      contents: fs.readFileSync(__dirname + "/../files/logo.png"),
    });

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await projektiDatabase.createProjekti(projekti);
    await takeSnapshot(oid);

    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYLKAA,
      syy: "Korjaa teksti",
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusTilaManager.siirraTila({
      oid,
      toiminto: TilasiirtymaToiminto.HYVAKSY,
      tyyppi: TilasiirtymaTyyppi.ALOITUSKUULUTUS,
    });
    await takeSnapshot(oid);
    await importAineistoMock.processQueue();
    awsCloudfrontInvalidationStub.verifyCloudfrontWasInvalidated();
    emailClientStub.verifyEmailsSent();
  });
});
