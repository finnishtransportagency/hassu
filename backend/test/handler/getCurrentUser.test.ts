/* tslint:disable:only-arrow-functions */
import { describe, it } from "mocha";
import * as sinon from "sinon";
import { getCurrentUser } from "../../src/handler/getCurrentUser";
import * as userService from "../../src/service/userService";
import { UserFixture } from "../fixture/userFixture";
import { Kayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("getCurrentUser", () => {
  let getVaylaUserStub: sinon.SinonStub;

  afterEach(() => {
    sinon.reset();
    sinon.restore();
  });

  before(() => {
    getVaylaUserStub = sinon.stub(userService, "getVaylaUser");
  });

  it("should parse token succesfully", async function () {
    getVaylaUserStub.returns(UserFixture.mattiMeikalainen);
    const user = await getCurrentUser();
    expect(user).to.deep.equal({
      __typename: "Kayttaja",
      etuNimi: "Matti",
      sukuNimi: "Meikalainen",
      uid: "A000111",
      vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
      roolit: ["hassu_kayttaja", "Atunnukset"],
    } as Kayttaja);
  });
});
