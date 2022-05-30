import { userService } from "../../src/user";
import * as sinon from "sinon";
import { UserFixture } from "../../test/fixture/userFixture";
import { NykyinenKayttaja } from "../../../common/graphql/apiModel";

export function runAsVaylaUser(): NykyinenKayttaja {
  sinon.stub(userService, "identifyUser").resolves();
  const user = UserFixture.mattiMeikalainen;
  userService.identifyMockUser(user);
  return user;
}

export function runAsAnonymous(): void {
  userService.identifyMockUser();
}
