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

  beforeEach(() => {
    kayttajas = Kayttajas.fromKayttajaList([kayttajaA1, kayttajaA2, kayttajaA3, kayttajaA4]);
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
});
