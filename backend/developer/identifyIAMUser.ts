import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { userService } from "../src/user";
import { createSignedCookies } from "../src/user/signedCookie";

const identifyIAMUser: userService.IdentifyUserFunc = async (event: AppSyncResolverEvent<any>) => {
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
