import { describe, it } from "mocha";
import * as sinon from "sinon";
import { getCurrentUser } from "../../src/handler/getCurrentUser";
import { userService } from "../../src/user";
import { UserFixture } from "../fixture/userFixture";
import { NykyinenKayttaja } from "hassu-common/graphql/apiModel";
import { mockParameters } from "../mocks";

import { expect } from "chai";

describe("getCurrentUser", () => {
  let getVaylaUserStub: sinon.SinonStub;
  mockParameters();

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  before(() => {
    getVaylaUserStub = sinon.stub(userService, "requireVaylaUser");
  });

  it("should parse token succesfully", async function () {
    getVaylaUserStub.returns(UserFixture.mattiMeikalainen);
    const user = await getCurrentUser();
    expect(user).to.deep.equal({
      __typename: "NykyinenKayttaja",
      etunimi: "Matti",
      sukunimi: "Meikalainen",
      uid: "A000111",
      roolit: ["hassu_kayttaja", "Atunnukset"],
    } as NykyinenKayttaja);
  });
});
