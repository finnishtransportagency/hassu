import {
  openSearchClientIlmoitustauluSyote,
  openSearchClientJulkinen,
  openSearchClientYllapito,
} from "./openSearchClient";
import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSearchService } from "./projektiSearchService";
import projektiSettings from "./projekti-settings.json";
import projektiMapping from "./projekti-mapping.json";
import projektiJulkinenMapping from "./projekti-julkinen-mapping.json";
import { log } from "../logger";

export type MaintenanceEvent = {
  action: "deleteIndex" | "index";
  startKey?: string;
};

export class ProjektiSearchMaintenanceService {
  async deleteIndex(): Promise<void> {
    log.info(await openSearchClientYllapito.deleteIndex());
    log.info(await openSearchClientYllapito.put("", "{}"));
    log.info(await openSearchClientYllapito.putSettings(JSON.stringify(projektiSettings)));
    log.info(await openSearchClientYllapito.putMapping(JSON.stringify(projektiMapping)));

    for (const client of Object.values(openSearchClientJulkinen)) {
      log.info(await client.deleteIndex());
      log.info(await client.put("", "{}"));
      log.info(await client.putSettings(JSON.stringify(projektiSettings)));
      log.info(await client.putMapping(JSON.stringify(projektiJulkinenMapping)));
    }

    log.info(await openSearchClientIlmoitustauluSyote.deleteIndex());
  }

  async index(event: MaintenanceEvent): Promise<string> {
    const scanResult = await projektiDatabase.scanProjektit(event.startKey);
    for (const projekti of scanResult.projektis) {
      await projektiSearchService.indexProjekti(projekti);
    }
    return scanResult.startKey;
  }
}
