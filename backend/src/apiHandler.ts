import { createSuunnitelma } from "./handler/createSuunnitelma";
import { CreateSuunnitelmaInput, UpdateSuunnitelmaInput } from "./api/API";
import { listSuunnitelmat } from "./handler/listSuunnitelmat";
import { getSuunnitelmaById } from "./handler/getSuunnitelmaById";
import { updateSuunnitelma } from "./handler/updateSuunnitelma";

type AppSyncEvent = {
  info: {
    fieldName: string;
  };
  arguments: {
    suunnitelma?: CreateSuunnitelmaInput | UpdateSuunnitelmaInput;
    suunnitelmaId?: string;
  };
};

export async function handleEvent(event: AppSyncEvent) {
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
