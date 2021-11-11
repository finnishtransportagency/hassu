import * as userService from "../../src/service/userService";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";

export function runAsVaylaUser() {
  sinon.stub(userService, "identifyUser").resolves();
  userService.identifyMockUser(UserFixture.mattiMeikalainen);
}

export function runAsAnonymous() {
  userService.identifyMockUser();
}
