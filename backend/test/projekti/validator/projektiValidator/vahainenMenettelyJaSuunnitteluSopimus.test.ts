import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { NykyinenKayttaja, TallennaProjektiInput } from "hassu-common/graphql/apiModel";
import { IllegalArgumentError } from "hassu-common/error";
import { expect } from "chai";
import { parameters } from "../../../../src/aws/parameters";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator (vähäinen menettely ja suunnittelusopimus)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);
  let user: NykyinenKayttaja;
  let isUspaIntegrationEnabledStub: sinon.SinonStub;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const elyUser = personSearchFixture.createKayttaja(ELY_UID, "ELY");
    const vaylaUser = personSearchFixture.createKayttaja(VAYLA_UID);
    const kayttaja1 = personSearchFixture.createKayttaja("A123");
    const kayttaja2 = personSearchFixture.createKayttaja("A000111");
    const kayttaja3 = personSearchFixture.createKayttaja("A000123");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([elyUser, vaylaUser, kayttaja1, kayttaja2, kayttaja3]));
    isUspaIntegrationEnabledStub = sinon.stub(parameters, "isUspaIntegrationEnabled");
    isUspaIntegrationEnabledStub.returns(Promise.resolve(true));
    user = UserFixture.mattiMeikalainen;
    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should prevent suunnittelusopimus from being added if projekti uses vahainenMenettely", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projekti = fixture.velhoprojekti1();
    projekti.vahainenMenettely = true;
    projekti.kayttoOikeudet = [
      ...projekti.kayttoOikeudet,
      { kayttajatunnus: user.uid as string, email: "", etunimi: "", sukunimi: "", organisaatio: "" },
    ];

    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: {
        kunta: 1,
        logo: { SUOMI: "123.png", RUOTSI: "123.png" },
        yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna asettaa vähäiseen menettelyyn suunnittelusopimuksellista projektia", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { aloitusKuulutus: _a, ...projekti } = fixture.dbProjekti1(); // Tällä on suunnittelusopimus
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna asettaa vähäiseen menettelyyn projektia jonka asettaa myös suunnittelusopimukselliseksi", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { aloitusKuulutus: _a, suunnitteluSopimus: _ss, ...projekti } = fixture.dbProjekti1();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
      suunnitteluSopimus: {
        yhteysHenkilo: "plop",
        kunta: 1,
        logo: { SUOMI: "jotain.png", RUOTSI: "jotain.png" },
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna asettaa suunnittelusopimusta projektille, jossa sovelletaan vähäistä menettelyä", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { aloitusKuulutus: _a, suunnitteluSopimus: _ss, ...projekti } = fixture.dbProjekti1();
    projekti.vahainenMenettely = true;
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: {
        yhteysHenkilo: "plop",
        kunta: 1,
        logo: { SUOMI: "jotain.png", RUOTSI: "jotain.png" },
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
