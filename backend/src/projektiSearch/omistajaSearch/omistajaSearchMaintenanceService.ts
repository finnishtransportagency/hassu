import { omistajaSearchService } from "./omistajaSearchService";
import omistajaSettings from "./omistaja-settings.json";
import omistajaMapping from "./omistaja-mapping.json";
import { log } from "../../logger";
import omistajaOpenSearchClient from "./omistajaOpenSearchClient";
import { DBOmistaja, omistajaDatabase, OmistajaKey } from "../../database/omistajaDatabase";

export type MaintenanceEvent = {
  action: "deleteIndex" | "index";
  startKey?: OmistajaKey;
  index?: number;
  size?: number;
  omistaja?: DBOmistaja;
};

export class OmistajaSearchMaintenanceService {
  async deleteIndex(): Promise<void> {
    log.info(await omistajaOpenSearchClient.deleteIndex());
    log.info(await omistajaOpenSearchClient.put("", "{}"));
    log.info(await omistajaOpenSearchClient.putSettings(JSON.stringify(omistajaSettings)));
    log.info(await omistajaOpenSearchClient.putMapping(JSON.stringify(omistajaMapping)));
  }

  async index(event: MaintenanceEvent): Promise<OmistajaKey | undefined> {
    const scanResult = await omistajaDatabase.scanOmistajat(event.startKey);
    for (const omistaja of scanResult.omistajat) {
      try {
        await omistajaSearchService.indexOmistaja(omistaja);
      } catch (e) {
        log.error(e);
      }
    }
    return scanResult.startKey;
  }
}
