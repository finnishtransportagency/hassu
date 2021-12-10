import * as sinon from "sinon";
import * as Sinon from "sinon";
import { NykyinenKayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";

export class UserFixture {
  private sinonStub: Sinon.SinonStub;
  private userService: any;

  constructor(userService: any) {
    this.userService = userService;
    this.sinonStub = sinon.stub(userService, "identifyUser");
    this.sinonStub.resolves();
  }

  public loginAs(vaylaUser: NykyinenKayttaja) {
    this.userService.identifyMockUser(vaylaUser);
  }

  public logout() {
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
