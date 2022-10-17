import { describe, it } from "mocha";
import { ProjektiFixture } from "../fixture/projektiFixture";
import * as sinon from "sinon";
import { UserFixture } from "../fixture/userFixture";
import { userService } from "../../src/user";
import { personSearch } from "../../src/personSearch/personSearchClient";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { validateTallennaProjekti } from "../../src/projekti/projektiValidator";
import { KayttajaTyyppi, ProjektiKayttajaInput, TallennaProjektiInput } from "../../../common/graphql/apiModel";
import assert from "assert";

const { expect } = require("chai");

describe("projektiValidator", () => {
  let fixture: ProjektiFixture;
  let userFixture: UserFixture;

  beforeEach(() => {
    const personSearchFixture = new PersonSearchFixture();
    const a1User = personSearchFixture.createKayttaja("A1");
    const a2User = personSearchFixture.createKayttaja("A2");
    sinon.stub(personSearch, "getKayttajas").resolves(Kayttajas.fromKayttajaList([a1User, a2User]));

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
    expect(() => validateTallennaProjekti(projekti, { oid: projekti.oid })).throws("Väylä-kirjautuminen puuttuu");

    userFixture.loginAs(UserFixture.pekkaProjari);
    // Should validate just fine
    validateTallennaProjekti(projekti, { oid: projekti.oid });
  });

  it("Vain omistaja voi lisätä varahenkilöitä", async () => {
    doTestModifyVarahenkiloAsNonOwner(undefined, KayttajaTyyppi.VARAHENKILO);
  });

  it("Vain omistaja voi poistaa varahenkilöitä", async () => {
    doTestModifyVarahenkiloAsNonOwner(KayttajaTyyppi.VARAHENKILO, undefined);
  });

  function doTestModifyVarahenkiloAsNonOwner(initialType: KayttajaTyyppi | undefined, targetType: KayttajaTyyppi | undefined) {
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
      kayttoOikeudet: kayttoOikeudetInput,
    };

    // Ei sallittua muuttaa varahenkilöitä jos ei ole omistaja
    userFixture.loginAs(UserFixture.kunnanYhteysHenkiloProjektiKayttaja);
    expect(() => validateTallennaProjekti(projekti, input)).throws("Et ole projektin omistaja");

    // Sallittua projektin projektipäällikölle
    userFixture.loginAs(UserFixture.pekkaProjari);
    validateTallennaProjekti(projekti, input);
  }

  it("Vain admin voi muokata kasittelynTila-kenttää ja vain tietyissä vaiheissa", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = fixture.dbProjekti2();
    let input = { oid: projekti.oid, kasittelynTila: {} };
    expect(() => validateTallennaProjekti(projekti, input)).throws(
      "Sinulla ei ole admin-oikeuksia (Hyvaksymispaatoksia voi tallentaa vain Hassun yllapitaja)"
    );

    userFixture.loginAs(UserFixture.hassuAdmin);
    validateTallennaProjekti(projekti, input);

    // Projektin status on SUUNNITTELU, joten hyväksymispäätöksiä ei voi tallentaaa vielä
    expect(() => validateTallennaProjekti(projekti, { oid: projekti.oid, kasittelynTila: { hyvaksymispaatos: {} } })).throws(
      "Hyväksymispäätöstä voidaan muokata vasta nähtävilläolovaiheessa tai sitä myöhemmin"
    );
    expect(() => validateTallennaProjekti(projekti, { oid: projekti.oid, kasittelynTila: { ensimmainenJatkopaatos: {} } })).throws(
      "Ensimmäistä jatkopäätöstä voi muokata vain hyväksymispäätöksen jälkeisen epäaktiivisuuden jälkeen"
    );
    expect(() => validateTallennaProjekti(projekti, { oid: projekti.oid, kasittelynTila: { toinenJatkopaatos: {} } })).throws(
      "Toista jatkopäätöstä voi muokata vain ensimmäisen jatkopäätöksen jälkeen"
    );
  });

  it("KasittelynTila-kentän onnistuneet muokkaukset", async () => {
    userFixture.loginAs(UserFixture.mattiMeikalainen);
    let projekti = fixture.dbProjekti4();

    delete projekti.hyvaksymisPaatosVaihe;
    delete projekti.hyvaksymisPaatosVaiheJulkaisut;

    userFixture.loginAs(UserFixture.hassuAdmin);
    // Projektin status on NAHTAVILLAOLO, joten hyväksymispäätöksen voi täyttää
    validateTallennaProjekti(projekti, {
      oid: projekti.oid,
      kasittelynTila: { hyvaksymispaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" } },
    });

    // Projektin status on EPAAKTIIVINEN_1, joten hyväksymispäätöksen voi täyttää
    projekti = fixture.dbProjekti4();
    projekti.nahtavillaoloVaiheJulkaisut![0].kuulutusVaihePaattyyPaiva = "2000-01-01";
    projekti.hyvaksymisPaatosVaiheJulkaisut![0].kuulutusVaihePaattyyPaiva = "2000-01-01";
    projekti.kasittelynTila = { hyvaksymispaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" } };
    validateTallennaProjekti(projekti, {
      oid: projekti.oid,
      kasittelynTila: { ensimmainenJatkopaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" } },
    });

    // Huijataan jatkopäätös julkaistuksi ja vanhentuneeksi
    projekti.jatkoPaatos1VaiheJulkaisut = projekti.hyvaksymisPaatosVaiheJulkaisut;
    projekti.kasittelynTila = {
      hyvaksymispaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" },
      ensimmainenJatkopaatos: { asianumero: "1", paatoksenPvm: "2000-01-01" },
    };
    validateTallennaProjekti(projekti, { oid: projekti.oid, kasittelynTila: { toinenJatkopaatos: {} } });
  });
});
