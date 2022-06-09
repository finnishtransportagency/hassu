import { describe, it } from "mocha";
import * as sinon from "sinon";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";
import { api } from "../../integrationtest/api/apiClient";
import { TallennaProjektiInput } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("tallennaProjekti endpoint", () => {
  let userFixture: UserFixture;
  let awsStub: sinon.SinonStub;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
    AWSMock.restore();
  });

  beforeEach(() => {
    userFixture = new UserFixture(userService);
    AWSMock.setSDKInstance(AWS);
    awsStub = sinon.stub();
    awsStub.resolves({});
    AWSMock.mock("S3", "putObject", awsStub);
    AWSMock.mock("S3", "copyObject", awsStub);
    AWSMock.mock("S3", "getObject", awsStub);
  });

  it("will not fail with proper input", async () => {
    const projektiInput: TallennaProjektiInput = {
      oid: "fake-oid",
      muistiinpano: null,
      euRahoitus: true,
      liittyvatSuunnitelmat: null,
    };
    const response = api.tallennaProjekti(projektiInput);
    console.log(response);
    expect(response).not.be(false);
  });
});
