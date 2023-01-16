import { describe, it } from "mocha";
import { KayttoOikeudetManager } from "../../src/projekti/kayttoOikeudetManager";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { KayttajaTyyppi } from "../../../common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";

const { expect } = require("chai");

describe("KayttoOikeudetManager", () => {
  let kayttajas: Kayttajas;

  const personSearchFixture: PersonSearchFixture = new PersonSearchFixture();
  const kayttajaA1 = personSearchFixture.createKayttaja("A1");
  const kayttajaA2 = personSearchFixture.createKayttaja("A2");
  const kayttajaA3 = personSearchFixture.createKayttaja("A3");
  const kayttajaA4 = personSearchFixture.createKayttaja("A4");

  let users: DBVaylaUser[];

  beforeEach(() => {
    kayttajas = Kayttajas.fromKayttajaList([kayttajaA1, kayttajaA2, kayttajaA3, kayttajaA4]);
    users = [
      {
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
        kayttajatunnus: kayttajaA1.uid as string,
        email: kayttajaA1.email as string,
        etunimi: kayttajaA1.etunimi as string,
        sukunimi: kayttajaA1.sukunimi as string,
        organisaatio: kayttajaA1.organisaatio as string,
        puhelinnumero: kayttajaA1.puhelinnumero as string,
        muokattavissa: false,
      },
      {
        tyyppi: KayttajaTyyppi.VARAHENKILO,
        kayttajatunnus: kayttajaA2.uid as string,
        email: kayttajaA2.email as string,
        etunimi: kayttajaA2.etunimi as string,
        sukunimi: kayttajaA2.sukunimi as string,
        organisaatio: kayttajaA2.organisaatio as string,
        puhelinnumero: kayttajaA2.puhelinnumero as string,
        muokattavissa: false,
      },
      {
        tyyppi: null,
        kayttajatunnus: kayttajaA3.uid as string,
        email: kayttajaA3.email as string,
        etunimi: kayttajaA3.etunimi as string,
        sukunimi: kayttajaA3.sukunimi as string,
        organisaatio: kayttajaA3.organisaatio as string,
        puhelinnumero: kayttajaA3.puhelinnumero as string,
        muokattavissa: true,
      },
    ];
  });

  function expectProjektiPaallikko(manager: KayttoOikeudetManager, uid: string) {
    const projektiPaallikko = manager
      .getKayttoOikeudet()
      .filter((user) => user.tyyppi == KayttajaTyyppi.PROJEKTIPAALLIKKO)
      .filter((user) => user.kayttajatunnus == uid)
      .pop();
    expect(projektiPaallikko).to.exist;
    expect(projektiPaallikko!.muokattavissa).to.be.false;
  }

  function expectVarahenkilo(manager: KayttoOikeudetManager, uid: string, muokattavissa: boolean) {
    const varahenkilo = manager
      .getKayttoOikeudet()
      .filter((user) => user.tyyppi == KayttajaTyyppi.VARAHENKILO)
      .filter((user) => user.kayttajatunnus == uid)
      .pop();
    expect(varahenkilo, "varahenkilöä ei löydy: " + [uid, muokattavissa, JSON.stringify(manager.getKayttoOikeudet())].join(", ")).to.exist;
    expect(varahenkilo!.muokattavissa).to.eq(muokattavissa);
  }

  function expectKayttaja(manager: KayttoOikeudetManager, uid: string, data: Partial<DBVaylaUser>) {
    const varahenkilo = manager
      .getKayttoOikeudet()
      .filter((user) => user.kayttajatunnus == uid)
      .pop();
    expect(varahenkilo, "henkilöä ei löydy: " + [uid, JSON.stringify(manager.getKayttoOikeudet())].join(", ")).to.exist;
    expect(varahenkilo).to.include(data);
  }

  it("should manager projekti users successfully", async () => {
    const manager = new KayttoOikeudetManager([], kayttajas);

    // Lisää projektipäällikkö Velhosta
    manager.addProjektiPaallikkoFromEmail(kayttajaA1.email);
    expectProjektiPaallikko(manager, "A1");

    // Lisää varahenkilö Velhosta
    manager.addVarahenkiloFromEmail(kayttajaA2.email);
    expectProjektiPaallikko(manager, "A1");
    expectVarahenkilo(manager, "A2", false);

    // Lisää nykyinen käyttäjä varahenkilöksi
    manager.addUser({ kayttajatunnus: kayttajaA3.uid!, muokattavissa: true, tyyppi: KayttajaTyyppi.VARAHENKILO });
    expectProjektiPaallikko(manager, "A1");
    expectVarahenkilo(manager, "A2", false);
    expectVarahenkilo(manager, "A3", true);

    // Muokkaa sisältöä ja lisää käyttäjä käyttöliittymältä tulevan pyynnön perusteella
    expect(manager.getKayttoOikeudet()).toMatchSnapshot();
    manager.applyChanges([
      {
        kayttajatunnus: kayttajaA1.uid!,
        puhelinnumero: kayttajaA1.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA2.uid!,
        puhelinnumero: kayttajaA2.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA3.uid!,
        puhelinnumero: kayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA4.uid!,
        puhelinnumero: kayttajaA4.puhelinnumero!,
        yleinenYhteystieto: true,
      },
    ]);

    expectKayttaja(manager, "A1", { puhelinnumero: kayttajaA1.puhelinnumero! });
    expectKayttaja(manager, "A2", { puhelinnumero: kayttajaA2.puhelinnumero! });
    expectKayttaja(manager, "A3", { puhelinnumero: kayttajaA3.puhelinnumero! });
    expectKayttaja(manager, "A4", { puhelinnumero: kayttajaA4.puhelinnumero! });
    expect(manager.getKayttoOikeudet()).to.have.length(4);
    expect(manager.getKayttoOikeudet()).toMatchSnapshot();

    // Vaihda käyttäjäA4 varahenkilöksi
    manager.applyChanges([
      {
        kayttajatunnus: kayttajaA1.uid!,
        puhelinnumero: kayttajaA1.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA2.uid!,
        puhelinnumero: kayttajaA2.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA3.uid!,
        puhelinnumero: kayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA4.uid!,
        puhelinnumero: kayttajaA4.puhelinnumero!,
        tyyppi: KayttajaTyyppi.VARAHENKILO,
      },
    ]);

    expectKayttaja(manager, "A4", { tyyppi: KayttajaTyyppi.VARAHENKILO });

    // Tarkista, ettei tyyppiä voi vaihtaa projektipäälliköksi
    const kayttoOikeudetbefore = manager.getKayttoOikeudet();
    // Yritä vaihtaa käyttäjäA4 projektipäälliköksi
    manager.applyChanges([
      {
        kayttajatunnus: kayttajaA1.uid!,
        puhelinnumero: kayttajaA1.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA2.uid!,
        puhelinnumero: kayttajaA2.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA3.uid!,
        puhelinnumero: kayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA4.uid!,
        puhelinnumero: kayttajaA4.puhelinnumero!,
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      },
    ]);
    // Tarkista, ettei mitään muuttunut
    expect(manager.getKayttoOikeudet()).to.eql(kayttoOikeudetbefore);
    manager.applyChanges(null);
    expect(manager.getKayttoOikeudet()).to.eql(kayttoOikeudetbefore);

    // Yritä poistaa projektipäällikkö ja varahenkilö
    manager.applyChanges([
      {
        kayttajatunnus: kayttajaA3.uid!,
        puhelinnumero: kayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: kayttajaA4.uid!,
        puhelinnumero: kayttajaA4.puhelinnumero!,
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      },
    ]);
    // Tarkista, ettei mitään muuttunut
    expect(manager.getKayttoOikeudet()).to.eql(kayttoOikeudetbefore);
  });

  it("should promote existing user to projektipäällikkö successfully", async () => {
    const manager = new KayttoOikeudetManager([], kayttajas);

    // Lisää nykyinen käyttäjä
    manager.addUser({ kayttajatunnus: kayttajaA3.uid!, muokattavissa: true });
    // Lisää sama käyttäjä Velhosta projektipäälliköksi
    manager.addProjektiPaallikkoFromEmail(kayttajaA3.email);

    let kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet).to.have.length(1);
    let resultUser = kayttoOikeudet[0];
    expect(resultUser).to.eql({
      tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      kayttajatunnus: "A3",
      muokattavissa: false,
      organisaatio: "Väylävirasto",
      email: "a3@vayla.fi",
      etunimi: "EtunimiA3",
      sukunimi: "SukunimiA3",
    });
  });

  it("should promote existing user to varahenkilö successfully", async () => {
    const manager = new KayttoOikeudetManager([], kayttajas);

    // Lisää nykyinen käyttäjä
    manager.addUser({ kayttajatunnus: kayttajaA3.uid!, muokattavissa: true });
    // Lisää sama käyttäjä Velhosta varahenkilöksi
    manager.addVarahenkiloFromEmail(kayttajaA3.email);

    let kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet).to.have.length(1, JSON.stringify(kayttoOikeudet, null, 2));
    let resultUser = kayttoOikeudet[0];
    expect(resultUser).to.eql({
      tyyppi: KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: "A3",
      muokattavissa: false,
      organisaatio: "Väylävirasto",
      email: "a3@vayla.fi",
      etunimi: "EtunimiA3",
      sukunimi: "SukunimiA3",
    });
  });

  it("should not allow kunnanEdustaja to be removed when applying changes", async () => {
    const manager = new KayttoOikeudetManager(users, kayttajas, kayttajaA3.uid || undefined);
    manager.applyChanges([
      {
        kayttajatunnus: kayttajaA1.uid as string,
        puhelinnumero: kayttajaA1.puhelinnumero as string,
      },
      {
        kayttajatunnus: kayttajaA2.uid as string,
        puhelinnumero: kayttajaA2.puhelinnumero as string,
      },
    ]);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet.length).eql(3);
  });

  it("should not allow kunnanEdustaja to be removed when doing addProjektiPaallikkoFromEmail", async () => {
    const manager = new KayttoOikeudetManager(users, kayttajas, kayttajaA1.uid || undefined);
    manager.addProjektiPaallikkoFromEmail(kayttajaA4.email);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet.length).eql(4);
  });

  it("should not allow kunnanEdustaja to be removed when doing addVarahenkiloFromEmail", async () => {
    const manager = new KayttoOikeudetManager(users, kayttajas, kayttajaA2.uid || undefined);
    manager.addVarahenkiloFromEmail(kayttajaA4.email);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet.length).eql(4);
  });
});
