import { describe, it } from "mocha";
import * as sinon from "sinon";
import { projektiDatabase } from "../../src/database/projektiDatabase";
import * as ProjektiRekisteri from "../../src/velho/projektirekisteri";
import { createOrUpdateProjekti } from "../../src/projekti/projektiHandler";
import { DBProjekti } from "../../src/database/model";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { Kayttajas } from "../../src/personSearch/kayttajas";
const { expect } = require("chai");

describe("createOrUpdateProjekti", () => {
  let saveProjektiStub: sinon.SinonStub;
  let loadProjektiByOid: sinon.SinonStub;
  const userFixture = new UserFixture(userService);

  const admin = UserFixture.hassuAdmin;
  const mattiNykyinenKayttaja = UserFixture.mattiMeikalainen;
  const mattiDbVaylaUser = {
    email: "",
    kayttajatunnus: mattiNykyinenKayttaja.uid || "",
    organisaatio: "",
    etunimi: mattiNykyinenKayttaja.etunimi,
    sukunimi: mattiNykyinenKayttaja.sukunimi,
  };
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
  const projektiInDB: DBProjekti = {
    oid: "1",
    versio: 1,
    kayttoOikeudet: [mattiDbVaylaUser],
    tallennettu: true,
    lyhytOsoite: "jotain",
  };
  beforeEach(() => {
    loadProjektiByOid = sinon.stub(projektiDatabase, "loadProjektiByOid").returns(Promise.resolve(projektiInDB));
    saveProjektiStub = sinon.stub(projektiDatabase, "saveProjektiWithoutLocking");
    velhoGet = sinon.stub().returns(velhoGetResponseFake);
    velhoPut = sinon.stub().returns(velhoPutResponseFake);
    projektiApi = sinon.createStubInstance(ProjektiRekisteri.ProjektiApi, {
      projektirekisteriApiV2ProjektiProjektiOidGet: velhoGet,
      projektirekisteriApiV2ProjektiProjektiOidPut: velhoPut,
    });

    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    const x1User = personSearchFixture.createKayttaja("X1");
    const getKayttajasStub = sinon.stub(personSearch, "getKayttajas");
    getKayttajasStub.resolves(Kayttajas.fromKayttajaList([a1User, a2User, x1User]));
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it.only("should update velho when kasittelynTila changes", async () => {
    userFixture.loginAs(admin);
    await createOrUpdateProjekti({
      oid: "1",
      versio: 1,
      kasittelynTila: {
        valitustenMaara: 1,
      },
    });
    expect(loadProjektiByOid.calledOnce);
    expect(velhoGet.calledOnce);
    expect(velhoPut.calledOnce);
    expect(projektiApi.calledOnce);
    expect(saveProjektiStub.calledOnce);
  });
});
