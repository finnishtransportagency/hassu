import { storeKansalaisUserAuthentication } from "@services/userService";

describe("UserService", () => {
  it("should store suomi.fi credentials to cookies", () => {
    const data = storeKansalaisUserAuthentication(
      "/#access_token=my_access_token&id_token=my_id_token&state=my_state&token_type=Bearer&expires_in=3600"
    );
    expect(data?.cookie).toMatch(/x-vls-access-token=my_access_token;expires=.*;path=\/;Secure;SameSite=Strict/);
  });
});
