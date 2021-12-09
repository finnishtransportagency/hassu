import { AppSyncIdentityIAM, AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import log from "loglevel";
import { userService } from "../src/user";
import { createSignedCookies } from "../src/user/signedCookie";

const identifyIAMUser: userService.IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
  const identity: AppSyncIdentityIAM = event.identity as AppSyncIdentityIAM;
  log.info(JSON.stringify(identity, null, 2));
  const devUserUid = event.request?.headers?.["x-hassudev-uid"];
  if (devUserUid) {
    const devUserRoles = event.request?.headers?.["x-hassudev-roles"];
    return {
      __typename: "NykyinenKayttaja",
      etuNimi: devUserUid,
      sukuNimi: devUserUid,
      uid: devUserUid,
      roolit: devUserRoles?.split(","),
      keksit: await createSignedCookies(),
    };
  }
};

userService.installIdentifyUserFunction(identifyIAMUser);
