import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../src/projekti/projektiValidator";
import { AineistoTila, ELY, KayttajaTyyppi, ProjektiKayttajaInput, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import assert from "assert";
import { kategorisoimattomatId } from "../../../common/aineistoKategoriat";
import { Aineisto } from "../../src/database/model";
import { IllegalArgumentError } from "../../src/error/IllegalArgumentError";

const { expect } = require("chai");

const ELY_UID = "A1";
const VAYLA_UID = "A2";

describe("projektiValidator", () => {
  let fixture: ProjektiFixture;
  let userFixture: UserFixture;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const elyUser = personSearchFixture.createKayttaja(ELY_UID, "ELY");
    const vaylaUser = personSearchFixture.createKayttaja(VAYLA_UID);
    const kayttaja1 = personSearchFixture.createKayttaja("A123");
    const kayttaja2 = personSearchFixture.createKayttaja("A000111");
    const kayttaja3 = personSearchFixture.createKayttaja("A000123");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([elyUser, vaylaUser, kayttaja1, kayttaja2, kayttaja3]));

    userFixture = new UserFixture(userService);
    fixture = new ProjektiFixture();
  });

  afterEach(() => {
    userFixture.logout();
    sinon.restore();
  });

  it("Muokkaaminen vaatii oikeudet", async () => {
    userFixture.logout();
    let projekti = fixture.dbProjekti2();
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
    let projekti = fixture.dbProjekti2();
    projekti.kayttoOikeudet.push(fixture.kunnanYhteysHenkiloDBVaylaUser());

    const varahenkiloKayttajaTunnus = fixture.mattiMeikalainenDBVaylaUser().kayttajatunnus;

    // Alkutilanne: mattiMeikalainen ei ole varahenkilo
    let kayttaja = projekti.kayttoOikeudet.filter((user) => user.kayttajatunnus == varahenkiloKayttajaTunnus).pop();
    assert(kayttaja);
    kayttaja.tyyppi = initialType;
    kayttaja.muokattavissa = true;

    // Yritä muuttaa mattiMeikalainen varahenkiloksi
    let kayttoOikeudetInput = projekti.kayttoOikeudet.map((user) => {
      let kayttoOikeus: ProjektiKayttajaInput = {
        kayttajatunnus: user.kayttajatunnus,
        yleinenYhteystieto: user.yleinenYhteystieto,
        puhelinnumero: user.puhelinnumero!,
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

  it("Vain admin voi muokata kasittelynTila-kenttää ja vain tietyissä vaiheissa", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = fixture.dbProjekti2();
    let input = { oid: projekti.oid, versio: projekti.versio, kasittelynTila: {} };
    await expect(validateTallennaProjekti(projekti, input)).to.eventually.rejectedWith(
      "Sinulla ei ole admin-oikeuksia (Hyvaksymispaatoksia voi tallentaa vain Hassun yllapitaja)"
    );

    userFixture.loginAs(UserFixture.hassuAdmin);
    await validateTallennaProjekti(projekti, input);

    // Projektin status on SUUNNITTELU, joten hyväksymispäätöksiä ei voi tallentaaa vielä
    expect(
      validateTallennaProjekti(projekti, { oid: projekti.oid, versio: projekti.versio, kasittelynTila: { hyvaksymispaatos: {} } })
    ).to.eventually.rejectedWith("Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin");
    expect(
      validateTallennaProjekti(projekti, {
        oid: projekti.oid,
        versio: projekti.versio,
        kasittelynTila: { ensimmainenJatkopaatos: {} },
      })
    ).to.eventually.rejectedWith("Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen");
    expect(
      validateTallennaProjekti(projekti, { oid: projekti.oid, versio: projekti.versio, kasittelynTila: { toinenJatkopaatos: {} } })
    ).to.eventually.rejectedWith("Toista jatkopäätöstä voi muokata vain ensimmäisen jatkopäätöksen jälkeen");
  });

  it("Nähtävilläolovaiheen kuulutustietoja ei voi tallentaa ennen aineistojen tallentamista", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = fixture.dbProjektiLackingNahtavillaoloVaihe();
    let input: TallennaProjektiInput = {
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
          tiedosto: "/hyvaksymispaatos/1/T113 TS Esite.txt",
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
    let projekti = fixture.dbProjektiHyvaksymisMenettelyssa();
    let input: TallennaProjektiInput = {
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

  it("KasittelynTila-kentän onnistuneet muokkaukset", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = fixture.dbProjekti4();

    delete projekti.hyvaksymisPaatosVaihe;
    delete projekti.hyvaksymisPaatosVaiheJulkaisut;

    userFixture.loginAs(UserFixture.hassuAdmin);
    // Projektin status on NAHTAVILLAOLO, joten hyväksymispäätöksen voi täyttää
    await validateTallennaProjekti(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,

      kasittelynTila: { hyvaksymispaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" } },
    });

    // Projektin status on EPAAKTIIVINEN_1, joten hyväksymispäätöksen voi täyttää
    projekti = fixture.dbProjekti4();
    projekti.nahtavillaoloVaiheJulkaisut![0].kuulutusVaihePaattyyPaiva = "2000-01-01";
    projekti.hyvaksymisPaatosVaiheJulkaisut![0].kuulutusVaihePaattyyPaiva = "2000-01-01";
    projekti.kasittelynTila = { hyvaksymispaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" } };
    await validateTallennaProjekti(projekti, {
      oid: projekti.oid,
      versio: projekti.versio,

      kasittelynTila: { ensimmainenJatkopaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" } },
    });

    // Huijataan jatkopäätös julkaistuksi ja vanhentuneeksi
    projekti.jatkoPaatos1VaiheJulkaisut = projekti.hyvaksymisPaatosVaiheJulkaisut;
    projekti.kasittelynTila = {
      hyvaksymispaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" },
      ensimmainenJatkopaatos: { asianumero: "1", paatoksenPvm: "2000-01-01", aktiivinen: true },
    };
    await validateTallennaProjekti(projekti, { oid: projekti.oid, versio: projekti.versio, kasittelynTila: { toinenJatkopaatos: {} } });
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
    await validateTallennaProjekti(projekti, input);
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
});
