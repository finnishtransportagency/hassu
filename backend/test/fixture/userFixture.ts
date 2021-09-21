import * as userService from "../../src/service/userService";
import * as sinon from "sinon";

export class UserFixture {
  public vaylaMatti: userService.VaylaUser = {
    firstName: "Matti",
    lastName: "Meikalainen",
    uid: "AB0000001",
    roles: ["role1", "role2"],
  };

  public loginAs(vaylaUser: userService.VaylaUser) {
    userService.mockUser(vaylaUser);
    sinon.stub(userService, "identifyUser").resolves();
  }

  public logout() {
    userService.mockUser(undefined);
  }
}
