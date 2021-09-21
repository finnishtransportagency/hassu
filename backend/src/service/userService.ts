import { AppSyncResolverEventHeaders } from "aws-lambda/trigger/appsync-resolver";
import { validateJwtToken } from "../util/validatejwttoken";
import { config } from "../config";
import log from "loglevel";
import { IllegalAccessError } from "../error/IllegalAccessError";

let vaylaUser: VaylaUser;

export class VaylaUser {
  readonly roles: string[];
  readonly lastName: string;
  readonly firstName: string;
  readonly uid: string;

  constructor(jwt: any) {
    this.roles = VaylaUser.parseRoles(jwt["custom:rooli"]);
    this.lastName = jwt["custom:sukunimi"];
    this.firstName = jwt["custom:etunimi"];
    this.uid = jwt["custom:uid"];
  }

  private static parseRoles(roles: string) {
    return roles ? roles.split("\\,").map((arn) => arn.split("/").pop()) : undefined;
  }
}

async function identifyUser(headers: AppSyncResolverEventHeaders) {
  vaylaUser = undefined;
  if (headers) {
    const jwt = await validateJwtToken(headers["x-iam-accesstoken"], headers["x-iam-data"], config.cognitoURL);
    if (jwt) {
      vaylaUser = new VaylaUser(jwt);
    }
  }
  if (vaylaUser) {
    log.info("Current user:", vaylaUser);
  } else {
    log.info("Anonymous user");
  }
}

function mockUser(user: VaylaUser) {
  vaylaUser = user;
}

function getVaylaUser() {
  return vaylaUser;
}

function isVaylaUser() {
  return !!getVaylaUser();
}

function isSuomiFiUser() {
  return false;
}

function requireVaylaUser() {
  if (!isVaylaUser()) {
    throw new IllegalAccessError("Väylä-kirjautuminen puuttuu");
  }
}

export { identifyUser, isVaylaUser, isSuomiFiUser, getVaylaUser, requireVaylaUser, mockUser };
