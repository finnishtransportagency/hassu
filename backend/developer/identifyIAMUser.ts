import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { userService } from "../src/user";
import { createSignedCookies } from "../src/user/signedCookie";
import { AppSyncEventArguments } from "../src/apiHandler";
import { NykyinenKayttaja } from "../../common/graphql/apiModel";

const identifyIAMUser: userService.IdentifyUserFunc = async (
  event: AppSyncResolverEvent<AppSyncEventArguments>
): Promise<NykyinenKayttaja | undefined> => {
  const devUserUid = event.request?.headers?.["x-hassudev-uid"];
  if (devUserUid) {
    const devUserRoles = event.request?.headers?.["x-hassudev-roles"];
    return {
      __typename: "NykyinenKayttaja",
      etunimi: devUserUid,
      sukunimi: devUserUid,
      uid: devUserUid,
      roolit: devUserRoles?.split(","),
      keksit: await createSignedCookies(),
    };
  }
};

userService.installIdentifyUserFunction(identifyIAMUser);
