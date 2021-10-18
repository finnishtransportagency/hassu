/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { getVaylaUser, identifyUser } from "../../src/service/userService";
import * as tokenvalidator from "../../src/util/validatejwttoken";
import { vaylaMatti } from "../fixture/users";

const { expect } = require("chai");

describe("userService", () => {
  let validateTokenStub: sinon.SinonStub;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  before(() => {
    validateTokenStub = sinon.stub(tokenvalidator, "validateJwtToken");
  });

  it("should identify user succesfully", async function () {
    validateTokenStub.returns({
      "custom:rooli": "arn:aws:iam::123:role/role1\\,arn:aws:iam::123:saml-provider/role2",
      "custom:sukunimi": "Meikalainen",
      "custom:etunimi": "Matti",
      "custom:puhelin": "12345678",
      "custom:uid": "AB0000001",
    });
    await identifyUser({ "x-iam-accesstoken": "abc.123", "x-iam-data": "" });
    const user = getVaylaUser();
    expect(user).to.deep.equal(vaylaMatti);
  });
});
