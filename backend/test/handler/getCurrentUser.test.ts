/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { getCurrentUser } from "../../src/handler/getCurrentUser";
import * as userService from "../../src/service/userService";
import { vaylaMatti } from "../fixture/users";

const { expect } = require("chai");

describe("getCurrentUser", () => {
  let getVaylaUserStub: sinon.SinonStub;
  let isVaylaUserStub: sinon.SinonStub;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  before(() => {
    getVaylaUserStub = sinon.stub(userService, "getVaylaUser");
    isVaylaUserStub = sinon.stub(userService, "isVaylaUser");
  });

  it("should parse token succesfully", async function () {
    isVaylaUserStub.returns(true);
    getVaylaUserStub.returns(vaylaMatti);
    const user = await getCurrentUser();
    expect(user).to.deep.equal({
      __typename: "Kayttaja",
      etuNimi: "Matti",
      sukuNimi: "Meikalainen",
      uid: "AB0000001",
      vaylaKayttaja: true,
      roolit: ["role1", "role2"],
    });
  });
});
