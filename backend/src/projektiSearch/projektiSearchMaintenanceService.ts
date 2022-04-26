import { openSearchClient } from "./openSearchClient";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSearchService } from "./projektiSearchService";
import projektiSettings from "./projekti-settings.json";
import projektiMapping from "./projekti-mapping.json";
import { log } from "../logger";

export type MaintenanceEvent = {
  action: "deleteIndex" | "index";
  startKey?: string;
};

export class ProjektiSearchMaintenanceService {
  async deleteIndex(): Promise<void> {
    log.info(await openSearchClient.deleteIndex());
    log.info(await openSearchClient.put("projekti", "", "{}"));
    log.info(await openSearchClient.putSettings("projekti", JSON.stringify(projektiSettings)));
    log.info(await openSearchClient.putMapping("projekti", JSON.stringify(projektiMapping)));
  }

  async index(event: MaintenanceEvent): Promise<string> {
    const scanResult = await projektiDatabase.scanProjektit(event.startKey);
    for (const projekti of scanResult.projektis) {
      const response = await projektiSearchService.indexProjekti(projekti);
      if (response["result"] !== "created") {
        log.warn(response);
      }
    }
    return scanResult.startKey;
  }
}
