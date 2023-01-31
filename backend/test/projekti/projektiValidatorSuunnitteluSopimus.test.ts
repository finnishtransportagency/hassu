import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";
import * as sinon from "sinon";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../src/projekti/projektiValidator";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { KuulutusJulkaisuTila } from "../../../common/graphql/apiModel";

const { expect } = require("chai");

describe("validateTallennaProjekti (suunnittelusopimus)", () => {
  let fixture: ProjektiFixture;
  let userFixture: UserFixture;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

    userFixture = new UserFixture(userService);
    fixture = new ProjektiFixture();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
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

    expect(() => validateTallennaProjekti(projekti, input)).throws(IllegalArgumentError);
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

    expect(() =>
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: null,
      })
    ).throws(IllegalArgumentError);
  });

  it("should prevent suunnittelusopimus from being added if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    expect(() =>
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      })
    ).throws(IllegalArgumentError);
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
    return expect(() =>
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        suunnitteluSopimus: {
          kunta: 1,
          logo: "123.jpg",
          yhteysHenkilo: fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus,
        },
      })
    ).throws(IllegalArgumentError);
  });
});
