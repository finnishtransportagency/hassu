/* tslint:disable:only-arrow-functions */

import sinon from "sinon";
import { ProjektiFixture } from "../../fixture/projektiFixture";
//import { projektiDatabase } from "../../../src/database/projektiDatabase";
import { KuulutusJulkaisuTila } from "../../../../common/graphql/apiModel";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { nahtavillaoloTilaManager } from "../../../src/handler/tila/nahtavillaoloTilaManager";
import MockDate from "mockdate";
import { DBProjekti, NahtavillaoloVaiheJulkaisu } from "../../../src/database/model";
import { projektiDatabase } from "../../../src/database/projektiDatabase";

const { expect } = require("chai");

describe("nahtavillaoloTilaManager", () => {
  let projekti: DBProjekti;
  const userFixture = new UserFixture(userService);

  afterEach(() => {
    userFixture.logout();
    sinon.reset();
  });

  after(() => {
    sinon.restore();
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

  it("should set old julkaisu tila to PERUUTETTU when making uudelleenkuuluta, if old julkaisu's kuulutusPaiva has not passed", async function () {
    MockDate.set("2020-01-01");
    const nahtavillaoloJulkaisuUpdateStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "update");
    sinon.stub(projektiDatabase, "saveProjekti");
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    expect(nahtavillaoloJulkaisuUpdateStub.getCall(0).args[1]).to.eql({
      ...(projekti.nahtavillaoloVaiheJulkaisut as NahtavillaoloVaiheJulkaisu[])[0],
      tila: KuulutusJulkaisuTila.PERUUTETTU,
    });
  });

  it("should not set old julkaisu tila to PERUUTETTU when making uudelleenkuuluta, if old julkaisu's kuulutusPaiva has passed", async function () {
    MockDate.set("2023-01-01");
    const nahtavillaoloJulkaisuUpdateStub = sinon.stub(projektiDatabase.nahtavillaoloVaiheJulkaisut, "update");
    sinon.stub(projektiDatabase, "saveProjekti");
    await nahtavillaoloTilaManager.uudelleenkuuluta(projekti);
    expect(nahtavillaoloJulkaisuUpdateStub.callCount).to.eql(0);
  });
});
