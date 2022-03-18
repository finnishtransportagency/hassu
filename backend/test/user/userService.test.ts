/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { userService } from "../../src/user";
import * as tokenvalidator from "../../src/user/validatejwttoken";
import { UserFixture } from "../fixture/userFixture";
import { apiConfig } from "../../../common/abstractApi";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";
import { GetParameterResult } from "aws-sdk/clients/ssm";

const { expect } = require("chai");

const sandbox = sinon.createSandbox();

describe("userService", () => {
  let validateTokenStub: sinon.SinonStub;

  afterEach(() => {
    sandbox.reset();
    sandbox.restore();
    AWSMock.restore();
  });

  beforeEach(() => {
    validateTokenStub = sandbox.stub(tokenvalidator, "validateJwtToken");
    AWSMock.setSDKInstance(AWS);
    const getParameterStub = sinon.stub();
    AWSMock.mock("SSM", "getParameter", getParameterStub);
    getParameterStub.resolves({ Parameter: { Value: "ASDF1234" } } as GetParameterResult);
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
      info: { fieldName: apiConfig.nykyinenKayttaja.name },
      request: { headers: { "x-iam-accesstoken": "abc.123", "x-iam-data": "" } },
    } as any);
    const user = userService.requireVaylaUser();
    expect(user).to.deep.include(UserFixture.mattiMeikalainen);
    expect(user.keksit).to.have.length(3);
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
    const user = userService.requireVaylaUser();
    expect(user.roolit).to.eql(["abc", "def", "HassuAdmin", "hassu_admin", "hassu_kayttaja"]);
  });
});
