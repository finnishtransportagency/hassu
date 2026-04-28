// Contains code generated or recommended by Amazon Q
import { expect } from "chai";
import * as sinon from "sinon";
import { parameters } from "../../src/aws/parameters";
import { config } from "../../src/config";
import { getClient, resetCachedClient } from "../../src/suomifi/suomifiHandler";
import * as soapModule from "../../src/suomifi/viranomaispalvelutwsinterface/suomifi";
import * as restModule from "../../src/suomifi/suomifiRest/suomifi";

const fakeSuomiFiConfig = {
  apikey: "key",
  endpoint: "http://localhost",
  palvelutunnus: "tunnus",
  viranomaistunnus: "vtunnus",
  laskutustunniste: "",
  laskutussalasana: "",
  yhteyshenkilo: "henkilo",
};

function createFakeClient(): restModule.SuomiFiClient {
  return {
    haeAsiakas: sinon.stub(),
    rajapinnanTila: sinon.stub(),
    lahetaInfoViesti: sinon.stub(),
    lahetaViesti: sinon.stub(),
  };
}

describe("getClient", () => {
  beforeEach(() => {
    resetCachedClient();
    sinon.stub(config, "isInTest").value(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("REST client cachetetaan", async () => {
    const fakeClient = createFakeClient();
    sinon.stub(parameters, "getSuomiFiClientType").resolves("REST");
    sinon.stub(parameters, "getSuomiFiRestConfig").resolves(fakeSuomiFiConfig);
    const restStub = sinon.stub(restModule, "getSuomiFiClient").resolves(fakeClient);

    const client1 = await getClient();
    const client2 = await getClient();

    expect(client1).to.equal(fakeClient);
    expect(client2).to.equal(fakeClient);
    expect(restStub.callCount).to.equal(1);
  });

  it("SOAP client luodaan aina uudelleen", async () => {
    sinon.stub(parameters, "getSuomiFiClientType").resolves("SOAP");
    sinon.stub(parameters, "getSuomiFiConfig").resolves(fakeSuomiFiConfig);
    sinon.stub(parameters, "getSuomiFiCertificate").resolves("cert");
    sinon.stub(parameters, "getSuomiFiPrivateKey").resolves("key");
    const soapStub = sinon.stub(soapModule, "getSuomiFiClient").resolves(createFakeClient() as soapModule.SuomiFiClient);

    await getClient();
    await getClient();

    expect(soapStub.callCount).to.equal(2);
  });

  it("resetCachedClient nollaa REST-cachen", async () => {
    sinon.stub(parameters, "getSuomiFiClientType").resolves("REST");
    sinon.stub(parameters, "getSuomiFiRestConfig").resolves(fakeSuomiFiConfig);
    const restStub = sinon.stub(restModule, "getSuomiFiClient").resolves(createFakeClient());

    await getClient();
    resetCachedClient();
    await getClient();

    expect(restStub.callCount).to.equal(2);
  });
});

describe("getClient clientType vaihto", () => {
  beforeEach(() => {
    resetCachedClient();
    sinon.stub(config, "isInTest").value(false);
  });

  afterEach(() => {
    sinon.restore();
  });

  it("REST-cache tyhjennetään kun clientType vaihtuu SOAP:iin", async () => {
    const clientTypeStub = sinon.stub(parameters, "getSuomiFiClientType");
    sinon.stub(parameters, "getSuomiFiRestConfig").resolves(fakeSuomiFiConfig);
    sinon.stub(parameters, "getSuomiFiConfig").resolves(fakeSuomiFiConfig);
    sinon.stub(parameters, "getSuomiFiCertificate").resolves("cert");
    sinon.stub(parameters, "getSuomiFiPrivateKey").resolves("key");
    const restStub = sinon.stub(restModule, "getSuomiFiClient").resolves(createFakeClient());
    const soapStub = sinon.stub(soapModule, "getSuomiFiClient").resolves(createFakeClient() as soapModule.SuomiFiClient);

    clientTypeStub.resolves("REST");
    await getClient();
    expect(restStub.callCount).to.equal(1);

    clientTypeStub.resolves("SOAP");
    await getClient();
    expect(soapStub.callCount).to.equal(1);

    // Varmistetaan ettei REST-cachea enää käytetä
    clientTypeStub.resolves("REST");
    await getClient();
    expect(restStub.callCount).to.equal(2);
  });

  it("SOAP:sta REST:iin vaihto luo uuden REST-clientin", async () => {
    const clientTypeStub = sinon.stub(parameters, "getSuomiFiClientType");
    sinon.stub(parameters, "getSuomiFiRestConfig").resolves(fakeSuomiFiConfig);
    sinon.stub(parameters, "getSuomiFiConfig").resolves(fakeSuomiFiConfig);
    sinon.stub(parameters, "getSuomiFiCertificate").resolves("cert");
    sinon.stub(parameters, "getSuomiFiPrivateKey").resolves("key");
    const restStub = sinon.stub(restModule, "getSuomiFiClient").resolves(createFakeClient());
    const soapStub = sinon.stub(soapModule, "getSuomiFiClient").resolves(createFakeClient() as soapModule.SuomiFiClient);

    clientTypeStub.resolves("SOAP");
    await getClient();
    expect(soapStub.callCount).to.equal(1);

    clientTypeStub.resolves("REST");
    await getClient();
    expect(restStub.callCount).to.equal(1);

    // REST-cache toimii vaihdon jälkeen
    await getClient();
    expect(restStub.callCount).to.equal(1);
  });
});
