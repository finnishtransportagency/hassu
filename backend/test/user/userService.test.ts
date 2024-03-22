import { describe, it } from "mocha";
import * as sinon from "sinon";
import { userService } from "../../src/user";
import * as tokenvalidator from "../../src/user/validatejwttoken";
import { UserFixture } from "../fixture/userFixture";
import { apiConfig } from "hassu-common/abstractApi";
import { GetParameterCommand, SSM } from "@aws-sdk/client-ssm";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { defaultUnitTestMocks } from "../mocks";
import { mockClient } from "aws-sdk-client-mock";

import { expect } from "chai";

describe("userService", () => {
  let validateTokenStub: sinon.SinonStub;

  defaultUnitTestMocks();

  const ssmStub = mockClient(SSM);

  before(() => {
    validateTokenStub = sinon.stub(tokenvalidator, "validateJwtToken");
  });

  beforeEach(() => {
    ssmStub.on(GetParameterCommand).resolves({ Parameter: { Value: "ASDF1234" } });
  });

  afterEach(() => {
    sinon.reset();
  });

  after(() => {
    sinon.restore();
    ssmStub.restore();
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
    } as unknown as AppSyncResolverEvent<unknown>);
    const user = userService.requireVaylaUser();
    expect(user).to.deep.include(UserFixture.mattiMeikalainen);
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
    } as unknown as AppSyncResolverEvent<unknown>);
    const user = userService.requireVaylaUser();
    expect(user.roolit).to.eql(["abc", "def", "HassuAdmin", "hassu_admin", "hassu_kayttaja"]);
  });
});
