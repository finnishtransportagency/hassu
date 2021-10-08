import * as userService from "../../src/service/userService";
import { UserFixture } from "../../test/fixture/userFixture";
import * as sinon from "sinon";

const userFixture = new UserFixture();

export function runAsVaylaUser() {
  sinon.stub(userService, "identifyUser").resolves();
  userService.identifyMockUser(userFixture.vaylaMatti);
}

export function runAsAnonymous() {
  userService.identifyMockUser();
}
