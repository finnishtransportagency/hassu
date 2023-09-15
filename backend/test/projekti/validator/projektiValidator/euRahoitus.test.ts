import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import { IllegalArgumentError } from "../../../../src/error/IllegalArgumentError";
import * as sinon from "sinon";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { Kieli, KuulutusJulkaisuTila, VuorovaikutusKierrosTila } from "../../../../../common/graphql/apiModel";
import { UudelleenkuulutusTila } from "../../../../src/database/model";

import { expect } from "chai";

describe("validateTallennaProjekti (suunnittelusopimusValidator)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

    fixture = new ProjektiFixture();
    userFixture.loginAs(UserFixture.mattiMeikalainen);
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("should prevent euRahoitus from being removed if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.euRahoitus = true;
    projekti.euRahoitusLogot = {
      logoFI: "logo.png",
      logoSV: "logoSV.png",
    };

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: false,
      euRahoitusLogot: null,
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent euRahoitus from being removed if latest aloituskuulutusjulkaisu is waiting for approval", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.euRahoitus = true;
    projekti.euRahoitusLogot = {
      logoFI: "logo.png",
      logoSV: "logoSV.png",
    };

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: false,
      euRahoitusLogot: null,
    };
    projekti.aloitusKuulutusJulkaisut?.push({
      ...projekti.aloitusKuulutusJulkaisut[projekti.aloitusKuulutusJulkaisut.length - 1],
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should prevent euRahoitus from being added if aloituskuulutus is published", async () => {
    const projekti = fixture.dbProjekti2();
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow euRahoitus being added if aloituskuulutus is not published", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    delete projekti.aloitusKuulutusJulkaisut;
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };
    let allOk = true;
    try {
      await validateTallennaProjekti(projekti, input);
    } catch (e) {
      allOk = false;
    }
    expect(allOk).to.eql(true);
  });

  it("should precent euRahoitus from being added if latest aloituskuulutusjulkaisu is waiting for approval", async () => {
    const projekti = fixture.dbProjekti2();
    projekti.aloitusKuulutusJulkaisut?.push({
      ...projekti.aloitusKuulutusJulkaisut[projekti.aloitusKuulutusJulkaisut.length - 1],
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };

    // Validate that there is an error if trying to add euRahoitus before there is a published aloituskuulutusjulkaisu
    return expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow euRahoitus being added if aloituskuulutus is migrated", async () => {
    const projekti = fixture.dbProjekti2();
    delete projekti.suunnitteluSopimus;
    delete projekti.aloitusKuulutusJulkaisut;
    projekti.aloitusKuulutusJulkaisut = [
      {
        velho: { nimi: "" },
        tila: KuulutusJulkaisuTila.MIGROITU,
        id: 1,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
        kielitiedot: { ensisijainenKieli: Kieli.SUOMI },
      },
    ];
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };
    let allOk = true;
    try {
      await validateTallennaProjekti(projekti, input);
    } catch (e) {
      allOk = false;
    }
    expect(allOk).to.eql(true);
  });

  it("should not allow euRahoitus being added if aloituskuulutus is migrated and there is vuorovaikutusKierrosJulkaisu", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    delete projekti.aloitusKuulutusJulkaisut;
    delete projekti.aloitusKuulutus;
    projekti.aloitusKuulutus = {
      id: 1,
    };
    projekti.aloitusKuulutusJulkaisut = [
      {
        velho: { nimi: "" },
        tila: KuulutusJulkaisuTila.MIGROITU,
        id: 1,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
        kielitiedot: {
          ensisijainenKieli: Kieli.SUOMI,
        },
      },
    ];

    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };

    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow euRahoitus being added if aloituskuulutus and suunnitteluvihe are migrated", async () => {
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    delete projekti.aloitusKuulutusJulkaisut;
    delete projekti.aloitusKuulutus;
    projekti.aloitusKuulutus = {
      id: 1,
      hankkeenKuvaus: {},
    };
    projekti.aloitusKuulutusJulkaisut = [
      {
        velho: { nimi: "" },
        tila: KuulutusJulkaisuTila.MIGROITU,
        id: 1,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
        kielitiedot: {
          ensisijainenKieli: Kieli.SUOMI,
        },
      },
    ];
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MIGROITU,
    };
    projekti.vuorovaikutusKierrosJulkaisut = [
      {
        id: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
        yhteystiedot: [],
        esitettavatYhteystiedot: {},
      },
    ];
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };
    let allOk = true;
    try {
      await validateTallennaProjekti(projekti, input);
    } catch (e) {
      allOk = false;
    }
    expect(allOk).to.eql(true);
  });

  it("should allow euRahoitus being added if aloituskuulutus and suunnitteluvihe are migrated, nahtavillaolo is published but there is uudelleenkuulutus open", async () => {
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    projekti.aloitusKuulutus = {
      id: 1,
      hankkeenKuvaus: {},
    };
    projekti.aloitusKuulutusJulkaisut = [
      {
        velho: { nimi: "" },
        tila: KuulutusJulkaisuTila.MIGROITU,
        id: 1,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
        kielitiedot: {
          ensisijainenKieli: Kieli.SUOMI,
        },
      },
    ];
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MIGROITU,
    };
    projekti.vuorovaikutusKierrosJulkaisut = [
      {
        id: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
        yhteystiedot: [],
        esitettavatYhteystiedot: {},
      },
    ];
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 1,
      uudelleenKuulutus: {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
    };
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };
    let allOk = true;
    try {
      await validateTallennaProjekti(projekti, input);
    } catch (e) {
      allOk = false;
    }
    expect(allOk).to.eql(true);
  });

  it("should not allow euRahoitus being added if aloituskuulutus and suunnitteluvihe are migrated, nahtavillaolo is published and there is uudelleenkuulutus waiting to be accepted", async () => {
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    projekti.aloitusKuulutus = {
      id: 1,
      hankkeenKuvaus: {},
    };
    projekti.aloitusKuulutusJulkaisut = [
      {
        velho: { nimi: "" },
        tila: KuulutusJulkaisuTila.MIGROITU,
        id: 1,
        yhteystiedot: [],
        kuulutusYhteystiedot: {},
        kielitiedot: {
          ensisijainenKieli: Kieli.SUOMI,
        },
      },
    ];
    projekti.vuorovaikutusKierros = {
      vuorovaikutusNumero: 1,
      tila: VuorovaikutusKierrosTila.MIGROITU,
    };
    projekti.vuorovaikutusKierrosJulkaisut = [
      {
        id: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
        yhteystiedot: [],
        esitettavatYhteystiedot: {},
      },
    ];
    projekti.nahtavillaoloVaihe = {
      ...projekti.nahtavillaoloVaihe,
      id: 1,
      uudelleenKuulutus: {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
    };
    projekti.nahtavillaoloVaiheJulkaisut?.push({
      ...projekti.nahtavillaoloVaiheJulkaisut[0],
      uudelleenKuulutus: {
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
      tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
    });
    const input = {
      oid: projekti.oid,
      versio: projekti.versio,
      euRahoitus: true,
      euRahoitusLogot: {
        logoFI: "logo.png",
        logoSV: "logoSV.png",
      },
    };
    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
