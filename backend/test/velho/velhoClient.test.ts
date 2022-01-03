/* tslint:disable:no-unused-expression */
import * as chai from "chai";
import { expect } from "chai";
import { describe, it } from "mocha";
import { VelhoClient } from "../../src/velho/velhoClient";
import * as sinon from "sinon";

const sandbox = require("sinon").createSandbox();
const axios = require("axios");

const sinonChai = require("sinon-chai");
chai.use(sinonChai);
describe("VelhoClient", () => {
  let stubPost: sinon.SinonStub;
  let velho: VelhoClient;

  beforeEach(() => {
    stubPost = sandbox.stub(axios, "post");
    velho = new VelhoClient();
    velho.logout();
  });
  afterEach(() => {
    sandbox.restore();
  });

  it("should make call to authenticate to Velho", async () => {
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 3600 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(stubPost).calledOnce;
  });

  it("should use existing token", async () => {
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 3600 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(stubPost).calledOnce;
  });

  it("should detect expired token and re-authenticate to Velho", async () => {
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 0 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 3600 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(stubPost).calledTwice;
  });
});
