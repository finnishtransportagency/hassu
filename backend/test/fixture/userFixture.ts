import * as sinon from "sinon";
import * as Sinon from "sinon";
import { Kayttaja, VaylaKayttajaTyyppi } from "../../../common/graphql/apiModel";

export class UserFixture {
  private sinonStub: Sinon.SinonStub;
  private userService: any;

  constructor(userService: any) {
    this.userService = userService;
    this.sinonStub = sinon.stub(userService, "identifyUser");
    this.sinonStub.resolves();
  }

  public loginAs(vaylaUser: Kayttaja) {
    this.userService.identifyMockUser(vaylaUser);
  }

  public logout() {
    this.userService.identifyMockUser(undefined);
  }

  static pekkaProjari: Kayttaja = {
    __typename: "Kayttaja",
    etuNimi: "Pekka",
    sukuNimi: "Projari",
    uid: "A123",
    roolit: ["Atunnukset", "role2"],
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
  };

  static mattiMeikalainen: Kayttaja = {
    __typename: "Kayttaja",
    etuNimi: "Matti",
    sukuNimi: "Meikalainen",
    uid: "A000111",
    roolit: ["hassu_kayttaja", "Atunnukset"],
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.A_TUNNUS,
  };

  static manuMuokkaaja: Kayttaja = {
    __typename: "Kayttaja",
    etuNimi: "Manu",
    sukuNimi: "Muokkaaja",
    uid: "LX1",
    roolit: ["role1", "role2"],
    vaylaKayttajaTyyppi: VaylaKayttajaTyyppi.LX_TUNNUS,
  };
}
