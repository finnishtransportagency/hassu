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
import { DBProjekti, UudelleenkuulutusTila } from "../../../../src/database/model";
import { IllegalArgumentError } from "hassu-common/error";
import { expect } from "chai";
import { parameters } from "../../../../src/aws/parameters";

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator (vahainenMenettelyValidator)", () => {
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
    sinon.stub(parameters, "isUspaIntegrationEnabled").returns(Promise.resolve(false));

    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("ei anna asettaa vähäistä menettelyä projektille, jolla on julkaistu aloituskuulutus eikä muokkaustilaista uudelleenkuulutusta", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const {
      suunnitteluSopimus: _suunnitteluSopimus,
      nahtavillaoloVaihe: _nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe: _hyvaksymisPaatosVaihe,
      ...projekti
    } = fixture.dbProjekti2();
    const input: TallennaProjektiInput = {
      oid: projekti.oid,
      versio: projekti.versio,
      vahainenMenettely: true,
    };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.be.rejectedWith(IllegalArgumentError);
  });

  it("antaa asettaa vähäisen menettelyn projektille, jolla on muokattavaksi palautettu uudelleenkuulutus", async () => {
    userFixture.loginAs(UserFixture.pekkaProjari);
    const {
      suunnitteluSopimus: _suunnitteluSopimus,
      nahtavillaoloVaihe: _nahtavillaoloVaihe,
      hyvaksymisPaatosVaihe: _hyvaksymisPaatosVaihe,
      ...projekti
    } = fixture.dbProjekti2();
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
          kuulutusYhteystiedot: {},
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
          yhteystiedot: [],
          esitettavatYhteystiedot: {},
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          projektiOid: "123",
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
      salt: "jotain",
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
          kuulutusYhteystiedot: {},
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
          yhteystiedot: [],
          esitettavatYhteystiedot: {},
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          projektiOid: "123",
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
      salt: "jotain",
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
          kuulutusYhteystiedot: {},
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
          yhteystiedot: [],
          esitettavatYhteystiedot: {},
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          projektiOid: "123",
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
          kuulutusYhteystiedot: {},
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
          yhteystiedot: [],
          esitettavatYhteystiedot: {},
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
          projektiOid: "123",
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
          kuulutusYhteystiedot: {},
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
          yhteystiedot: [],
          esitettavatYhteystiedot: {},
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
          projektiOid: "123",
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
          tila: KuulutusJulkaisuTila.HYVAKSYTTY,
          nahtavillaoloPDFt: {},
          hankkeenKuvaus: {},
          ilmoituksenVastaanottajat: {
            kunnat: [],
            viranomaiset: [],
          },
        },
        {
          projektiOid: "123",
          id: 2,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
          kuulutusYhteystiedot: {},
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
          yhteystiedot: [],
          esitettavatYhteystiedot: {},
        },
      ],
      nahtavillaoloVaihe: {
        id: 1,
      },
      nahtavillaoloVaiheJulkaisut: [
        {
          projektiOid: "123",
          id: 1,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
          projektiOid: "123",
          id: 2,
          velho: {
            nimi: "testi",
          },
          kielitiedot: {
            ensisijainenKieli: Kieli.SUOMI,
          },
          yhteystiedot: [],
          kuulutusYhteystiedot: {},
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
