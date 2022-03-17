import { openSearchClient } from "./openSearchClient";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSearchService } from "./projektiSearchService";

export type MaintenanceEvent = {
  action: "deleteIndex" | "index";
  startKey?: string;
};

export class ProjektiSearchMaintenanceService {
  async deleteIndex() {
    return await openSearchClient.deleteIndex();
  }

  async index(event: MaintenanceEvent) {
    const scanResult = await projektiDatabase.scanProjektit(event.startKey);
    for (const projekti of scanResult.projektis) {
      await projektiSearchService.indexProjekti(projekti);
    }
    return scanResult.startKey;
  }
}
