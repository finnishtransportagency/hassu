import * as userService from "../../src/service/userService";
import * as sinon from "sinon";
import { vaylaMatti } from "../../test/fixture/users";

export function runAsVaylaUser() {
  sinon.stub(userService, "identifyUser").resolves();
  userService.identifyMockUser(vaylaMatti);
}

export function runAsAnonymous() {
  userService.identifyMockUser();
}
