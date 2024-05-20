import sinon from "sinon";
import { NykyinenKayttaja, ProjektiKayttaja } from "hassu-common/graphql/apiModel";
import mocha from "mocha";

export class UserFixture {
  private sinonStub!: sinon.SinonStub;
  private userService: any;

  constructor(userService: any) {
    this.userService = userService;
    mocha.before(() => {
      this.sinonStub = sinon.stub(userService, "identifyUser");
    });
    mocha.beforeEach(() => {
      this.sinonStub.resolves();
    });
  }

  public loginAs(vaylaUser: NykyinenKayttaja): void {
    this.userService.identifyMockUser(vaylaUser);
  }

  loginAsProjektiKayttaja(projektiKayttaja: Pick<ProjektiKayttaja, "kayttajatunnus">): void {
    this.userService.identifyMockUser({
      __typename: "NykyinenKayttaja",
      uid: projektiKayttaja.kayttajatunnus,
      roolit: ["hassu_kayttaja", "Atunnukset"],
    });
  }

  loginAsAdmin(): void {
    this.userService.identifyMockUser({
      __typename: "NykyinenKayttaja",
      uid: "theadminuid",
      roolit: ["hassu_kayttaja", "hassu_admin"],
    });
  }

  public logout(): void {
    this.userService.identifyMockUser(undefined);
  }

  static pekkaProjari: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Pekka",
    sukunimi: "Projari",
    uid: "A123",
    roolit: ["Atunnukset", "role2"],
  };

  static mattiMeikalainen: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Matti",
    sukunimi: "Meikalainen",
    uid: "A000111",
    roolit: ["hassu_kayttaja", "Atunnukset"],
  };

  static projari112: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Pertti",
    sukunimi: "Projektipäällikkö",
    uid: "A000112",
    roolit: ["hassu_kayttaja"],
  };

  static hassuATunnus1: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "A-tunnus1",
    sukunimi: "Hassu",
    uid: "A000112",
    roolit: ["hassu_kayttaja"],
  };

  static manuMuokkaaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Manu",
    sukunimi: "Muokkaaja",
    uid: "LX1",
    roolit: ["role1", "role2"],
  };

  static testi1Kayttaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Testi1",
    sukunimi: "Hassu",
    uid: "LX581241",
    roolit: ["hassu_kayttaja"],
  };

  static hassuAdmin: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Admin",
    sukunimi: "Hassu",
    uid: "A123456",
    roolit: ["hassu_admin"],
  };

  static kunnanYhteysHenkiloProjektiKayttaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etunimi: "Kunta",
    sukunimi: "Kuntalainen",
    uid: "A000123",
    roolit: ["hassu_kayttaja"],
  };
}
