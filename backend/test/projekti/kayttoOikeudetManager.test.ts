import { describe, it } from "mocha";
import { KayttoOikeudetManager } from "../../src/projekti/kayttoOikeudetManager";
import { PersonSearchFixture } from "../personSearch/lambda/personSearchFixture";
import { Kayttajas } from "../../src/personSearch/kayttajas";
import { ELY, Kayttaja, KayttajaTyyppi, ProjektiKayttajaInput } from "hassu-common/graphql/apiModel";
import { DBVaylaUser } from "../../src/database/model";
import { organisaatioIsEly } from "hassu-common/util/organisaatioIsEly";

import { expect } from "chai";

describe("KayttoOikeudetManager", () => {
  function expectKayttaja(manager: KayttoOikeudetManager, uid: string, data: Partial<DBVaylaUser>) {
    const henkilo = manager
      .getKayttoOikeudet()
      .filter((user) => user.kayttajatunnus == uid)
      .pop();
    expect(henkilo, "henkilöä ei löydy: " + [uid, JSON.stringify(manager.getKayttoOikeudet())].join(", ")).to.exist;
    expect(henkilo).to.include(data);
  }

  describe("manages users correcly", () => {
    const personSearchFixture: PersonSearchFixture = new PersonSearchFixture();
    const vaylaKayttajaA1 = personSearchFixture.createKayttaja("A1");
    const elyKayttajaA2 = personSearchFixture.createKayttaja("A2", "ELY");
    const vaylaKayttajaA3 = personSearchFixture.createKayttaja("A3");
    const elyKayttajaA4 = personSearchFixture.createKayttaja("A4", "ELY");
    const konsulttiKayttajaLX5 = personSearchFixture.createKayttaja("LX5", "ramboll");

    let kayttajas: Kayttajas;
    let users: DBVaylaUser[];

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
      expect(varahenkilo, "varahenkilöä ei löydy: " + [uid, muokattavissa, JSON.stringify(manager.getKayttoOikeudet())].join(", ")).to
        .exist;
      expect(varahenkilo!.muokattavissa).to.eq(muokattavissa);
    }

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

    it("should handle adds and edits", async () => {
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

  describe("should handle changes in user management correctly", () => {
    const tessaId = "A1";
    const karriId = "A2";
    const maurimaunoId = "A3";

    const tessaKayttaja: Kayttaja = {
      __typename: "Kayttaja",
      etunimi: "Tessa",
      sukunimi: "Testilä",
      organisaatio: "Elinvoimakeskus",
      email: "tessa.testila@elinvoimakeskus.fi",
      puhelinnumero: "029123123123",
      uid: tessaId,
    };
    const karriKayttaja: Kayttaja = {
      __typename: "Kayttaja",
      etunimi: "Karri",
      sukunimi: "Koestus",
      organisaatio: "Elinvoimakeskus",
      email: "karri.koestus@elinvoimakeskus.fi",
      puhelinnumero: "029234234234",
      uid: karriId,
    };
    const mauriMaunoKayttaja: Kayttaja = {
      __typename: "Kayttaja",
      etunimi: "Mauri",
      sukunimi: "Mallikas",
      organisaatio: "Elinvoimakeskus",
      email: "mauri.mallikas@elinvoimakeskus.fi",
      puhelinnumero: "029555444333",
      uid: maurimaunoId,
    };

    const tessaDB: DBVaylaUser = {
      tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
      kayttajatunnus: tessaId,
      email: "tessa.testila@ely.fi",
      etunimi: "Tessa",
      sukunimi: "Testilä",
      organisaatio: "ELY",
      puhelinnumero: "029987987987",
      muokattavissa: false,
    };
    const karriDB: DBVaylaUser = {
      tyyppi: KayttajaTyyppi.VARAHENKILO,
      kayttajatunnus: karriId,
      email: "karri.koestus@ely.fi",
      etunimi: "Karri",
      sukunimi: "Koestus",
      organisaatio: "ELY",
      puhelinnumero: "029876876876",
      muokattavissa: false,
    };
    const mauriMaunoDB: DBVaylaUser = {
      kayttajatunnus: maurimaunoId,
      email: "mauno.malli@ely.fi",
      etunimi: "Mauno",
      sukunimi: "Malli",
      organisaatio: "ELY",
      puhelinnumero: "029444555666",
      muokattavissa: true,
    };

    it("should update organization, email, firstname, and lastname from user management if there are changes", async () => {
      const manager = new KayttoOikeudetManager(
        [tessaDB, karriDB, mauriMaunoDB],
        Kayttajas.fromKayttajaList([tessaKayttaja, karriKayttaja, mauriMaunoKayttaja])
      );

      const expectUsersToBeCorrect = () => {
        expectKayttaja(manager, tessaId, {
          // Expect these to stay the same as in DB
          tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
          kayttajatunnus: tessaId,
          muokattavissa: false,
          puhelinnumero: tessaDB.puhelinnumero,

          // Expect these to change to the values from user management
          email: tessaKayttaja.email!,
          etunimi: tessaKayttaja.etunimi!,
          sukunimi: tessaKayttaja.sukunimi,
          organisaatio: tessaKayttaja.organisaatio!,
        });
        expectKayttaja(manager, karriId, {
          // Expect these to stay the same as in DB
          tyyppi: KayttajaTyyppi.VARAHENKILO,
          kayttajatunnus: karriId,
          muokattavissa: false,
          puhelinnumero: karriDB.puhelinnumero,

          // Expect these to change to the values from user management
          email: karriKayttaja.email!,
          etunimi: karriKayttaja.etunimi!,
          sukunimi: karriKayttaja.sukunimi,
          organisaatio: karriKayttaja.organisaatio!,
        });

        expectKayttaja(manager, maurimaunoId, {
          // Expect these to stay the same as in DB
          kayttajatunnus: maurimaunoId,
          muokattavissa: true,
          puhelinnumero: mauriMaunoDB.puhelinnumero,

          // Expect these to change to the values from user management
          email: mauriMaunoKayttaja.email!,
          etunimi: mauriMaunoKayttaja.etunimi!,
          sukunimi: mauriMaunoKayttaja.sukunimi,
          organisaatio: mauriMaunoKayttaja.organisaatio!,
        });
      };

      expectUsersToBeCorrect();

      // Updating user data from Velho should not change the result
      manager.updateUsersFromVelho(tessaKayttaja.email, karriKayttaja.email, false);

      expectUsersToBeCorrect();
    });

    it("should remove all current users except new PROJEKTIPAALLIKKO and VARAHENKILO if update is called with resetAll parameter", async () => {
      const manager = new KayttoOikeudetManager(
        [tessaDB, karriDB, mauriMaunoDB],
        Kayttajas.fromKayttajaList([tessaKayttaja, karriKayttaja, mauriMaunoKayttaja])
      );

      manager.updateUsersFromVelho(mauriMaunoKayttaja.email, tessaKayttaja.email, true);

      expect(manager.getKayttoOikeudet().length).to.eql(2);

      expectKayttaja(manager, maurimaunoId, {
        // Expect these to stay the same as in DB
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
        kayttajatunnus: maurimaunoId,
        muokattavissa: false,
        puhelinnumero: mauriMaunoDB.puhelinnumero,

        // Expect these to change to the values from user management
        email: mauriMaunoKayttaja.email!,
        etunimi: mauriMaunoKayttaja.etunimi!,
        sukunimi: mauriMaunoKayttaja.sukunimi,
        organisaatio: mauriMaunoKayttaja.organisaatio!,
      });

      expectKayttaja(manager, tessaId, {
        // Expect these to stay the same as in DB
        tyyppi: KayttajaTyyppi.VARAHENKILO,
        kayttajatunnus: tessaId,
        muokattavissa: false,
        puhelinnumero: tessaDB.puhelinnumero,

        // Expect these to change to the values from user management
        email: tessaKayttaja.email!,
        etunimi: tessaKayttaja.etunimi!,
        sukunimi: tessaKayttaja.sukunimi,
        organisaatio: tessaKayttaja.organisaatio!,
      });
    });

    it("should remove current PROJEKTIPAALLIKKO if another user replaces him/her as PROJEKTIPAALLIKKO", async () => {
      const manager = new KayttoOikeudetManager(
        [tessaDB, karriDB, mauriMaunoDB],
        Kayttajas.fromKayttajaList([tessaKayttaja, karriKayttaja, mauriMaunoKayttaja])
      );

      manager.updateUsersFromVelho(mauriMaunoKayttaja.email, karriKayttaja.email, false);

      expect(manager.getKayttoOikeudet().length).to.eql(2);

      expectKayttaja(manager, maurimaunoId, {
        // Expect these to stay the same as in DB
        tyyppi: KayttajaTyyppi.PROJEKTIPAALLIKKO,
        kayttajatunnus: maurimaunoId,
        muokattavissa: false,
        puhelinnumero: mauriMaunoDB.puhelinnumero,

        // Expect these to change to the values from user management
        email: mauriMaunoKayttaja.email!,
        etunimi: mauriMaunoKayttaja.etunimi!,
        sukunimi: mauriMaunoKayttaja.sukunimi,
        organisaatio: mauriMaunoKayttaja.organisaatio!,
      });

      expectKayttaja(manager, karriId, {
        // Expect these to stay the same as in DB
        tyyppi: KayttajaTyyppi.VARAHENKILO,
        kayttajatunnus: karriId,
        muokattavissa: false,
        puhelinnumero: karriDB.puhelinnumero,

        // Expect these to change to the values from user management
        email: karriKayttaja.email!,
        etunimi: karriKayttaja.etunimi!,
        sukunimi: karriKayttaja.sukunimi,
        organisaatio: karriKayttaja.organisaatio!,
      });
    });
  });
});
