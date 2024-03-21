import { muistuttajaSearchService } from "./muistuttajaSearchService";
import muistuttajaSettings from "./muistuttaja-settings.json";
import muistuttajaMapping from "./muistuttaja-mapping.json";
import { log } from "../../logger";
import muistuttajaOpenSearchClient from "./muistuttajaOpenSearchClient";
import { DBMuistuttaja, muistuttajaDatabase, MuistuttajaKey } from "../../database/muistuttajaDatabase";

export type MaintenanceEvent = {
  action: "deleteIndex" | "index";
  startKey?: MuistuttajaKey;
  index?: number;
  size?: number;
  muistuttaja?: DBMuistuttaja;
};

export class MuistuttajaSearchMaintenanceService {
  async deleteIndex(): Promise<void> {
    log.info(await muistuttajaOpenSearchClient.deleteIndex());
    log.info(await muistuttajaOpenSearchClient.put("", "{}"));
    log.info(await muistuttajaOpenSearchClient.putSettings(JSON.stringify(muistuttajaSettings)));
    log.info(await muistuttajaOpenSearchClient.putMapping(JSON.stringify(muistuttajaMapping)));
  }

  async index(event: MaintenanceEvent): Promise<MuistuttajaKey | undefined> {
    const scanResult = await muistuttajaDatabase.scanMuistuttajat(event.startKey);
    for (const muistuttaja of scanResult.muistuttajat) {
      try {
        await muistuttajaSearchService.indexMuistuttaja(muistuttaja);
      } catch (e) {
        log.error(e);
      }
    }
    return scanResult.startKey;
  }
}
