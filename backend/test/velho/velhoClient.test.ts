import { describe, it } from "mocha";
import { VelhoClient } from "../../src/velho/velhoClient";
import sinon from "sinon";
import { AxiosError } from "axios";
import { VelhoUnavailableError } from "../../src/error/velhoUnavailableError";
import { VelhoError } from "../../src/error/velhoError";

const axios = require("axios");
const chai = require("chai");

const sinonChai = require("sinon-chai");
chai.use(sinonChai);

const expect = chai.expect;

describe("VelhoClient", () => {
  let stubPost: sinon.SinonStub;
  let velho: VelhoClient;

  beforeEach(() => {
    stubPost = sinon.stub(axios, "post");
    velho = new VelhoClient();
    velho.logout();
  });
  afterEach(() => {
    sinon.restore();
  });

  it("should make call to authenticate to Velho", async () => {
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 3600 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(stubPost.calledOnce).to.be.true;
  });

  it("should use existing token", async () => {
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 3600 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(stubPost.calledOnce).to.be.true;
  });

  it("should detect expired token and re-authenticate to Velho", async () => {
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 0 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    stubPost.resolves({ data: { access_token: "ABC123", expires_in: 3600 } });
    expect(await velho.authenticate()).to.be.equal("ABC123");
    expect(stubPost.calledTwice);
  });

  it("should manage errors while listing projects from Velho", async function () {
    stubPost.throws({ response: { status: 502 } } as AxiosError);
    await expect(velho.searchProjects("")).to.eventually.be.rejectedWith(VelhoUnavailableError);
    stubPost.throws({ response: { status: 400 } } as AxiosError);
    await expect(velho.searchProjects("")).to.eventually.be.rejectedWith(VelhoError);
  });
});
