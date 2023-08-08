import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../src/projekti/validator/projektiValidator";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { KuulutusJulkaisuTila, NykyinenKayttaja, ProjektiTyyppi } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("validateTallennaProjekti (suunnittelusopimus)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);
  let user: NykyinenKayttaja;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

    fixture = new ProjektiFixture();
    user = UserFixture.mattiMeikalainen;
    userFixture.loginAs(UserFixture.mattiMeikalainen);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should prevent suunnittelusopimus from being added if projekti tyyppi is RATA", async () => {
    const projekti = fixture.velhoprojekti1();
    projekti.velho = { ...projekti.velho, nimi: projekti.velho?.nimi as string, tyyppi: ProjektiTyyppi.RATA };
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

  it("should prevent suunnittelusopimus from being added if projekti tyyppi is YLEINEN", async () => {
    const projekti = fixture.velhoprojekti1();
    projekti.velho = { ...projekti.velho, nimi: projekti.velho?.nimi as string, tyyppi: ProjektiTyyppi.YLEINEN };
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

  it("should prevent suunnittelusopimus from being removed if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.suunnitteluSopimus = {
      kunta: 1,
      logo: "123.jpg",
      yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
    };

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      suunnitteluSopimus: null,
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent suunnittelusopimus from being removed if latest aloituskuulutusjulkaisu is waiting for approval", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.suunnitteluSopimus = {
      kunta: 1,
      logo: "123.jpg",
      yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
    };
    projekti.aloitusKuulutusJulkaisut?.push({
      ...projekti.aloitusKuulutusJulkaisut[projekti.aloitusKuulutusJulkaisut.length - 1],
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    await expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: null,
      })
    ).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent suunnittelusopimus from being added if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    await expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      })
    ).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow suunnittelusopimus being added if aloituskuulutus is not published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    delete projekti.aloitusKuulutusJulkaisut;
    let allOk = true;
    try {
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      });
    } catch (e) {
      allOk = false;
    }
    expect(allOk).to.eql(true);
  });

  it("should precent suunnittelusopimus from being added if latest aloituskuulutusjulkaisu is waiting for approval", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    projekti.aloitusKuulutusJulkaisut?.push({
      ...projekti.aloitusKuulutusJulkaisut[projekti.aloitusKuulutusJulkaisut.length - 1],
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    // Validate that there is an error if trying to add suunnittelusopimus before there is a published aloituskuulutusjulkaisu
    return expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      })
    ).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
