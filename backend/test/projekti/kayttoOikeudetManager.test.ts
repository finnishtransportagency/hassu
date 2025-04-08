import { describe, it } from "mocha";
import { KayttoOikeudetManager } from "../../src/projekti/kayttoOikeudetManager";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { ELY, KayttajaTyyppi, ProjektiKayttajaInput } from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";

import { expect } from "chai";

describe("KayttoOikeudetManager", () => {
  let kayttajas: Kayttajas;

  const personSearchFixture: PersonSearchFixture = new PersonSearchFixture();
  const vaylaKayttajaA1 = personSearchFixture.createKayttaja("A1");
  const elyKayttajaA2 = personSearchFixture.createKayttaja("A2", "ELY");
  const vaylaKayttajaA3 = personSearchFixture.createKayttaja("A3");
  const elyKayttajaA4 = personSearchFixture.createKayttaja("A4", "ELY");
  const konsulttiKayttajaLX5 = personSearchFixture.createKayttaja("LX5", "ramboll");

  let users: DBVaylaUser[];

  beforeEach(() => {
    kayttajas = Kayttajas.fromKayttajaList([vaylaKayttajaA1, elyKayttajaA2, vaylaKayttajaA3, elyKayttajaA4, konsulttiKayttajaLX5]);
    users = [
      {
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
        kayttajatunnus: vaylaKayttajaA1.uid as string,
        email: vaylaKayttajaA1.email as string,
        etunimi: vaylaKayttajaA1.etunimi as string,
        sukunimi: vaylaKayttajaA1.sukunimi as string,
        organisaatio: vaylaKayttajaA1.organisaatio as string,
        puhelinnumero: vaylaKayttajaA1.puhelinnumero as string,
        muokattavissa: false,
      },
      {
        tyyppi: KayttajaTyyppi.VARAHENKILO,
        kayttajatunnus: elyKayttajaA2.uid as string,
        email: elyKayttajaA2.email as string,
        etunimi: elyKayttajaA2.etunimi as string,
        sukunimi: elyKayttajaA2.sukunimi as string,
        organisaatio: elyKayttajaA2.organisaatio as string,
        puhelinnumero: elyKayttajaA2.puhelinnumero as string,
        muokattavissa: false,
      },
      {
        tyyppi: null,
        kayttajatunnus: vaylaKayttajaA3.uid as string,
        email: vaylaKayttajaA3.email as string,
        etunimi: vaylaKayttajaA3.etunimi as string,
        sukunimi: vaylaKayttajaA3.sukunimi as string,
        organisaatio: vaylaKayttajaA3.organisaatio as string,
        puhelinnumero: vaylaKayttajaA3.puhelinnumero as string,
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
    manager.addProjektiPaallikkoFromEmail(vaylaKayttajaA1.email);
    expectProjektiPaallikko(manager, "A1");

    // Lisää varahenkilö Velhosta
    manager.addVarahenkiloFromEmail(elyKayttajaA2.email);
    expectProjektiPaallikko(manager, "A1");
    expectVarahenkilo(manager, "A2", false);

    // Lisää nykyinen käyttäjä varahenkilöksi
    manager.addUser({ kayttajatunnus: vaylaKayttajaA3.uid!, muokattavissa: true, tyyppi: KayttajaTyyppi.VARAHENKILO });
    expectProjektiPaallikko(manager, "A1");
    expectVarahenkilo(manager, "A2", false);
    expectVarahenkilo(manager, "A3", true);

    // Lisää varahenkilo velhosta, jolla ei ole A- tai L-tunnusta
    manager.addVarahenkiloFromEmail(konsulttiKayttajaLX5.email);
    expectKayttaja(manager, "LX5", { tyyppi: null, muokattavissa: false });

    // Muokkaa sisältöä ja lisää käyttäjä käyttöliittymältä tulevan pyynnön perusteella
    expect(manager.getKayttoOikeudet()).toMatchSnapshot();
    manager.applyChanges([
      {
        kayttajatunnus: vaylaKayttajaA1.uid!,
        puhelinnumero: vaylaKayttajaA1.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA2.uid!,
        puhelinnumero: elyKayttajaA2.puhelinnumero!,
      },
      {
        kayttajatunnus: vaylaKayttajaA3.uid!,
        puhelinnumero: vaylaKayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA4.uid!,
        puhelinnumero: elyKayttajaA4.puhelinnumero!,
        yleinenYhteystieto: true,
      },
    ]);

    expectKayttaja(manager, "A1", { puhelinnumero: vaylaKayttajaA1.puhelinnumero! });
    expectKayttaja(manager, "A2", { puhelinnumero: elyKayttajaA2.puhelinnumero! });
    expectKayttaja(manager, "A3", { puhelinnumero: vaylaKayttajaA3.puhelinnumero! });
    expectKayttaja(manager, "A4", { puhelinnumero: elyKayttajaA4.puhelinnumero! });
    expect(manager.getKayttoOikeudet()).to.have.length(5);
    expect(manager.getKayttoOikeudet()).toMatchSnapshot();

    // Vaihda käyttäjäA4 varahenkilöksi
    manager.applyChanges([
      {
        kayttajatunnus: vaylaKayttajaA1.uid!,
        puhelinnumero: vaylaKayttajaA1.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA2.uid!,
        puhelinnumero: elyKayttajaA2.puhelinnumero!,
      },
      {
        kayttajatunnus: vaylaKayttajaA3.uid!,
        puhelinnumero: vaylaKayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA4.uid!,
        puhelinnumero: elyKayttajaA4.puhelinnumero!,
        tyyppi: KayttajaTyyppi.VARAHENKILO,
      },
    ]);

    expectKayttaja(manager, "A4", { tyyppi: KayttajaTyyppi.VARAHENKILO });

    // Tarkista, ettei tyyppiä voi vaihtaa projektipäälliköksi
    const kayttoOikeudetbefore = manager.getKayttoOikeudet();
    // Yritä vaihtaa käyttäjäA4 projektipäälliköksi
    manager.applyChanges([
      {
        kayttajatunnus: vaylaKayttajaA1.uid!,
        puhelinnumero: vaylaKayttajaA1.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA2.uid!,
        puhelinnumero: elyKayttajaA2.puhelinnumero!,
      },
      {
        kayttajatunnus: vaylaKayttajaA3.uid!,
        puhelinnumero: vaylaKayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA4.uid!,
        puhelinnumero: elyKayttajaA4.puhelinnumero!,
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
        kayttajatunnus: vaylaKayttajaA3.uid!,
        puhelinnumero: vaylaKayttajaA3.puhelinnumero!,
      },
      {
        kayttajatunnus: elyKayttajaA4.uid!,
        puhelinnumero: elyKayttajaA4.puhelinnumero!,
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      },
    ]);
    // Tarkista, ettei mitään muuttunut
    expect(manager.getKayttoOikeudet()).to.eql(kayttoOikeudetbefore);
  });

  it("should promote existing user to projektipäällikkö successfully", async () => {
    const manager = new KayttoOikeudetManager([], kayttajas);

    // Lisää nykyinen käyttäjä
    manager.addUser({ kayttajatunnus: vaylaKayttajaA3.uid!, muokattavissa: true });
    // Lisää sama käyttäjä Velhosta projektipäälliköksi
    manager.addProjektiPaallikkoFromEmail(vaylaKayttajaA3.email);

    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet).to.have.length(1);
    const resultUser = kayttoOikeudet[0];
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
    manager.addUser({ kayttajatunnus: vaylaKayttajaA3.uid!, muokattavissa: true });
    // Lisää sama käyttäjä Velhosta varahenkilöksi
    manager.addVarahenkiloFromEmail(vaylaKayttajaA3.email);

    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet).to.have.length(1, JSON.stringify(kayttoOikeudet, null, 2));
    const resultUser = kayttoOikeudet[0];
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
    const manager = new KayttoOikeudetManager(users, kayttajas, vaylaKayttajaA3.uid || undefined);
    manager.applyChanges([
      {
        kayttajatunnus: vaylaKayttajaA1.uid as string,
        puhelinnumero: vaylaKayttajaA1.puhelinnumero as string,
      },
      {
        kayttajatunnus: elyKayttajaA2.uid as string,
        puhelinnumero: elyKayttajaA2.puhelinnumero as string,
      },
    ]);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet.length).eql(3);
  });

  it("should not allow kunnanEdustaja to be removed when doing addProjektiPaallikkoFromEmail", async () => {
    const manager = new KayttoOikeudetManager(users, kayttajas, vaylaKayttajaA1.uid || undefined);
    manager.addProjektiPaallikkoFromEmail(elyKayttajaA4.email);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet.length).eql(4);
  });

  it("should not allow kunnanEdustaja to be removed when doing addVarahenkiloFromEmail", async () => {
    const manager = new KayttoOikeudetManager(users, kayttajas, elyKayttajaA2.uid || undefined);
    manager.addVarahenkiloFromEmail(elyKayttajaA4.email);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    expect(kayttoOikeudet.length).eql(4);
  });

  it("should modify elyOrganisaatio only for users in organisation 'ELY'", async () => {
    const manager = new KayttoOikeudetManager(users, kayttajas);
    const muutoksetElyorganisaatioilla: ProjektiKayttajaInput[] = [
      { kayttajatunnus: vaylaKayttajaA1.uid!, puhelinnumero: vaylaKayttajaA1.puhelinnumero!, elyOrganisaatio: ELY.HAME_ELY },
      { kayttajatunnus: elyKayttajaA2.uid!, puhelinnumero: elyKayttajaA2.puhelinnumero!, elyOrganisaatio: ELY.HAME_ELY },
      { kayttajatunnus: vaylaKayttajaA3.uid!, puhelinnumero: vaylaKayttajaA3.puhelinnumero!, elyOrganisaatio: ELY.HAME_ELY },
      { kayttajatunnus: elyKayttajaA4.uid!, puhelinnumero: elyKayttajaA4.puhelinnumero!, elyOrganisaatio: ELY.HAME_ELY },
    ];
    manager.applyChanges(muutoksetElyorganisaatioilla);
    const kayttoOikeudet = manager.getKayttoOikeudet();
    kayttoOikeudet.forEach((kayttaja) => {
      if (organisaatioIsEly(kayttaja.organisaatio)) {
        expect(kayttaja.elyOrganisaatio).eql(ELY.HAME_ELY);
      } else {
        expect(kayttaja.elyOrganisaatio).eql(undefined);
      }
    });
  });
});
