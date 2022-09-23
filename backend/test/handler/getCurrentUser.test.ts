/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { getCurrentUser } from "../../src/handler/getCurrentUser";
import { userService } from "../../src/user";
import { UserFixture } from "../fixture/userFixture";
import { NykyinenKayttaja } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("getCurrentUser", () => {
  let getVaylaUserStub: sinon.SinonStub;

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
      etuNimi: "Matti",
      sukuNimi: "Meikalainen",
      uid: "A000111",
      roolit: ["hassu_kayttaja", "Atunnukset"],
    } as NykyinenKayttaja);
  });
});
