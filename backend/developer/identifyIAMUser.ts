import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";
import { userService } from "../src/user";
import { createSignedCookies } from "../src/user/signedCookie";
import { NykyinenKayttaja } from "hassu-common/graphql/apiModel";

const identifyIAMUser: userService.IdentifyUserFunc = async (
  event: AppSyncResolverEvent<unknown>
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
