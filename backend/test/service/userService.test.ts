/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import * as userService from "../../src/service/userService";
import * as tokenvalidator from "../../src/util/validatejwttoken";
import { UserFixture } from "../fixture/userFixture";

const { expect } = require("chai");

describe("userService", () => {
  let validateTokenStub: sinon.SinonStub;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  beforeEach(() => {
    validateTokenStub = sinon.stub(tokenvalidator, "validateJwtToken");
  });

  it("should identify user succesfully", async function () {
    validateTokenStub.returns({
      "custom:rooli": "arn:aws:iam::123:role/hassu_kayttaja\\,arn:aws:iam::123:saml-provider/Atunnukset",
      "custom:sukunimi": "Meikalainen",
      "custom:etunimi": "Matti",
      "custom:puhelin": "12345678",
      "custom:uid": "A000111",
    });
    await userService.identifyUser({
      request: { headers: { "x-iam-accesstoken": "abc.123", "x-iam-data": "" } },
    } as any);
    const user = userService.getVaylaUser();
    expect(user).to.deep.eql(UserFixture.mattiMeikalainen);
  });

  it("should parse roles succesfully", async function () {
    validateTokenStub.returns({
      "custom:rooli": "abc,def,arn:aws:iam::123:role/HassuAdmin,hassu_admin,hassu_kayttaja",
      "custom:sukunimi": "Meikalainen",
      "custom:etunimi": "Matti",
      "custom:puhelin": "12345678",
      "custom:uid": "A000111",
    });
    await userService.identifyUser({
      request: { headers: { "x-iam-accesstoken": "abc.123", "x-iam-data": "" } },
    } as any);
    const user = userService.getVaylaUser();
    expect(user.roolit).to.eql(["abc", "def", "HassuAdmin", "hassu_admin", "hassu_kayttaja"]);
  });
});
