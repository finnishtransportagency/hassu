import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import { UserFixture } from "../fixture/userFixture";
import { expect } from "chai";
import { DBProjekti } from "../../src/database/model";
import { jaaProjekti } from "../../src/jaaProjekti";
import { IllegalArgumentError } from "hassu-common/error";
import { userService } from "../../src/user";
import { DBProjektiForSpecificVaiheFixture, VaiheenTila } from "../fixture/DBProjekti2ForSecificVaiheFixture";
import { Vaihe } from "hassu-common/graphql/apiModel";
import { cloneDeep } from "lodash";
import { velho as velhoClient } from "../../src/velho/velhoClient";

describe("jaaProjekti", () => {
  const userFixture = new UserFixture(userService);

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should throw error if user is not authenticted", async () => {
    await expect(jaaProjekti({ oid: "oid-123", targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      Error,
      "Väylä-kirjautuminen puuttuu"
    );
  });

  it("should throw error if user not admin", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    await expect(jaaProjekti({ oid: "oid-123", targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      Error,
      "Sinulla ei ole admin-oikeuksia"
    );
  });

  it("should throw error if VLS-projekti does not exist with oid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const oid = "oid-123";
    sinon.stub(projektiDatabase, "loadProjektiByOid").returns(Promise.resolve(undefined));
    await expect(jaaProjekti({ oid, targetOid: "toinen-oid-234" })).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      `Jaettavaa projektia ei löydy oid:lla '${oid}'`
    );
  });

  it("should throw error if VLS-projekti already exists with targetOid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const srcProjekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.LUONNOS);
    const targetProjekti: DBProjekti = { ...cloneDeep(srcProjekti), oid: "toinen-oid" };
    sinon
      .stub(projektiDatabase, "loadProjektiByOid")
      .withArgs(srcProjekti.oid)
      .returns(Promise.resolve(srcProjekti))
      .withArgs(targetProjekti.oid)
      .returns(Promise.resolve(targetProjekti));
    await expect(jaaProjekti({ oid: srcProjekti.oid, targetOid: targetProjekti.oid })).to.eventually.be.rejectedWith(
      IllegalArgumentError,
      `Kohde projekti oid:lla '${targetProjekti.oid}' on jo VLS-järjestelmässä`
    );
  });

  it("should throw error if Velho-projekti does not exist with targetOid", async () => {
    userFixture.loginAs(UserFixture.hassuAdmin);
    const srcProjekti = new DBProjektiForSpecificVaiheFixture().getProjektiForVaihe(Vaihe.NAHTAVILLAOLO, VaiheenTila.LUONNOS);
    const targetProjektiOid = "toinen-oid";
    sinon
      .stub(projektiDatabase, "loadProjektiByOid")
      .withArgs(srcProjekti.oid)
      .returns(Promise.resolve(srcProjekti))
      .withArgs(targetProjektiOid)
      .returns(Promise.resolve(undefined));
    const targetProjektiFromVelho: DBProjekti = {
      oid: targetProjektiOid,
      versio: 1,
      kayttoOikeudet: [],
    };
    sinon.stub(velhoClient, "loadProjekti").withArgs(targetProjektiOid).returns(Promise.resolve(targetProjektiFromVelho));
    await expect(jaaProjekti({ oid: srcProjekti.oid, targetOid: targetProjektiOid })).to.eventually.be.rejectedWith(
      Error,
      `Kohde projektia oid:lla '${targetProjektiOid}' ei löydy Projektivelhosta`
    );
  });
});
