import mocha from "mocha";
import sinon from "sinon";
import { parameters } from "../../../src/aws/parameters";

export class ParametersStub {
  private stub!: sinon.SinonStub;
  asianhallintaEnabled = false;
  ashaOsoite = "https://www.fake-asha-testiasianhallinta.com";
  uspaOsoite = "https://www.fake-uspa-testiasianhallinta.com";

  constructor() {
    mocha.before(() => {
      this.stub = sinon.stub(parameters, "getParameter");
    });
    mocha.beforeEach(() => {
      this.stub.withArgs("AsianhallintaIntegrationEnabled").callsFake(() => String(this.asianhallintaEnabled));
      this.stub.withArgs("AshaBaseUrl").callsFake(() => String(this.ashaOsoite));
      this.stub.withArgs("UspaBaseUrl").callsFake(() => String(this.uspaOsoite));
    });
  }
}
