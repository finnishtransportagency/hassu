import * as userService from "../../src/service/userService";
import * as sinon from "sinon";
import { Kayttaja } from "../../src/api/apiModel";

export class UserFixture {
  public vaylaMatti: Kayttaja = {
    __typename: "Kayttaja",
    etuNimi: "Matti",
    sukuNimi: "Meikalainen",
    uid: "AB0000001",
    roolit: ["role1", "role2"],
    vaylaKayttaja: true,
  };

  public loginAs(vaylaUser: Kayttaja) {
    userService.mockUser(vaylaUser);
    sinon.stub(userService, "identifyUser").resolves();
  }

  public logout() {
    userService.mockUser(undefined);
  }
}
