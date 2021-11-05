import * as sinon from "sinon";
import * as Sinon from "sinon";
import { Kayttaja } from "../../../common/graphql/apiModel";

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
}
