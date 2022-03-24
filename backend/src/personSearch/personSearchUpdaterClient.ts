import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { Person } from "./kayttajas";

class PersonSearchUpdaterClient {
  async readUsersFromSearchUpdaterLambda(): Promise<Record<string, Person>> {
    let json: string;
    if (config.personSearchUpdaterLambdaArn) {
      json = await invokeLambda(config.personSearchUpdaterLambdaArn, true);
    }
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
    if (config.personSearchUpdaterLambdaArn) {
      // Fire-and-forget type of call to just trigger the update
      // noinspection JSIgnoredPromiseFromCall
      invokeLambda(config.personSearchUpdaterLambdaArn, false);
    }
  }
}

export const personSearchUpdaterClient = new PersonSearchUpdaterClient();
