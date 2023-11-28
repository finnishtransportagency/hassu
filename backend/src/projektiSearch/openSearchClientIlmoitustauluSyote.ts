import { openSearchConfig } from "./openSearchConfig";
import OpenSearchClient from "./openSearchClient";

class OpenSearchClientIlmoitustauluSyote extends OpenSearchClient {
  constructor() {
    super(openSearchConfig.opensearchIlmoitustauluSyoteIndex);
  }
}

export const openSearchClientIlmoitustauluSyote = new OpenSearchClientIlmoitustauluSyote();
