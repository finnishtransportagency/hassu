import { projektiDatabase } from "../database/projektiDatabase";
import { projektiSearchService } from "./projektiSearchService";
import projektiSettings from "./projekti-settings.json";
import projektiMapping from "./projekti-mapping.json";
import projektiJulkinenMapping from "./projekti-julkinen-mapping.json";
import { log } from "../logger";
import openSearchClientYllapito from "./openSearchClientYllapito";
import { openSearchClientJulkinen } from "./openSearchClientJulkinen";
import { openSearchClientIlmoitustauluSyote } from "./openSearchClientIlmoitustauluSyote";

export type MaintenanceEvent = {
  action: "deleteIndex" | "index";
  startKey?: string;
  oid?: string;
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

  async index(event: MaintenanceEvent): Promise<string | undefined> {
    const scanResult = await projektiDatabase.scanProjektit(event.startKey);
    for (const projekti of scanResult.projektis) {
      try {
        await projektiSearchService.indexProjekti(projekti);
      } catch (e) {
        log.error(e);
      }
    }
    return scanResult.startKey;
  }
}
