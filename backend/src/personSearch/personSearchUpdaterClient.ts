import { invokeLambda } from "../aws/lambda";
import { config } from "../config";
import { log } from "../logger";
import { Person } from "./kayttajas";

class PersonSearchUpdaterClient {
  async readUsersFromSearchUpdaterLambda(): Promise<Record<string, Person>> {
    log.info("readUsersFromSearchUpdaterLambda()");
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
    const users: Record<string, Person> = JSON.parse(json);
    if (Object.keys(users).length <= 0) {
      throw new Error("Could not read list of users (no users)");
    }
    return users;
  }

  async triggerUpdate(): Promise<void> {
    log.info("triggerUpdate() ");
    if (config.personSearchUpdaterLambdaArn) {
      try {
        await invokeLambda(config.personSearchUpdaterLambdaArn, false);
        log.info("personSearchUpdaterLambda invoked");
      } catch (e) {
        log.error(e);
      }
    }
  }
}

export const personSearchUpdaterClient = new PersonSearchUpdaterClient();
