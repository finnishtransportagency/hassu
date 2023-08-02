import { describe, it } from "mocha";
import { ProjektiFixture } from "../../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../../fixture/userFixture";
import { userService } from "../../../src/user";
import { personSearch } from "../../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../../src/projekti/validator/projektiValidator";
import {
  AineistoTila,
  ELY,
  KayttajaTyyppi,
  Kieli,
  KuulutusJulkaisuTila,
  ProjektiKayttajaInput,
  TallennaProjektiInput,
  VuorovaikutusKierrosTila,
} from "../../../../common/graphql/apiModel";
import assert from "assert";
import { kategorisoimattomatId } from "../../../../common/aineistoKategoriat";
import { Aineisto, UudelleenkuulutusTila, DBProjekti } from "../../../src/database/model";
import { IllegalArgumentError } from "../../../src/error/IllegalArgumentError";
import { assertIsDefined } from "../../../src/util/assertions";
import { expect } from "chai";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator", () => {
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

    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("Muokkaaminen vaatii oikeudet", async () => {
    userFixture.logout();
    const projekti = fixture.dbProjekti2();
    await expect(validateTallennaProjekti(projekti, { oid: projekti.oid, versio: projekti.versio })).to.eventually.rejectedWith(
      "Väylä-kirjautuminen puuttuu"
    );

    userFixture.loginAs(UserFixture.pekkaProjari);
    // Should validate just fine
    await validateTallennaProjekti(projekti, { oid: projekti.oid, versio: projekti.versio });
  });

  it("Vain omistaja voi lisätä varahenkilöitä", async () => {
    await doTestModifyVarahenkiloAsNonOwner(undefined, KayttajaTyyppi.VARAHENKILO);
  });

  it("Vain omistaja voi poistaa varahenkilöitä", async () => {
    await doTestModifyVarahenkiloAsNonOwner(KayttajaTyyppi.VARAHENKILO, undefined);
  });

  async function doTestModifyVarahenkiloAsNonOwner(initialType: KayttajaTyyppi | undefined, targetType: KayttajaTyyppi | undefined) {
    userFixture.logout();
    const projekti = fixture.dbProjekti2();
    projekti.kayttoOikeudet.push(fixture.kunnanYhteysHenkiloDBVaylaUser());

    const varahenkiloKayttajaTunnus = fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus;

    // Alkutilanne: mattiMeikalainen ei ole varahenkilo
    const kayttaja = projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus == varahenkiloKayttajaTunnus).pop();
    assert(kayttaja);
    kayttaja.tyyppi = initialType;
    kayttaja.muokattavissa = true;

    // Yritä muuttaa mattiMeikalainen varahenkiloksi
    const kayttoOikeudetInput = projekti.kayttoOikeudet.map((user) => {
      assertIsDefined(user.puhelinnumero);
      const kayttoOikeus: ProjektiKayttajaInput = {
        kayttajatunnus: user.kayttajatunnus,
        yleinenYhteystieto: user.yleinenYhteystieto,
        puhelinnumero: user.puhelinnumero,
        tyyppi: user.kayttajatunnus == varahenkiloKayttajaTunnus ? targetType : user.tyyppi,
      };
      return kayttoOikeus;
    });

    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kayttoOikeudet: kayttoOikeudetInput,
    };

    // Ei sallittua muuttaa varahenkilöitä jos ei ole omistaja
    userFixture.loginAs(UserFixture.kunnanYhteysHenkiloProjektiKayttaja);
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith("Et ole projektin omistaja");

    // Sallittua projektin projektipäällikölle
    userFixture.loginAs(UserFixture.pekkaProjari);
    await validateTallennaProjekti(projekti, input);
  }

  it("Nähtävilläolovaiheen kuulutustietoja ei voi tallentaa ennen aineistojen tallentamista", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: { hankkeenKuvaus: { SUOMI: "Kuvaus" } },
    };
    expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Nähtävilläolovaiheen aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
  });

  it("Nähtävilläolovaiheen kuulutustietoja ei voi tallentaa, jos aineistoja kategorisoimatta", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    projekti.nahtavillaoloVaihe = {
      id: 1,
      aineistoNahtavilla: [
        {
          dokumenttiOid: "11",
          jarjestys: 1,
          kategoriaId: kategorisoimattomatId,
          nimi: "T113 TS Esite.txt",
          tiedosto: "/nahtavillaolo/1/T113 TS Esite.txt",
          tila: AineistoTila.VALMIS,
          tuotu: "***unittest***",
        },
      ],
    };

    const inputWithKuulutusData: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      nahtavillaoloVaihe: { hankkeenKuvaus: { SUOMI: "Kuvaus" } },
    };
    expect(validateTallennaProjekti(projekti, inputWithKuulutusData)).to.eventually.rejectedWith(
      "Nähtävilläolovaiheen aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
    projekti.nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => {
      aineisto.kategoriaId = undefined;
    });
    expect(validateTallennaProjekti(projekti, inputWithKuulutusData)).to.eventually.rejectedWith(
      "Nähtävilläolovaiheen aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
    // Tallennus on OK kun kaikilla aineistoilla on kategoriat
    projekti.nahtavillaoloVaihe.aineistoNahtavilla?.forEach((aineisto) => {
      aineisto.kategoriaId = "osa_a";
    });
    await validateTallennaProjekti(projekti, inputWithKuulutusData);
  });

  it("Hyväksymispäätösvaiheen kuulutustietoja ei voi tallentaa ennen aineistojen tallentamista", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisPaatosVaihe: { kuulutusPaiva: "2023-01-01" },
    };
    expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(
      "hyvaksymisPaatosVaihe aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
  });

  it("Hyväksymispäätösvaiheen kuulutustietoja ei voi tallentaa, jos aineistoja kategorisoimatta", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const aineisto: Aineisto = {
      dokumenttiOid: "11",
      jarjestys: 1,
      kategoriaId: kategorisoimattomatId,
      nimi: "T113 TS Esite.txt",
      tiedosto: "/hyvaksymispaatos/1/T113 TS Esite.txt",
      tila: AineistoTila.VALMIS,
      tuotu: "***unittest***",
    };
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    projekti.hyvaksymisPaatosVaihe = {
      id: 1,
      aineistoNahtavilla: [aineisto],
      hyvaksymisPaatos: [aineisto],
    };

    const inputWithKuulutusData: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisPaatosVaihe: { kuulutusPaiva: "2022-01-01" },
    };
    expect(validateTallennaProjekti(projekti, inputWithKuulutusData)).to.eventually.rejectedWith(
      "hyvaksymisPaatosVaihe aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
    projekti.hyvaksymisPaatosVaihe.aineistoNahtavilla?.forEach((aineisto) => {
      aineisto.kategoriaId = undefined;
    });
    expect(validateTallennaProjekti(projekti, inputWithKuulutusData)).to.eventually.rejectedWith(
      "hyvaksymisPaatosVaihe aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
    // Tallennus on OK kun kaikilla aineistoilla on kategoriat
    projekti.hyvaksymisPaatosVaihe.aineistoNahtavilla?.forEach((aineisto) => {
      aineisto.kategoriaId = "osa_a";
    });
    await validateTallennaProjekti(projekti, inputWithKuulutusData);
  });

  it("Hyväksymispäätösvaiheen kuulutustietoja ei voi tallentaa, jos päätös tallentamatta", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    const aineisto: Aineisto = {
      dokumenttiOid: "11",
      jarjestys: 1,
      kategoriaId: "osa_a",
      nimi: "T113 TS Esite.txt",
      tiedosto: "/hyvaksymispaatos/1/T113 TS Esite.txt",
      tila: AineistoTila.VALMIS,
      tuotu: "***unittest***",
    };
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    projekti.hyvaksymisPaatosVaihe = {
      id: 1,
      aineistoNahtavilla: [aineisto],
    };

    const inputWithKuulutusData: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      hyvaksymisPaatosVaihe: { kuulutusPaiva: "2022-01-01" },
    };
    expect(validateTallennaProjekti(projekti, inputWithKuulutusData)).to.eventually.rejectedWith(
      "hyvaksymisPaatosVaihe aineistoja ei ole vielä tallennettu tai niiden joukossa on kategorisoimattomia."
    );
    // Tallennus on OK kun hyväksymispäätös on asetettu
    projekti.hyvaksymisPaatosVaihe.hyvaksymisPaatos = [aineisto];
    await validateTallennaProjekti(projekti, inputWithKuulutusData);
  });

  it("elyOrganisaatio tiedon voi tallettaa kayttajalle, jolla organisaatio on asetettu 'ELY':ksi", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kayttoOikeudet: [{ kayttajatunnus: ELY_UID, puhelinnumero: "0441231234", elyOrganisaatio: ELY.HAME_ELY }],
    };
    // Tallennus on OK kun tallennettavan käyttäjän organisaatio on 'ELY'
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.fulfilled;
  });

  it("elyOrganisaatio tietoa ei voi tallettaa kayttajalle, jolla organisaatio ei ole 'ELY'", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      kayttoOikeudet: [{ kayttajatunnus: VAYLA_UID, puhelinnumero: "0441231234", elyOrganisaatio: ELY.HAME_ELY }],
    };
    // Tallennus epäonnistuu kun tallennettavan käyttäjän organisaatio ei ole 'ELY'
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

  it("ei anna asettaa vähäistä menettelyä projektille, jolla on julkaistu aloituskuulutus eikä muokkaustilaista uudelleenkuulutusta", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { suunnitteluSopimus, nahtavillaoloVaihe, hyvaksymisPaatosVaihe, ...projekti } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa asettaa vähäisen menettelyn projektille, jolla on muokattavaksi palautettu uudelleenkuulutus", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const { suunnitteluSopimus, nahtavillaoloVaihe, hyvaksymisPaatosVaihe, ...projekti } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
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

  it("antaa tehdä nähtävilläoloon migroidusta projektista vähäisen menettelyn projektin", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projektiFixture = new ProjektiFixture();
    const migroituProjekti: DBProjekti = {
      oid: "123",
      velho: { nimi: "testi" },
      versio: 1,
      kayttoOikeudet: [projektiFixture.pekkaProjariProjektiKayttaja()],
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          [Kieli.SUOMI]: "Hankkeen kuvaus",
        },
      },
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          velho: {
            nimi: "testi",
          },
        },
      ],
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 1,
          tila: VuorovaikutusKierrosTila.MIGROITU,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.MIGROITU,
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: migroituProjekti.oid,
      versio: migroituProjekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(migroituProjekti, input)).to.eventually.be.fulfilled;
  });

  it("ei anna tehdä suunnitteluvaiheeseen migroidusta projektista vähäisen menettelyn projektia, jos nähtävilläolovaiheeseen on tehty hyväksyntää odottava julkaisu", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projektiFixture = new ProjektiFixture();
    const migroituProjekti: DBProjekti = {
      oid: "123",
      velho: { nimi: "testi" },
      versio: 1,
      kayttoOikeudet: [projektiFixture.pekkaProjariProjektiKayttaja()],
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          [Kieli.SUOMI]: "Hankkeen kuvaus",
        },
      },
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          velho: {
            nimi: "testi",
          },
        },
      ],
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 1,
          tila: VuorovaikutusKierrosTila.MIGROITU,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: migroituProjekti.oid,
      versio: migroituProjekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(migroituProjekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna tehdä suunnitteluvaiheeseen migroidusta projektista vähäisen menettelyn projektia, jos nähtävilläolovaiheeseen on tehty hyväksytty odottava julkaisu", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projektiFixture = new ProjektiFixture();
    const migroituProjekti: DBProjekti = {
      oid: "123",
      velho: { nimi: "testi" },
      versio: 1,
      kayttoOikeudet: [projektiFixture.pekkaProjariProjektiKayttaja()],
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          [Kieli.SUOMI]: "Hankkeen kuvaus",
        },
      },
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          velho: {
            nimi: "testi",
          },
        },
      ],
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 1,
          tila: VuorovaikutusKierrosTila.MIGROITU,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: migroituProjekti.oid,
      versio: migroituProjekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(migroituProjekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa tehdä suunnitteluvaiheeseen migroidusta projektista vähäisen menettelyn projektin, jos nähtävilläolo on julkaistu mutta sitten avattu uudelleenkuulutus", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projektiFixture = new ProjektiFixture();
    const migroituProjekti: DBProjekti = {
      oid: "123",
      salt: "jotain",
      velho: { nimi: "testi" },
      versio: 1,
      kayttoOikeudet: [projektiFixture.pekkaProjariProjektiKayttaja()],
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          [Kieli.SUOMI]: "Hankkeen kuvaus",
        },
      },
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          velho: {
            nimi: "testi",
          },
        },
      ],
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 1,
          tila: VuorovaikutusKierrosTila.MIGROITU,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        uudelleenKuulutus: {
          tila: UudelleenkuulutusTila.PERUUTETTU,
        },
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: migroituProjekti.oid,
      versio: migroituProjekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(migroituProjekti, input)).to.eventually.be.fulfilled;
  });

  it("ei anna tehdä suunnitteluvaiheeseen migroidusta projektista vähäisen menettelyn projektia, jos nähtävilläolo on julkaistu mutta sitten avattu uudelleenkuulutus, mutta uudelleenkuulutus odottaa hyväksyntää", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projektiFixture = new ProjektiFixture();
    const migroituProjekti: DBProjekti = {
      oid: "123",
      velho: { nimi: "testi" },
      versio: 1,
      kayttoOikeudet: [projektiFixture.pekkaProjariProjektiKayttaja()],
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          [Kieli.SUOMI]: "Hankkeen kuvaus",
        },
      },
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          velho: {
            nimi: "testi",
          },
        },
      ],
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 1,
          tila: VuorovaikutusKierrosTila.MIGROITU,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
        uudelleenKuulutus: {
          tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
        },
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
        },
        {
          id: 2,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.ODOTTAA_HYVAKSYNTAA,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
          uudelleenKuulutus: {
            tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
          },
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: migroituProjekti.oid,
      versio: migroituProjekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(migroituProjekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("ei anna tehdä suunnitteluvaiheeseen migroidusta projektista vähäisen menettelyn projektia, jos nähtävilläolo on julkaistu mutta sitten avattu uudelleenkuulutus, mutta uudelleenkuulutus on hyväksytty", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const projektiFixture = new ProjektiFixture();
    const migroituProjekti: DBProjekti = {
      oid: "123",
      velho: { nimi: "testi" },
      versio: 1,
      kayttoOikeudet: [projektiFixture.pekkaProjariProjektiKayttaja()],
      kielitiedot: {
        ensisijainenKieli: Kieli.SUOMI,
      },
      aloitusKuulutus: {
        id: 1,
        hankkeenKuvaus: {
          [Kieli.SUOMI]: "Hankkeen kuvaus",
        },
      },
      aloitusKuulutusJulkaisut: [
        {
          id: 1,
          tila: KuulutusJulkaisuTila.MIGROITU,
          yhteystiedot: [],
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          velho: {
            nimi: "testi",
          },
        },
      ],
      vuorovaikutusKierros: {
        vuorovaikutusNumero: 1,
        tila: VuorovaikutusKierrosTila.MIGROITU,
      },
      vuorovaikutusKierrosJulkaisut: [
        {
          id: 1,
          tila: VuorovaikutusKierrosTila.MIGROITU,
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.PERUUTETTU,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
          kuulutusPaiva: "2022-01-01",
        },
        {
          id: 2,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
          uudelleenKuulutus: {
            tila: UudelleenkuulutusTila.JULKAISTU_PERUUTETTU,
          },
          kuulutusPaiva: "2022-11-01",
        },
      ],
    };
    const input: TallennaProjektiInput = {
      oid: migroituProjekti.oid,
      versio: migroituProjekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(migroituProjekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });
});
