import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { Person } from "./kayttajas";

class PersonSearchUpdaterClient {
  async readUsersFromSearchUpdaterLambda(): Promise<Record<string, Person>> {
    if (!config.personSearchUpdaterLambdaArn) {
      throw new Error("config.personSearchUpdaterLambdaArn määrittelemättä");
    }
    const json = await invokeLambda(config.personSearchUpdaterLambdaArn, true);
    if (!json) {
      throw new Error("Could not read list of users");
    }

    if (!json) {
      throw new Error("");
    }
    const users = JSON.parse(json);
    if (users.length <= 0) {
      throw new Error("Could not read list of users (no users)");
    }
    return users;
  }

  triggerUpdate() {
    if (config.personSearchUpdaterLambdaArn) {
      // Fire-and-forget type of call to just trigger the update
      // noinspection JSIgnoredPromiseFromCall
      invokeLambda(config.personSearchUpdaterLambdaArn, false);
    }
  }
}

export const personSearchUpdaterClient = new PersonSearchUpdaterClient();
