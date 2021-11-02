import { AppSyncIdentityIAM, AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { Context } from "aws-lambda";
import log from "loglevel";
import * as userService from "../src/service/userService";

const identifyIAMUser: userService.IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
  const identity: AppSyncIdentityIAM = event.identity as AppSyncIdentityIAM;
  log.info(JSON.stringify(identity, null, 2));
  const devUserUid = event.request?.headers?.["x-hassudev-uid"];
  if (devUserUid) {
    const devUserRoles = event.request?.headers?.["x-hassudev-roles"];
    return {
      __typename: "Kayttaja",
      etuNimi: devUserUid,
      sukuNimi: devUserUid,
      uid: devUserUid,
      roolit: devUserRoles?.split(","),
    };
  }
};

userService.installIdentifyUserFunction(identifyIAMUser);
