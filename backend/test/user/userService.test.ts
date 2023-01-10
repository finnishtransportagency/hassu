import { describe, it } from "mocha";
import * as sinon from "sinon";
import { userService } from "../../src/user";
import * as tokenvalidator from "../../src/user/validatejwttoken";
import { UserFixture } from "../fixture/userFixture";
import { apiConfig } from "../../../common/abstractApi";
import { GetParameterResult } from "aws-sdk/clients/ssm";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { getUSEast1ssm } from "../../src/aws/client";
import { awsMockResolves } from "../aws/awsMock";
import { AppSyncEventArguments } from "../../src/api/common";

const { expect } = require("chai");

describe("userService", () => {
  let validateTokenStub: sinon.SinonStub;
  let getParameterStub: sinon.SinonStub;

  before(() => {
    validateTokenStub = sinon.stub(tokenvalidator, "validateJwtToken");
    getParameterStub = sinon.stub(getUSEast1ssm(), "getParameter");
  });

  beforeEach(() => {
    awsMockResolves(getParameterStub, { Parameter: { Value: "ASDF1234" } } as GetParameterResult);
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
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
    } as unknown as AppSyncResolverEvent<AppSyncEventArguments>);
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
    } as unknown as AppSyncResolverEvent<AppSyncEventArguments>);
    const user = userService.requireVaylaUser();
    expect(user.roolit).to.eql(["abc", "def", "HassuAdmin", "hassu_admin", "hassu_kayttaja"]);
  });
});
