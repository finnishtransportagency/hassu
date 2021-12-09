/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { userService } from "../../src/user";
import * as tokenvalidator from "../../src/user/validatejwttoken";
import { UserFixture } from "../fixture/userFixture";
import { mockClient } from "aws-sdk-client-mock";
import { getUSEast1ssmClient } from "../../src/aws/clients";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { GetParameterCommandOutput } from "@aws-sdk/client-ssm/dist-types/commands/GetParameterCommand";

const { expect } = require("chai");

const sandbox = sinon.createSandbox();

describe("userService", () => {
  let validateTokenStub: sinon.SinonStub;

  afterEach(() => {
    sandbox.reset();
    sandbox.restore();
  });

  beforeEach(() => {
    validateTokenStub = sandbox.stub(tokenvalidator, "validateJwtToken");
    const ssmClient = mockClient(getUSEast1ssmClient());

    ssmClient.on(GetParameterCommand).resolves({ Parameter: { Value: "ASDF1234" } } as GetParameterCommandOutput);
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
    const user = userService.getVaylaUser();
    expect(user.roolit).to.eql(["abc", "def", "HassuAdmin", "hassu_admin", "hassu_kayttaja"]);
  });
});
