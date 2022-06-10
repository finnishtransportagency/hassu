import { describe, it } from "mocha";
import * as sinon from "sinon";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import AWSMock from "aws-sdk-mock";
import AWS from "aws-sdk";
import { api } from "../../integrationtest/api/apiClient";
import { TallennaProjektiInput } from "../../../common/graphql/apiModel";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";

const { expect } = require("chai");

describe("tallennaProjekti endpoint", () => {
  let userFixture: UserFixture;
  let awsStub: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let personSearchFixture: PersonSearchFixture;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
    userFixture.logout();
    AWSMock.restore();
  });

  beforeEach(() => {
    personSearchFixture = new PersonSearchFixture();
    userFixture = new UserFixture(userService);
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    getKayttajasStub.resolves(
      Kayttajas.fromKayttajaList([
        personSearchFixture.pekkaProjari,
        personSearchFixture.mattiMeikalainen,
        personSearchFixture.manuMuokkaaja,
        personSearchFixture.createKayttaja("A2"),
      ])
    );
    userFixture.loginAs(UserFixture.mattiMeikalainen);
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
    const response = await api.tallennaProjekti(projektiInput);
    expect(response);
  });
});
