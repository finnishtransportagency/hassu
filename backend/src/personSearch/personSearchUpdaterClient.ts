import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { Kayttaja } from "../../../common/graphql/apiModel";

class PersonSearchUpdaterClient {
  async readUsersFromSearchUpdaterLambda(): Promise<Kayttaja[]> {
    const json = await invokeLambda(config.personSearchUpdaterLambdaArn, true);
    if (!json) {
      throw new Error("Could not read list of users");
    }
    const users = JSON.parse(json);
    if (users.length <= 0) {
      throw new Error("Could not read list of users");
    }
    return users;
  }

  async triggerUpdate() {
    await invokeLambda(config.personSearchUpdaterLambdaArn, false);
  }
}

export const personSearchUpdaterClient = new PersonSearchUpdaterClient();
