import * as userService from "../../src/service/userService";
import * as sinon from "sinon";
import { Kayttaja } from "../../../common/graphql/apiModel";

export class UserFixture {
  public loginAs(vaylaUser: Kayttaja) {
    userService.mockUser(vaylaUser);
    sinon.stub(userService, "identifyUser").resolves();
  }

  public logout() {
    userService.mockUser(undefined);
  }
}
