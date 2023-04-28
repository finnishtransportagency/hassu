import { describe, it } from "mocha";
//import { ProjektiFixture } from "../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { Kayttaja } from "../../../common/graphql/apiModel";
//import { projektiDatabase } from "../../src/database/projektiDatabase";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import * as ProjektiRekisteri from "../../src/velho/projektirekisteri";
import { velho } from "../../src/velho/velhoClient";
const { expect } = require("chai");

describe("createOrUpdateProjekti", () => {
  //let fixture: ProjektiFixture;
  //let saveProjektiStub: sinon.SinonStub;
  //let loadVelhoProjektiByOidStub: sinon.SinonStub;
  const userFixture = new UserFixture(userService);
  //let loadProjektiByOid: sinon.SinonStub;
  let getKayttajasStub: sinon.SinonStub;
  let a1User: Kayttaja;
  let a2User: Kayttaja;
  let x1User: Kayttaja;
  let projektiApi: any;
  let velhoGet: any;
  let velhoPut: any;
  const velhoGetResponseFake = {
    status: 200,
    data: {},
  };
  const velhoPutResponseFake = {
    status: 200,
    data: {},
  };
  beforeEach(() => {
    //loadProjektiByOid = sinon.stub(projektiDatabase, "loadProjektiByOid");
    const personSearchFixture = new PersonSearchFixture();
    a1User = personSearchFixture.createKayttaja("A1");
    a2User = personSearchFixture.createKayttaja("A2");
    x1User = personSearchFixture.createKayttaja("X1");
    getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    getKayttajasStub.resolves(Kayttajas.fromKayttajaList([a1User, a2User, x1User]));
    //saveProjektiStub = sinon.stub(projektiDatabase, "saveProjektiWithoutLocking");
    velhoGet = sinon.stub().returns(velhoGetResponseFake);
    velhoPut = sinon.stub().returns(velhoPutResponseFake);
    projektiApi = sinon.createStubInstance(ProjektiRekisteri.ProjektiApi, {
      projektirekisteriApiV2ProjektiProjektiOidGet: velhoGet,
      projektirekisteriApiV2ProjektiProjektiOidPut: velhoPut,
    });
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it.only("should update velho when kasittelynTila changes", async () => {
    velho.saveProjekti("1", { valitustenMaara: 1 });
    expect(velhoGet.calledOnce);
    expect(velhoPut.calledOnce);
    expect(projektiApi.calledOnce);
  });
});
