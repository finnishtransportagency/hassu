import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { NykyinenKayttaja, TallennaProjektiInput } from "../../../../../common/graphql/apiModel";
import { IllegalArgumentError } from "../../../../src/error/IllegalArgumentError";
import { expect } from "chai";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator (vähäinen menettely ja suunnittelusopimus)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);
  let user: NykyinenKayttaja;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const elyUser = personSearchFixture.createKayttaja(ELY_UID, "ELY");
    const vaylaUser = personSearchFixture.createKayttaja(VAYLA_UID);
    const kayttaja1 = personSearchFixture.createKayttaja("A123");
    const kayttaja2 = personSearchFixture.createKayttaja("A000111");
    const kayttaja3 = personSearchFixture.createKayttaja("A000123");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([elyUser, vaylaUser, kayttaja1, kayttaja2, kayttaja3]));
    user = UserFixture.mattiMeikalainen;
    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should prevent suunnittelusopimus from being added if projekti uses vahainenMenettely", async () => {
    const projekti = fixture.velhoprojekti1();
    projekti.vahainenMenettely = true;
    projekti.kayttoOikeudet = [
      ...projekti.kayttoOikeudet,
      { kayttajatunnus: user.uid as string, email: "", etunimi: "", sukunimi: "", organisaatio: "" },
    ];

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: {
        kunta: 1,
        logo: "123.jpg",
        yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna asettaa vähäiseen menettelyyn suunnittelusopimuksellista projektia", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { aloitusKuulutus, ...projekti } = fixture.dbProjekti1(); // Tällä on suunnittelusopimus
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna asettaa vähäiseen menettelyyn projektia jonka asettaa myös suunnittelusopimukselliseksi", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { aloitusKuulutus, suunnitteluSopimus, ...projekti } = fixture.dbProjekti1();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
      suunnitteluSopimus: {
        yhteysHenkilo: "plop",
        kunta: 1,
        logo: "jotain.png",
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna asettaa suunnittelusopimusta projektille, jossa sovelletaan vähäistä menettelyä", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { aloitusKuulutus, suunnitteluSopimus, ...projekti } = fixture.dbProjekti1();
    projekti.vahainenMenettely = true;
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: {
        yhteysHenkilo: "plop",
        kunta: 1,
        logo: "jotain.png",
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
