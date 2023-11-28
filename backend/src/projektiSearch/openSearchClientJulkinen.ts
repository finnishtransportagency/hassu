import { Kieli } from "hassu-common/graphql/apiModel";
import OpenSearchClient from "./openSearchClient";
import { openSearchConfig } from "./openSearchConfig";

class OpenSearchClientJulkinen extends OpenSearchClient {
  constructor(kieli: Kieli) {
    super(openSearchConfig.opensearchJulkinenIndexPrefix + kieli.toLowerCase());
  }
}

export const openSearchClientJulkinen = {
  [Kieli.SUOMI]: new OpenSearchClientJulkinen(Kieli.SUOMI),
  [Kieli.RUOTSI]: new OpenSearchClientJulkinen(Kieli.RUOTSI),
};
