import { createSuunnitelma } from "./handler/createSuunnitelma";
import { CreateSuunnitelmaInput, UpdateSuunnitelmaInput } from "./api/API";
import { listSuunnitelmat } from "./handler/listSuunnitelmat";
import { getSuunnitelmaById } from "./handler/getSuunnitelmaById";
import { updateSuunnitelma } from "./handler/updateSuunnitelma";
import { AppSyncResolverEvent } from "aws-lambda/trigger/appsync-resolver";

type AppSyncEventArguments = {
  suunnitelma?: CreateSuunnitelmaInput | UpdateSuunnitelmaInput;
  suunnitelmaId?: string;
};

export async function handleEvent(event: AppSyncResolverEvent<AppSyncEventArguments>) {
  // tslint:disable-next-line:no-console
  console.log(JSON.stringify(event));
  switch (event.info.fieldName) {
    case "createSuunnitelma":
      return await createSuunnitelma(event.arguments.suunnitelma as CreateSuunnitelmaInput);
    case "listSuunnitelmat":
      return await listSuunnitelmat();
    case "getSuunnitelmaById":
      return await getSuunnitelmaById(event.arguments.suunnitelmaId);
    case "updateSuunnitelma":
      return await updateSuunnitelma(event.arguments.suunnitelma as UpdateSuunnitelmaInput);
    default:
      return null;
  }
}
