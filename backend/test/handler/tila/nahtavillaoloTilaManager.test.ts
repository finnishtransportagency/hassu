/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import { DBProjekti } from "../../../src/database/model";
//import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { VuorovaikutusKierrosTila } from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { S3Mock } from "../../aws/awsMock";
import { nahtavillaoloTilaManager } from "../../../src/handler/tila/nahtavillaoloTilaManager";

const { expect } = require("chai");

describe("nahtavillaoloTilaManager", () => {
  //let saveProjektiStub: sinon.SinonStub;
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);
  new S3Mock();

  before(() => {
    //saveProjektiStub = sinon.stub(projektiDatabase, "saveProjekti");
  });

  beforeEach(() => {
    projekti = new ProjektiFixture().nahtavillaoloVaihe();
    userFixture.loginAs(UserFixture.hassuAdmin);
  });

  afterEach(() => {
    sinon.reset();
    userFixture.logout();
  });

  after(() => {
    sinon.restore();
  });

  it("should reject sendForApproval if vuorovaikutusKierros is still unpublished", async function () {
    delete projekti.nahtavillaoloVaiheJulkaisut;
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MUOKATTAVISSA,
    };
    await expect(() => nahtavillaoloTilaManager.validateSendForApproval(projekti)).to.throw(
      "Toiminto ei ole sallittu, koska vuorovaikutuskierros on vielä julkaisematta."
    );
  });
});
