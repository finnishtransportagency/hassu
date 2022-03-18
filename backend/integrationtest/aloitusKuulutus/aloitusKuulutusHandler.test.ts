import { describe, it } from "mocha";
import { setupLocalDatabase } from "../util/databaseUtil";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { ProjektiFixture } from "../../test/fixture/projektiFixture";
import { TilasiirtymaToiminto } from "../../../common/graphql/apiModel";
import { aloitusKuulutusHandler } from "../../src/handler/aloitusKuulutusHandler";
import { UserFixture } from "../../test/fixture/userFixture";
import { userService } from "../../src/user";
import { localstackS3Client } from "../util/s3Util";
import { personSearchUpdaterClient } from "../../src/personSearch/personSearchUpdaterClient";
import * as personSearchUpdaterHandler from "../../src/personSearch/lambda/personSearchUpdaterHandler";

const { expect } = require("chai");

async function takeSnapshot(oid: string) {
  const dbProjekti = await projektiDatabase.loadProjektiByOid(oid);
  expect({
    aloitusKuulutus: dbProjekti.aloitusKuulutus,
    aloitusKuulutusJulkaisut: dbProjekti.aloitusKuulutusJulkaisut,
  }).toMatchSnapshot();
}

describe("AloitusKuulutus", () => {
  let userFixture: UserFixture;
  let readUsersFromSearchUpdaterLambda: sinon.SinonStub;

  before(async () => {
    localstackS3Client();
    readUsersFromSearchUpdaterLambda = sinon.stub(personSearchUpdaterClient, "readUsersFromSearchUpdaterLambda");
    readUsersFromSearchUpdaterLambda.callsFake(async () => {
      return await personSearchUpdaterHandler.handleEvent();
    });
  });

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
    sinon.restore();
  });

  beforeEach("Initialize test database!", async () => await setupLocalDatabase());

  beforeEach(() => {
    userFixture = new UserFixture(userService);
  });

  it("should create and manipulate projekti successfully", async function () {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = new ProjektiFixture().dbProjekti1;
    const oid = projekti.oid;
    await projektiDatabase.createProjekti(projekti);
    await takeSnapshot(oid);

    await aloitusKuulutusHandler.siirraTila({ oid, toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusHandler.siirraTila({ oid, toiminto: TilasiirtymaToiminto.HYLKAA, syy: "Korjaa teksti" });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await aloitusKuulutusHandler.siirraTila({ oid, toiminto: TilasiirtymaToiminto.LAHETA_HYVAKSYTTAVAKSI });
    await takeSnapshot(oid);

    userFixture.loginAs(UserFixture.pekkaProjari);
    await aloitusKuulutusHandler.siirraTila({ oid, toiminto: TilasiirtymaToiminto.HYVAKSY });
    await takeSnapshot(oid);
  });
});
