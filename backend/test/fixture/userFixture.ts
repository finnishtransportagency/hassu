import * as sinon from "sinon";
import { NykyinenKayttaja, ProjektiKayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";

export class UserFixture {
  private sinonStub: sinon.SinonStub;
  private userService: any;

  constructor(userService: any) {
    this.userService = userService;
    this.sinonStub = sinon.stub(userService, "identifyUser");
    this.sinonStub.resolves();
  }

  public loginAs(vaylaUser: NykyinenKayttaja): void {
    this.userService.identifyMockUser(vaylaUser);
  }

  loginAsProjektiKayttaja(projektiKayttaja: ProjektiKayttaja): void {
    this.userService.identifyMockUser({
      __typename: "NykyinenKayttaja",
      uid: projektiKayttaja.kayttajatunnus,
      roolit: ["hassu_kayttaja", "Atunnukset"],
      vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
    });
  }

  loginAsAdmin(): void {
    this.userService.identifyMockUser({
      __typename: "NykyinenKayttaja",
      uid: "theadminuid",
      roolit: ["hassu_kayttaja", "hassu_admin"],
      vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
    });
  }

  public logout(): void {
    this.userService.identifyMockUser(undefined);
  }

  static pekkaProjari: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etuNimi: "Pekka",
    sukuNimi: "Projari",
    uid: "A123",
    roolit: ["Atunnukset", "role2"],
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
  };

  static mattiMeikalainen: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etuNimi: "Matti",
    sukuNimi: "Meikalainen",
    uid: "A000111",
    roolit: ["hassu_kayttaja", "Atunnukset"],
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
  };

  static manuMuokkaaja: NykyinenKayttaja = {
    __typename: "NykyinenKayttaja",
    etuNimi: "Manu",
    sukuNimi: "Muokkaaja",
    uid: "LX1",
    roolit: ["role1", "role2"],
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.LX_TUNNUS,
  };
}
