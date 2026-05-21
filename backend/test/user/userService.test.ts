// Contains code generated or recommended by Amazon Q
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
import * as lambdaModule from "../../src/aws/lambda";
import { parameters } from "../../src/aws/parameters";

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
  it("should parse entraid roles succesfully", async function () {
    validateTokenStub.returns({
      "custom:rooli": '["hassu_admin","hassu_kayttaja","arn:aws:iam::123:role/HassuAdmin"]',
      "custom:sukunimi": "Meikalainen",
      "custom:etunimi": "Matti",
      "custom:puhelin": "12345678",
      "custom:uid": "A000111",
    });
    await userService.identifyUser({
      request: { headers: { "x-iam-accesstoken": "abc.123", "x-iam-data": "" } },
    } as unknown as AppSyncResolverEvent<unknown>);
    const user = userService.requireVaylaUser();
    expect(user.roolit).to.eql(["hassu_admin", "hassu_kayttaja", "HassuAdmin"]);
  });

  describe("Suomi.fi user identification", () => {
    let suomifiEnabledStub: sinon.SinonStub;
    let suomifiViestitEnabledStub: sinon.SinonStub;
    let invokeLambdaStub: sinon.SinonStub;

    before(() => {
      suomifiEnabledStub = sinon.stub(parameters, "isSuomiFiIntegrationEnabled");
      suomifiViestitEnabledStub = sinon.stub(parameters, "isSuomiFiViestitIntegrationEnabled");
      invokeLambdaStub = sinon.stub(lambdaModule, "invokeLambda");
    });

    beforeEach(() => {
      validateTokenStub.returns(undefined);
      suomifiEnabledStub.resolves(true);
      suomifiViestitEnabledStub.resolves(false);
      invokeLambdaStub.resolves("");
    });

    after(() => {
      suomifiEnabledStub.restore();
      suomifiViestitEnabledStub.restore();
      invokeLambdaStub.restore();
    });

    it("should return user with kayttajaSuomifiViestitEnabled false when invokeLambda fails", async () => {
      suomifiViestitEnabledStub.resolves(true);
      invokeLambdaStub.rejects(new Error("Lambda timeout"));

      // Simulate an identified Suomi.fi user by setting it directly
      (globalThis as any).currentSuomifiUser = {
        sub: "test-sub",
        email: "test@example.com",
        email_verified: "true",
        given_name: "Testi",
        family_name: "Kayttaja",
        username: "testikayttaja",
        "custom:hetu": "010101-123A",
        "custom:lahiosoite": "Testikatu 1",
        "custom:postinumero": "00100",
        "custom:postitoimipaikka": "Helsinki",
        "custom:ulkomainenkunta": "",
        "custom:ulkomainenlahiosoite": "",
        "custom:maakoodi": "FI",
      };

      const kayttaja = await userService.getSuomiFiKayttaja();
      expect(kayttaja).to.not.be.undefined;
      expect(kayttaja?.tunnistautunut).to.equal(true);
      expect(kayttaja?.kayttajaSuomifiViestitEnabled).to.equal(false);
      expect(kayttaja?.etunimi).to.equal("Testi");
    });

    it("should return tunnistautunut false when no Suomi.fi user is identified", async () => {
      (globalThis as any).currentSuomifiUser = undefined;

      const kayttaja = await userService.getSuomiFiKayttaja();
      expect(kayttaja).to.not.be.undefined;
      expect(kayttaja?.tunnistautunut).to.equal(false);
      expect(kayttaja?.suomifiEnabled).to.equal(true);
    });

    it("should return tunnistautunut false when Suomi.fi integration is disabled", async () => {
      suomifiEnabledStub.resolves(false);
      (globalThis as any).currentSuomifiUser = undefined;

      const kayttaja = await userService.getSuomiFiKayttaja();
      expect(kayttaja).to.not.be.undefined;
      expect(kayttaja?.tunnistautunut).to.equal(false);
      expect(kayttaja?.suomifiEnabled).to.equal(false);
    });
  });
});
