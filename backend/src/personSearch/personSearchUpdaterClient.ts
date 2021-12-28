import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { Kayttaja } from "../../../common/graphql/apiModel";

class PersonSearchUpdaterClient {
  async readUsersFromSearchUpdaterLambda(): Promise<Record<string, Kayttaja>> {
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

  triggerUpdate() {
    // Fire-and-forget type of call to just trigger the update
    // noinspection JSIgnoredPromiseFromCall
    invokeLambda(config.personSearchUpdaterLambdaArn, false);
  }
}

export const personSearchUpdaterClient = new PersonSearchUpdaterClient();
