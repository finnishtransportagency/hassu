import { describe, it } from "mocha";
import { ProjektiFixture } from "../../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../../fixture/userFixture";
import { userService } from "../../../../src/user";
import { personSearch } from "../../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../../src/projekti/validator/projektiValidator";
import { Kieli, KuulutusJulkaisuTila, TallennaProjektiInput, VuorovaikutusKierrosTila } from "hassu-common/graphql/apiModel";
import { AloitusKuulutusJulkaisu, DBProjekti, UudelleenkuulutusTila, Velho } from "../../../../src/database/model";
import { IllegalArgumentError } from "hassu-common/error";
import { expect } from "chai";
import { parameters } from "../../../../src/aws/parameters";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator (kielitiedotValidator)", () => {
  let fixture: ProjektiFixture;
  const userFixture = new UserFixture(userService);

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const elyUser = personSearchFixture.createKayttaja(ELY_UID, "ELY");
    const vaylaUser = personSearchFixture.createKayttaja(VAYLA_UID);
    const kayttaja1 = personSearchFixture.createKayttaja("A123");
    const kayttaja2 = personSearchFixture.createKayttaja("A000111");
    const kayttaja3 = personSearchFixture.createKayttaja("A000123");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([elyUser, vaylaUser, kayttaja1, kayttaja2, kayttaja3]));
    sinon.stub(parameters, "isAsianhallintaIntegrationEnabled").returns(Promise.resolve(false));

    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("antaa muuttaa kielitietoja projektille, jolla ei ole aloituskuulutusjulkaisua", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const {
      suunnitteluSopimus: _s,
      nahtavillaoloVaihe: _n,
      hyvaksymisPaatosVaihe: _h,
      aloitusKuulutusJulkaisut: _a,
      ...projekti
    } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    await expect(await validateTallennaProjekti(projekti, input)).to.eql(undefined);
  });

  it("antaa muuttaa kielitietoja projektille, jolla on migroitu aloituskuulutusjulkaisu", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const {
      suunnitteluSopimus: _s,
      nahtavillaoloVaihe: _n,
      hyvaksymisPaatosVaihe: _h,
      aloitusKuulutusJulkaisut: _aj,
      aloitusKuulutus: _a,
      ...projekti
    } = fixture.dbProjekti2();
    const testiProjekti: DBProjekti = {
      ...projekti,
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
          kielitiedot: projekti.kielitiedot,
          velho: projekti.velho as Velho,
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    await expect(await validateTallennaProjekti(testiProjekti, input)).to.eql(undefined);
  });

  it("ei anna muuttaa kielitietoja projektille, jolla on julkaistu aloituskuulutus eikä muokkaustilaista uudelleenkuulutusta", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { suunnitteluSopimus: _s, nahtavillaoloVaihe: _n, hyvaksymisPaatosVaihe: _h, ...projekti } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa muuttaa kielitietoja projektille, jos sillä on avattu aloituskuulutuksen uudelleenkuulutus", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { suunnitteluSopimus: _s, nahtavillaoloVaihe: _n, hyvaksymisPaatosVaihe: _h, ...projekti } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    projekti.aloitusKuulutus = {
      ...projekti.aloitusKuulutus,
      id: projekti.aloitusKuulutus?.id || 1,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2023-06-15",
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
    };
    await expect(await validateTallennaProjekti(projekti, input)).to.eql(undefined);
  });

  it("ei anna muuttaa kielitietoja projektille, jos sillä on avattu aloituskuulutuksen uudelleenkuulutus ja se on hyväksytty", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { suunnitteluSopimus: _s, nahtavillaoloVaihe: _n, hyvaksymisPaatosVaihe: _h, ...projekti } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    projekti.aloitusKuulutus = {
      ...projekti.aloitusKuulutus,
      id: projekti.aloitusKuulutus?.id || 1,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2023-06-15",
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
    };
    const uusiKuulutusJulkaisu: AloitusKuulutusJulkaisu = {
      ...(projekti.aloitusKuulutusJulkaisut?.[0] as AloitusKuulutusJulkaisu),
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2023-06-15",
        selosteKuulutukselle: {
          SUOMI: "sdgsdfg",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "afgafhg",
        },
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
    };
    projekti.aloitusKuulutusJulkaisut?.push(uusiKuulutusJulkaisu);
    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa muuttaa kielitietoja projektille, jos sillä on muokattavaksi palautettu aloituskuulutuksen uudelleenkuulutus", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { suunnitteluSopimus: _s, nahtavillaoloVaihe: _n, hyvaksymisPaatosVaihe: _h, ...projekti } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    projekti.aloitusKuulutus = {
      ...projekti.aloitusKuulutus,
      id: projekti.aloitusKuulutus?.id || 1,
      uudelleenKuulutus: {
        alkuperainenHyvaksymisPaiva: "2023-06-15",
        selosteKuulutukselle: {
          SUOMI: "sdgsdfg",
        },
        selosteLahetekirjeeseen: {
          SUOMI: "afgafhg",
        },
        tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
      },
    };
    await expect(await validateTallennaProjekti(projekti, input)).to.eql(undefined);
  });

  it("should allow kielitiedot being changed if aloituskuulutus is migrated", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projekti = fixture.dbProjekti2();
    projekti.aloitusKuulutus = {
      hankkeenKuvaus: {},
      id: 1,
    };
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
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    let allOk = true;
    try {
      await validateTallennaProjekti(projekti, input);
    } catch (e) {
      console.log(e);
      allOk = false;
    }
    expect(allOk).to.eql(true);
  });

  it("should not allow kielitiedot being changed if aloituskuulutus is migrated and there is vuorovaikutusKierrosJulkaisu", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    delete projekti.suunnitteluSopimus;
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
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should allow kielitiedot being changed if aloituskuulutus and suunnitteluvaihe are migrated", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    delete projekti.suunnitteluSopimus;
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
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
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

  it("should not allow kielitiedot being changed if aloituskuulutus and suunnitteluvaihe are migrated, nahtavillaolo is published, even when there is uudelleenkuulutus open", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
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
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("should not allow kielitiedot being changed if aloituskuulutus and suunnitteluvaihe are migrated, nahtavillaolo is published and there is uudelleenkuulutus waiting to be accepted", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
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
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
        toissijainenKieli: null,
      },
    };
    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
