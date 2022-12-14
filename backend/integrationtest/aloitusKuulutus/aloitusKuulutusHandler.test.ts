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
import { emailHandler } from "../../src/handler/emailHandler";
import { replaceFieldsByName } from "../api/testFixtureRecorder";
import { CloudFrontStub, mockSaveProjektiToVelho, PDFGeneratorStub } from "../api/testUtil/util";
import { ImportAineistoMock } from "../api/testUtil/importAineistoMock";

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
  let sendEmailsByToimintoStub: sinon.SinonStub;
  let importAineistoMock: ImportAineistoMock;
  const pdfGeneratorStub = new PDFGeneratorStub();
  let awsCloudfrontInvalidationStub: CloudFrontStub;

  before(async () => {
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });

    publishProjektiFileStub = sinon.stub(fileService, "publishProjektiFile");
    publishProjektiFileStub.resolves();

    sendEmailsByToimintoStub = sinon.stub(emailHandler, "sendEmailsByToiminto");
    sendEmailsByToimintoStub.resolves();

    pdfGeneratorStub.init();
    importAineistoMock = new ImportAineistoMock();
    awsCloudfrontInvalidationStub = new CloudFrontStub();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  beforeEach(async () => {
    await setupLocalDatabase();
    mockSaveProjektiToVelho();
    userFixture = new UserFixture(userService);
  });

  it("should create and manipulate projekti successfully", async function () {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = new ProjektiFixture().dbProjekti1();
    const oid = projekti.oid;
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
  });
});
