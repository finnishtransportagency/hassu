import { userService } from "../../src/user";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";

export function runAsVaylaUser() {
  sinon.stub(userService, "identifyUser").resolves();
  const user = UserFixture.mattiMeikalainen;
  userService.identifyMockUser(user);
  return user;
}

export function runAsAnonymous() {
  userService.identifyMockUser();
}
