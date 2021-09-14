import { VaylaUser } from "../../src/service/userService";

export class UserFixture {
  public vaylaMatti: VaylaUser = {
    firstName: "Matti",
    lastName: "Meikalainen",
    uid: "AB0000001",
    roles: ["role1", "role2"],
  };
}
